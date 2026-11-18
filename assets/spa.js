import { supabase } from './supabase.js';
import { estado, avisar, atualizarUsuario } from './estado.js';
import { desenharCabecalho, desenharRodape } from './layout.js';
import { iniciarRotas } from './router.js';

import { telaInicio, telaServicos, telaSobre } from './views/publico.js';
import { telaLogin, telaCadastro, telaPerfil, telaRecuperar, telaNovaSenha } from './views/conta.js';
import { telaSolicitar, telaAgendar, telaHorarios, telaPedidos } from './views/pedidos.js';
import { telaAdmin } from './views/admin/index.js';

const rotas = {
  inicio: telaInicio,
  servicos: telaServicos,
  sobre: telaSobre,
  login: telaLogin,
  cadastro: telaCadastro,
  perfil: telaPerfil,
  recuperar: telaRecuperar,
  novasenha: telaNovaSenha,
  solicitar: telaSolicitar,
  agendar: telaAgendar,
  horarios: telaHorarios,
  pedidos: telaPedidos,
  admin: telaAdmin
};

// quando entra ou sai, atualiza o usuario e o cabecalho
supabase.auth.onAuthStateChange(evento => {
  if (evento !== 'SIGNED_IN' && evento !== 'SIGNED_OUT') return;
  setTimeout(async () => {
    await atualizarUsuario();
    desenharCabecalho(location.hash.replace(/^#/, '').split('?')[0]);
  }, 0);
});

// o link do email (confirmacao, recuperar senha) e o login com google voltam com dados no hash
async function tratarRetornoDoEmail() {
  const params = new URLSearchParams(location.hash.slice(1));
  await supabase.auth.getSession();
  await atualizarUsuario();
  const usuario = estado.usuario;

  if (params.get('error_description')) {
    avisar('O link do e-mail é inválido ou expirou. Entre ou cadastre-se novamente.', 'err');
    history.replaceState(null, '', '#login');
  } else if (params.get('type') === 'signup') {
    avisar('E-mail confirmado! Você já pode usar sua conta.');
    history.replaceState(null, '', usuario ? '#servicos' : '#login');
  } else if (params.get('type') === 'recovery') {
    if (usuario) avisar('Link confirmado. Escolha sua nova senha.');
    else avisar('O link expirou. Peça um novo.', 'err');
    history.replaceState(null, '', usuario ? '#novasenha' : '#recuperar');
  } else if (usuario) {
    avisar('Olá, ' + usuario.nome + '! Login feito com sucesso.');
    history.replaceState(null, '', usuario.perfil === 'admin' ? '#admin' : '#servicos');
  } else {
    history.replaceState(null, '', '#login');
  }
}

async function iniciar() {
  if (/access_token|error_description/.test(location.hash)) {
    await tratarRetornoDoEmail();
  } else {
    await atualizarUsuario();
  }
  desenharRodape();
  iniciarRotas(rotas);
}

desenharCabecalho();
desenharRodape();
iniciar();
