import { $, escapar } from '../../util.js';
import { supabase } from '../../supabase.js';
import { moldura } from './comum.js';

const NOMES_ACAO = {
  pedido_status: 'Status de pedido',
  perfil: 'Acesso / perfil',
  bloqueio_criado: 'Bloqueio criado',
  bloqueio_removido: 'Bloqueio removido',
  servico_criado: 'Serviço criado',
  servico_alterado: 'Serviço alterado'
};

// historico de acoes dos funcionarios (so o dono ve, e nao da pra editar pelo site)
export async function abaRegistro({ desenhar, aindaAtual }) {
  const { data, error } = await supabase
    .from('auditoria').select('*')
    .order('quando', { ascending: false })
    .limit(300);
  if (!aindaAtual()) return;

  const registros = data || [];

  function tabela(lista) {
    const linhas = lista.map(r => {
      const quando = new Date(r.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const detalhe = escapar(r.alvo || '') + (r.detalhe ? ' - ' + escapar(r.detalhe) : '');
      return `<tr>
        <td data-label="Quando">${escapar(quando)}</td>
        <td data-label="Quem">${escapar(r.ator_email)}</td>
        <td data-label="Ação">${escapar(NOMES_ACAO[r.acao] || r.acao)}</td>
        <td data-label="Detalhe">${detalhe}</td></tr>`;
    }).join('');
    return `<div class="scroll"><table class="tbl"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  desenhar(moldura('registro', `
    <p style="margin:0 0 14px">Últimas ações dos funcionários (até 300). O site não permite editar nem apagar este registro.</p>
    ${error ? '<p class="alert err">Não foi possível carregar o registro. Rode o SQL seguranca-admin.sql no Supabase.</p>' : ''}
    <div class="filtros"><div><label for="f-q">Filtrar</label><input id="f-q" type="text" placeholder="Pessoa, ação ou pedido"></div></div>
    <div id="lista"></div>`));

  function filtrar() {
    const busca = $('f-q').value.trim().toLowerCase();
    const resultado = registros.filter(r => {
      const texto = `${r.ator_email} ${NOMES_ACAO[r.acao] || r.acao} ${r.alvo} ${r.detalhe}`.toLowerCase();
      return !busca || texto.includes(busca);
    });
    $('lista').innerHTML = resultado.length
      ? tabela(resultado)
      : '<div class="vazio"><p>Nenhum registro.</p></div>';
  }

  $('f-q').addEventListener('input', filtrar);
  filtrar();
}
