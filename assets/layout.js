import { $, escapar, somenteNumeros } from './util.js';
import { supabase } from './supabase.js';
import { estado, avisar } from './estado.js';
import { ir } from './navegacao.js';
import { WHATSAPP_LAVANDERIA } from './negocio.js';

// qual item do menu fica marcado em cada rota
const MENU_ATIVO = {
  inicio: 'inicio', servicos: 'servicos', solicitar: 'servicos', agendar: 'servicos',
  horarios: 'servicos', sobre: 'sobre', perfil: 'perfil'
};

export function desenharCabecalho(rota = '') {
  const usuario = estado.usuario;
  const ativo = MENU_ATIVO[rota] || '';
  const link = (href, texto, chave) =>
    `<a href="${href}"${chave === ativo ? ' class="on"' : ''}>${texto}</a>`;

  const linkPerfil = usuario ? link('#perfil', 'Meu perfil', 'perfil') : '';
  let conta = '<a class="btn" href="#login">Entrar</a>';
  if (usuario) {
    const ehFuncionario = usuario.perfil === 'admin';
    conta = `<a class="btn" href="${ehFuncionario ? '#admin' : '#pedidos'}">${ehFuncionario ? 'Painel' : 'Meus pedidos'}</a>`
      + '<a class="sair" href="#" id="sair">Sair</a>';
  }

  $('hdr').innerHTML = `<div class="wrap bar">
    <a class="logo" href="#inicio"><img src="assets/img/logo.jpg" alt="">SpinLav</a>
    <button class="menu" id="menu" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span></button>
    <nav id="nv">
      ${link('#inicio', 'Início', 'inicio')}
      ${link('#servicos', 'Serviços', 'servicos')}
      ${link('#sobre', 'Sobre Nós', 'sobre')}
      ${linkPerfil}${conta}
    </nav></div>`;

  const botaoMenu = $('menu');
  const nav = $('nv');

  botaoMenu.addEventListener('click', () => {
    const aberto = nav.classList.toggle('open');
    botaoMenu.setAttribute('aria-expanded', aberto);
  });

  nav.addEventListener('click', ev => {
    if (ev.target.closest('a')) {
      nav.classList.remove('open');
      botaoMenu.setAttribute('aria-expanded', 'false');
    }
  });

  $('sair')?.addEventListener('click', async ev => {
    ev.preventDefault();
    await supabase.auth.signOut();
    estado.usuario = null;
    avisar('Você saiu da sua conta.');
    ir('#inicio');
  });
}

export function desenharRodape() {
  const whats = WHATSAPP_LAVANDERIA
    ? `<a href="https://wa.me/${somenteNumeros(WHATSAPP_LAVANDERIA)}" target="_blank" rel="noopener">WhatsApp</a>`
    : '';

  $('ftr').innerHTML = `<div class="wrap bar">
    <div><div class="logo">SpinLav</div><p>Cuidado e praticidade para uma rotina mais leve.</p></div>
    <nav><a href="#inicio">Início</a><a href="#servicos">Serviços</a><a href="#sobre">Sobre Nós</a>${whats}</nav></div>`;
}

export function mostrarMensagem() {
  const msg = estado.mensagem;
  estado.mensagem = null;
  $('flash').innerHTML = msg
    ? `<div class="wrap" style="padding-top:20px"><div class="alert ${escapar(msg[1])}">${escapar(msg[0])}</div></div>`
    : '';
}
