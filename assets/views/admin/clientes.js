import { $, escapar, formatarTelefone, linkWhatsapp, somenteNumeros } from '../../util.js';
import { supabase } from '../../supabase.js';
import { moldura } from './comum.js';

// consulta somente leitura: o funcionario nao altera cadastro de cliente
export async function abaClientes({ desenhar, aindaAtual }) {
  const { data, error } = await supabase.rpc('listar_clientes_func');
  if (!aindaAtual()) return;

  const clientes = (data || []).slice().sort((a, b) =>
    String(a.nome).localeCompare(String(b.nome), 'pt-BR')
  );

  function tabela(lista) {
    const linhas = lista.map(c => {
      const primeiroNome = String(c.nome || '').split(' ')[0];
      const link = linkWhatsapp(c.telefone, `Olá, ${primeiroNome}! Aqui é da SpinLav.`);
      const ehFuncionario = c.perfil === 'admin';

      return `<tr>
        <td data-label="Nome">${escapar(c.nome)}</td>
        <td data-label="E-mail">${escapar(c.email)}</td>
        <td data-label="Telefone">${c.telefone ? escapar(formatarTelefone(c.telefone)) : '-'}</td>
        <td data-label="Pedidos">${Number(c.total_pedidos) || 0}</td>
        <td data-label="Perfil"><span class="badge ${ehFuncionario ? 's-agendado' : 's-cancelado'}">${ehFuncionario ? 'Funcionário' : 'Cliente'}</span></td>
        <td>${link
          ? `<a class="btn zap mini" href="${escapar(link)}" target="_blank" rel="noopener">WhatsApp</a>`
          : '<small>sem telefone</small>'}</td></tr>`;
    }).join('');

    return `<div class="scroll"><table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Pedidos</th><th>Perfil</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  desenhar(moldura('clientes', `
    <p style="margin:0 0 14px">Clientes cadastrados. Esta tela é só de consulta: o funcionário vê os contatos e o total de pedidos, mas não altera cadastros nem perfis.</p>
    ${error ? '<p class="alert err">Não foi possível carregar os clientes. Rode o SQL funcionario-servicos-clientes.sql no Supabase.</p>' : ''}
    <div class="filtros"><div><label for="f-q">Buscar por nome, e-mail ou telefone</label><input id="f-q" type="text" placeholder="Digite para filtrar"></div></div>
    <p id="cont" style="margin:0 0 10px"></p><div id="lista"></div>`));

  function filtrar() {
    const busca = $('f-q').value.trim().toLowerCase();
    const buscaNumeros = somenteNumeros(busca);

    const resultado = clientes.filter(c => {
      if (!busca) return true;
      if (`${c.nome} ${c.email}`.toLowerCase().includes(busca)) return true;
      return buscaNumeros && somenteNumeros(c.telefone).includes(buscaNumeros);
    });

    $('cont').textContent = `${resultado.length} de ${clientes.length} cliente(s)`;
    $('lista').innerHTML = resultado.length
      ? tabela(resultado)
      : '<div class="vazio"><p>Nenhum cliente encontrado.</p></div>';
  }

  $('f-q').addEventListener('input', filtrar);
  filtrar();
}
