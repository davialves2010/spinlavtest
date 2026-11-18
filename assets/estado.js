import { supabase } from './supabase.js';

// usuario: { id, email, nome, perfil, dono } ou null se ninguem logou
// perfil 'admin' = funcionario da lavanderia. dono = funcionario + gestao da equipe
export const estado = {
  usuario: null,
  mensagem: null,
  servicos: null
};

// guarda uma mensagem pra aparecer na proxima tela
export function avisar(texto, tipo = 'ok') {
  estado.mensagem = [texto, tipo];
}

// busca os servicos uma vez so e guarda a promise
export function carregarServicos() {
  if (!estado.servicos) {
    estado.servicos = supabase
      .from('servicos').select('*').eq('ativo', true).order('id')
      .then(resposta => {
        if (resposta.error) estado.servicos = null;
        return resposta.data || [];
      });
  }
  return estado.servicos;
}

export function limparCacheServicos() {
  estado.servicos = null;
}

export async function atualizarUsuario() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    estado.usuario = null;
    return;
  }

  const { data: perfil } = await supabase
    .from('clientes').select('nome,perfil').eq('id', session.user.id).maybeSingle();

  estado.usuario = {
    id: session.user.id,
    email: session.user.email,
    nome: perfil?.nome || session.user.email,
    perfil: perfil?.perfil || 'cliente',
    dono: false
  };

  if (estado.usuario.perfil === 'admin') {
    const { data } = await supabase.rpc('sou_dono');
    estado.usuario.dono = data === true;
  }
}
