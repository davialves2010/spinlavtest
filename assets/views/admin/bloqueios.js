import { $, escapar, dataBR, hoje } from '../../util.js';
import { supabase } from '../../supabase.js';
import { avisar } from '../../estado.js';
import { recarregar } from '../../navegacao.js';
import { HORARIOS } from '../../disponibilidade.js';
import { moldura } from './comum.js';

// bloqueia dias ou horarios (feriado, folga). O cliente ve como indisponivel
export async function abaBloqueios({ desenhar, aindaAtual }) {
  const { data, error } = await supabase
    .from('bloqueios').select('*')
    .gte('data', hoje())
    .order('data').order('horario', { nullsFirst: true });
  if (!aindaAtual()) return;

  const bloqueios = data || [];
  const opcoesHora = HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('');

  const linhas = bloqueios.map(b => `<tr>
    <td data-label="Data">${dataBR(b.data)}</td>
    <td data-label="Horário">${b.horario ? String(b.horario).slice(0, 5) : 'Dia inteiro'}</td>
    <td data-label="Motivo">${escapar(b.motivo || '-')}</td>
    <td><button class="btn o mini" data-del="${b.id}">Remover</button></td></tr>`).join('');

  const tabela = bloqueios.length
    ? `<div class="scroll"><table class="tbl"><thead><tr><th>Data</th><th>Horário</th><th>Motivo</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`
    : '<div class="vazio"><p>Nenhum bloqueio futuro.</p></div>';

  desenhar(moldura('bloqueios', `
    <p style="margin:0 0 14px">Bloqueie feriados, folgas ou horários específicos. Os clientes verão esses horários como indisponíveis. Agendamentos que já existem não são cancelados sozinhos, avise os clientes.</p>
    ${error ? '<p class="alert err">Não foi possível carregar os bloqueios. Rode o SQL de administração no Supabase (admin-e-seguranca.sql).</p>' : ''}
    <p class="alert err" id="err" hidden></p>
    <form id="fb" class="filtros">
      <div><label for="b-dt">Data</label><input id="b-dt" type="date" min="${hoje()}" required></div>
      <div><label for="b-h">Horário</label><select id="b-h"><option value="">Dia inteiro</option>${opcoesHora}</select></div>
      <div><label for="b-m">Motivo (opcional)</label><input id="b-m" type="text" maxlength="80" placeholder="Feriado, folga..."></div>
      <div style="justify-content:flex-end"><button class="btn" type="submit" id="b-ok">Bloquear</button></div>
    </form>
    ${tabela}`));

  $('fb').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b-ok').disabled = true;
    $('err').hidden = true;

    const { error } = await supabase.from('bloqueios').insert({
      data: $('b-dt').value,
      horario: $('b-h').value || null,
      motivo: $('b-m').value.trim() || null
    });

    if (error) {
      $('err').textContent = /duplicate|unique/i.test(error.message)
        ? 'Esse bloqueio já existe.'
        : 'Não foi possível bloquear: ' + error.message;
      $('err').hidden = false;
      $('b-ok').disabled = false;
      return;
    }

    avisar('Bloqueio adicionado.');
    recarregar();
  });

  $('adm').addEventListener('click', async ev => {
    const botao = ev.target.closest('[data-del]');
    if (!botao) return;

    const { error } = await supabase.from('bloqueios').delete().eq('id', botao.dataset.del);
    avisar(error ? 'Não foi possível remover o bloqueio.' : 'Bloqueio removido.', error ? 'err' : 'ok');
    recarregar();
  });
}
