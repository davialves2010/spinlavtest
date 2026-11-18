import { $, escapar, numeroOuNulo } from '../../util.js';
import { supabase } from '../../supabase.js';
import { avisar } from '../../estado.js';
import { recarregar } from '../../navegacao.js';
import { moldura } from './comum.js';

// zonas de entrega: onde a lavanderia coleta e quanto cobra
export async function abaFrete({ desenhar, aindaAtual }) {
  const { data, error } = await supabase
    .from('zonas_frete').select('*')
    .order('uf').order('cidade').order('bairro', { nullsFirst: true });
  if (!aindaAtual()) return;

  const zonas = data || [];

  const linhas = zonas.map(z => `<tr>
    <td data-label="Cidade">${escapar(z.cidade)}/${escapar(z.uf)}</td>
    <td data-label="Bairro">${escapar(z.bairro || 'Cidade toda')}</td>
    <td data-label="Frete (R$)"><input id="v-${z.id}" type="number" min="0" step="0.01" value="${z.valor}" style="max-width:120px"></td>
    <td data-label="Grátis acima de"><input id="g-${z.id}" type="number" min="0.01" step="0.01" value="${z.frete_gratis_acima ?? ''}" placeholder="-" style="max-width:120px"></td>
    <td data-label="Ativo"><input id="a-${z.id}" type="checkbox" ${z.ativo ? 'checked' : ''} aria-label="Ativo"></td>
    <td><div class="acoes"><button class="btn mini" data-zsalvar="${z.id}">Salvar</button><button class="btn o mini" data-zdel="${z.id}">Remover</button></div></td></tr>`).join('');

  const tabela = zonas.length
    ? `<div class="scroll"><table class="tbl"><thead><tr><th>Cidade</th><th>Bairro</th><th>Frete (R$)</th><th>Grátis acima de</th><th>Ativo</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`
    : '<div class="vazio"><p>Nenhuma zona cadastrada. Sem zonas, a coleta em casa fica indisponível.</p></div>';

  desenhar(moldura('frete', `
    <p style="margin:0 0 14px">Cadastre onde você faz coleta e entrega e quanto cobra. O valor de um <strong>bairro</strong> vale mais que o da <strong>cidade</strong>. Valor 0 = frete grátis. "Grátis acima de" zera o frete quando o valor das peças chega nesse valor. Cidades que não estão na lista ficam sem coleta em casa.</p>
    ${error ? '<p class="alert err">Não foi possível carregar as zonas. Rode o SQL frete-admin-pagamento.sql no Supabase.</p>' : ''}
    <p class="alert err" id="err" hidden></p>
    <form id="fz" class="filtros">
      <div><label for="z-c">Cidade</label><input id="z-c" type="text" maxlength="80" required></div>
      <div><label for="z-u">UF</label><input id="z-u" type="text" maxlength="2" required style="text-transform:uppercase"></div>
      <div><label for="z-b">Bairro (opcional)</label><input id="z-b" type="text" maxlength="80"></div>
      <div><label for="z-v">Frete (R$)</label><input id="z-v" type="number" min="0" step="0.01" required></div>
      <div><label for="z-g">Grátis acima de (R$)</label><input id="z-g" type="number" min="0.01" step="0.01"></div>
      <div style="justify-content:flex-end"><button class="btn" type="submit" id="z-ok">Adicionar</button></div>
    </form>
    ${tabela}`));

  $('fz').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('z-ok').disabled = true;
    $('err').hidden = true;

    function falhar(texto) {
      $('err').textContent = texto;
      $('err').hidden = false;
      $('z-ok').disabled = false;
    }

    const uf = $('z-u').value.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) return falhar('A UF precisa ter 2 letras (ex.: SP).');

    const { error } = await supabase.from('zonas_frete').insert({
      cidade: $('z-c').value.trim(),
      uf,
      bairro: $('z-b').value.trim() || null,
      valor: numeroOuNulo($('z-v').value),
      frete_gratis_acima: numeroOuNulo($('z-g').value)
    });

    if (error) {
      return falhar(/duplicate|unique/i.test(error.message)
        ? 'Essa cidade/bairro já está cadastrada.'
        : 'Não foi possível adicionar: ' + error.message);
    }

    avisar('Zona de frete adicionada.');
    recarregar();
  });

  $('adm').addEventListener('click', async ev => {
    const salvar = ev.target.closest('[data-zsalvar]');
    const remover = ev.target.closest('[data-zdel]');

    if (salvar) {
      const id = salvar.dataset.zsalvar;
      salvar.disabled = true;
      const { error } = await supabase.from('zonas_frete').update({
        valor: numeroOuNulo($('v-' + id).value),
        frete_gratis_acima: numeroOuNulo($('g-' + id).value),
        ativo: $('a-' + id).checked
      }).eq('id', id);
      avisar(error ? 'Não foi possível salvar.' : 'Frete atualizado.', error ? 'err' : 'ok');
      recarregar();
    } else if (remover && confirm('Remover esta zona de frete?')) {
      const { error } = await supabase.from('zonas_frete').delete().eq('id', remover.dataset.zdel);
      avisar(error ? 'Não foi possível remover.' : 'Zona removida.', error ? 'err' : 'ok');
      recarregar();
    }
  });
}
