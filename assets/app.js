import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export const app = document.getElementById('app');
export const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dataBR = d => d.split('-').reverse().join('/');
export const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
export const STATUS = { pendente: 'Pendente', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };

const I = {
  wash: '<rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M8 6.5h.01"/>',
  dry: '<path d="M4 8h10a3 3 0 1 0-3-3M4 12h14a3 3 0 1 1-3 3M4 16h7"/>',
  iron: '<path d="M3 17h18c0-5-4-8-9-8H8a5 5 0 0 0-5 5z"/><path d="M3 20h18"/>',
  shirt: '<path d="M8 4 3 7l2 4 3-1v10h8V10l3 1 2-4-5-3a4 4 0 0 1-8 0z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="m9 12 2 2 4-4"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
};
export const card = (ic, t, d, href, label = 'Saiba mais') =>
  `<article class="card"><div class="ico"><svg viewBox="0 0 24 24">${I[ic] || I.wash}</svg></div><h3>${e(t)}</h3><p>${e(d)}</p>${href ? `<a class="btn sm" href="${e(href)}">${e(label)}</a>` : ''}</article>`;

export const flash = (msg, tipo = 'ok') => sessionStorage.setItem('flash', JSON.stringify([msg, tipo]));

export async function getUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return null;
  const { data: p } = await sb.from('profiles').select('nome,perfil').eq('id', session.user.id).maybeSingle();
  return { id: session.user.id, email: session.user.email, nome: p?.nome || session.user.email, perfil: p?.perfil || 'cliente' };
}

export async function layout(ativo = '') {
  const u = await getUser();
  const a = (href, txt, k) => `<a href="${href}"${k === ativo ? ' class="on"' : ''}>${txt}</a>`;
  const links = a('index.html', 'Início', 'inicio') + a('servicos.html', 'Serviços', 'servicos') + a('sobre.html', 'Sobre Nós', 'sobre');
  const conta = u
    ? `<a class="btn" href="${u.perfil === 'admin' ? 'admin.html' : 'meus-pedidos.html'}">${u.perfil === 'admin' ? 'Painel' : 'Meus pedidos'}</a><a class="sair" href="#" id="sair">Sair</a>`
    : '<a class="btn" href="login.html">Entrar</a>';
  document.getElementById('hdr').innerHTML = `<div class="wrap bar"><a class="logo" href="index.html"><img src="assets/img/logo.jpg" alt="">SpinLav</a><nav>${links}${conta}</nav></div>`;
  document.getElementById('ftr').innerHTML = `<div class="wrap bar"><div><div class="logo">SpinLav</div><p>Cuidado e praticidade para uma rotina mais leve.</p></div><nav>${links.replace(/ class="on"/g, '')}</nav></div>`;
  document.getElementById('sair')?.addEventListener('click', async ev => {
    ev.preventDefault(); await sb.auth.signOut(); flash('Você saiu da sua conta.'); location.href = 'index.html';
  });
  const f = JSON.parse(sessionStorage.getItem('flash') || 'null');
  if (f) { sessionStorage.removeItem('flash'); document.getElementById('flash').innerHTML = `<div class="wrap" style="padding-top:20px"><div class="alert ${e(f[1])}">${e(f[0])}</div></div>`; }
  return u;
}

// Exige login (e, opcionalmente, perfil admin). Redireciona se não houver permissão.
export function exigir(u, admin = false) {
  if (!u) { flash('Entre na sua conta para continuar.', 'err'); location.href = 'login.html'; throw new Error('login'); }
  if (admin && u.perfil !== 'admin') { flash('Acesso restrito à administração.', 'err'); location.href = 'index.html'; throw new Error('admin'); }
}
