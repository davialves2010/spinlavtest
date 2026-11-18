import { $, escapar, STATUS, COLUNAS_AGENDAMENTO } from '../../util.js';
import { supabase } from '../../supabase.js';
import { agendamentoDoPedido, totalTexto, quandoTexto } from '../comum.js';
import { moldura, seletorStatus, botaoWhatsapp, cliqueNosPedidos } from './comum.js';

export async function abaPedidos({ desenhar, aindaAtual }) {
  const { data, error } = await supabase
    .from('pedidos')
    .select(`*, servicos(nome), clientes(nome,email,telefone), agendamentos(${COLUNAS_AGENDAMENTO})`)
    .order('criado_em', { ascending: false });
  if (!aindaAtual()) return;

  const todos = data || [];

  function tabela(pedidos) {
    const linhas = pedidos.map(p => `<tr>
      <td data-label="Pedido">#${p.id}</td>
      <td data-label="Cliente">${escapar(p.clientes?.nome)}<br><small>${escapar(p.clientes?.email)}</small></td>
      <td data-label="Serviço">${escapar(p.servicos?.nome)}</td>
      <td data-label="Peças">${p.quantidade}</td>
      <td data-label="Agendamento">${quandoTexto(p, true, true)}</td>
      <td data-label="Valor">${totalTexto(p)}</td>
      <td data-label="Obs.">${escapar(p.observacoes || '-')}</td>
      <td data-label="Status"><div class="inline">${seletorStatus(p)}</div></td>
      <td>${botaoWhatsapp(p, agendamentoDoPedido(p))}</td></tr>`).join('');

    return `<div class="scroll"><table class="tbl"><thead><tr><th>Nº</th><th>Cliente</th><th>Serviço</th><th>Peças</th><th>Agendamento</th><th>Valor</th><th>Obs.</th><th>Status</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  const opcoesStatus = Object.entries(STATUS).map(([k, nome]) => `<option value="${k}">${nome}</option>`).join('');

  desenhar(moldura('pedidos', `
    ${error ? '<p class="alert err">Não foi possível carregar os pedidos.</p>' : ''}
    <div class="filtros">
      <div><label for="f-q">Buscar cliente ou nº</label><input id="f-q" type="text" placeholder="Nome, e-mail ou número"></div>
      <div><label for="f-st">Status</label><select id="f-st"><option value="">Todos</option>${opcoesStatus}</select></div>
      <div><label for="f-dt">Data do agendamento</label><input id="f-dt" type="date"></div>
    </div>
    <p id="cont" style="margin:0 0 10px"></p><div id="lista"></div>`));

  function filtrar() {
    const status = $('f-st').value;
    const data = $('f-dt').value;
    const busca = $('f-q').value.trim().toLowerCase();

    const resultado = todos.filter(p => {
      if (status && p.status !== status) return false;
      if (data && agendamentoDoPedido(p)?.data_agendada !== data) return false;
      if (busca) {
        const texto = `${p.clientes?.nome} ${p.clientes?.email} ${p.id}`.toLowerCase();
        if (!texto.includes(busca)) return false;
      }
      return true;
    });

    $('cont').textContent = `${resultado.length} de ${todos.length} pedido(s)`;
    $('lista').innerHTML = resultado.length
      ? tabela(resultado)
      : '<div class="vazio"><p>Nenhum pedido encontrado.</p></div>';
  }

  ['f-q', 'f-st', 'f-dt'].forEach(id => $(id).addEventListener('input', filtrar));
  $('adm').addEventListener('click', cliqueNosPedidos);
  filtrar();
}
