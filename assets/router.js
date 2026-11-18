import { $ } from './util.js';
import { estado, avisar } from './estado.js';
import { ir } from './navegacao.js';
import { desenharCabecalho, mostrarMensagem } from './layout.js';
import { aviso } from './views/comum.js';

let rotas = {};
let contador = 0; // cada navegacao incrementa, serve pra ignorar respostas antigas

export function iniciarRotas(tabela) {
  rotas = tabela;
  window.addEventListener('hashchange', abrirRota);
  abrirRota();
}

async function abrirRota() {
  const app = $('app');
  const [nome, query] = location.hash.replace(/^#/, '').split('?');
  const chave = rotas[nome] ? nome : 'inicio';

  const minhaVez = ++contador;
  const aindaAtual = () => minhaVez === contador;
  let desenhou = false;

  // se a tela demorar, mostra "carregando"
  const timer = setTimeout(() => {
    if (aindaAtual() && !desenhou) {
      app.innerHTML = '<div class="wrap page"><p class="note">Carregando...</p></div>';
    }
  }, 150);

  const desenhar = html => {
    if (!aindaAtual()) return false;
    desenhou = true;
    clearTimeout(timer);
    app.innerHTML = html;
    app.classList.remove('in');
    void app.offsetWidth; // forca o navegador a reiniciar a animacao
    app.classList.add('in');
    scrollTo(0, 0);
    return true;
  };

  const exigirLogin = (soFuncionario = false) => {
    if (!estado.usuario) {
      avisar('Entre na sua conta para continuar.', 'err');
      ir('#login');
      return false;
    }
    if (soFuncionario && estado.usuario.perfil !== 'admin') {
      avisar('Acesso restrito aos funcionários.', 'err');
      ir('#inicio');
      return false;
    }
    return true;
  };

  desenharCabecalho(chave);
  mostrarMensagem();

  try {
    await rotas[chave]({ desenhar, exigirLogin, aindaAtual, params: new URLSearchParams(query || '') });
  } catch (erro) {
    console.error(erro);
    desenhar(aviso('Algo deu errado ao carregar esta página.', '#inicio', 'Voltar ao início'));
  }

  clearTimeout(timer);
  document.title = 'SpinLav - lavanderia profissional';
}
