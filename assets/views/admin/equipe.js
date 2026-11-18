import { $, escapar } from '../../util.js';
import { supabase } from '../../supabase.js';
import { estado, avisar } from '../../estado.js';
import { recarregar } from '../../navegacao.js';
import { moldura } from './comum.js';

// so o dono ve esta aba: promove e remove funcionarios
export async function abaEquipe({ desenhar, aindaAtual }) {
  const { data, error } = await supabase.rpc('listar_clientes');
  if (!aindaAtual()) return;

  // dono primeiro, depois funcionarios, depois clientes
  const ordem = c => (c.dono ? 0 : c.perfil === 'admin' ? 1 : 2);
  const pessoas = (data || []).slice().sort((a, b) =>
    ordem(a) - ordem(b) || String(a.nome).localeCompare(String(b.nome), 'pt-BR')
  );

  function celulaPerfil(c) {
    if (c.dono) return '<span class="badge s-concluido">Dono</span>';
    if (c.perfil === 'admin') return '<span class="badge s-agendado">Funcionário</span>';
    return '<span class="badge s-cancelado">Cliente</span>';
  }

  function celulaAcao(c) {
    if (c.id === estado.usuario.id) return '<small>você</small>';
    if (c.dono) return '<small>dono</small>';
    if (c.perfil === 'admin') {
      return `<button class="btn o mini" data-perfil="${c.id}" data-novo="cliente" data-nome="${escapar(c.nome)}">Remover acesso</button>`;
    }
    return `<button class="btn mini" data-perfil="${c.id}" data-novo="admin" data-nome="${escapar(c.nome)}">Tornar funcionário</button>`;
  }

  function tabela(lista) {
    const linhas = lista.map(c => `<tr>
      <td data-label="Nome">${escapar(c.nome)}</td>
      <td data-label="E-mail">${escapar(c.email)}</td>
      <td data-label="Perfil">${celulaPerfil(c)}</td>
      <td>${celulaAcao(c)}</td></tr>`).join('');
    return `<div class="scroll"><table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`;
  }

  desenhar(moldura('equipe', `
    <p style="margin:0 0 14px">Só o dono vê esta aba. A pessoa precisa ter criado uma conta no site antes. Depois da mudança ela precisa sair e entrar de novo. Tudo fica no Registro.</p>
    ${error ? '<p class="alert err">Não foi possível carregar a lista. Rode o SQL seguranca-admin.sql no Supabase.</p>' : ''}
    <div class="filtros"><div><label for="f-q">Buscar por nome ou e-mail</label><input id="f-q" type="text" placeholder="Digite para filtrar"></div></div>
    <div id="lista"></div>`));

  function filtrar() {
    const busca = $('f-q').value.trim().toLowerCase();
    const resultado = pessoas.filter(c => !busca || `${c.nome} ${c.email}`.toLowerCase().includes(busca));
    $('lista').innerHTML = resultado.length
      ? tabela(resultado)
      : '<div class="vazio"><p>Nenhuma conta encontrada.</p></div>';
  }

  $('f-q').addEventListener('input', filtrar);
  filtrar();

  $('lista').addEventListener('click', async ev => {
    const botao = ev.target.closest('[data-perfil]');
    if (!botao) return;

    const virarFuncionario = botao.dataset.novo === 'admin';
    const pergunta = virarFuncionario
      ? `Dar acesso de funcionário para ${botao.dataset.nome}?`
      : `Remover o acesso de funcionário de ${botao.dataset.nome}?`;
    if (!confirm(pergunta)) return;

    botao.disabled = true;
    const { error } = await supabase.rpc('definir_perfil', {
      p_cliente: botao.dataset.perfil,
      p_perfil: botao.dataset.novo
    });

    if (error) {
      avisar('Não foi possível alterar o perfil: ' + error.message, 'err');
    } else {
      avisar(virarFuncionario ? 'Agora essa pessoa é funcionária.' : 'Acesso de funcionário removido.');
    }
    recarregar();
  });
}
