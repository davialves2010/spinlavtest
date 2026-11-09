import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

/* ============ base ============ */
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = id => document.getElementById(id);
const app = $('app');
const e = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = d => d.split('-').reverse().join('/');
const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const STATUS = { pendente: 'Pendente', agendado: 'Agendado', em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' };
const tempoFmt = m => { const h = Math.floor(m / 60), r = m % 60; return h ? `${h}h${r ? ' ' + r + 'min' : ''}` : `${r} min`; };
const calcTempo = (s, q) => s.tempo_base_min + q * s.tempo_peca_min;
const fmtCep = c => { const d = String(c || '').replace(/\D/g, '').slice(0, 8); return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d; };
const WHATSAPP_LAVANDERIA = '';   // WhatsApp da lavanderia com DDI+DDD, ex.: '5511999999999' (vazio = não mostra o link)
const soNum = s => String(s || '').replace(/\D/g, '');
const fmtTel = t => { const d = soNum(t).slice(0, 11); if (d.length <= 2) return d; if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`; if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
const waLink = (tel, msg) => { let d = soNum(tel); if (!d) return ''; if (d.length <= 11) d = '55' + d; return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`; };
const AG_COLS = 'data_agendada,horario,tipo,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf,forma_pagamento,frete';
const PAGTO = { pix: 'Pix', cartao: 'Cartão (maquininha)', dinheiro: 'Dinheiro' };
const PIX_CHAVE = '';   // chave Pix da lavanderia (vazio = não mostra no aviso de confirmação)
const endTxt = a => a?.logradouro ? `${a.logradouro}, ${a.numero}${a.complemento ? ' – ' + a.complemento : ''} – ${a.bairro}, ${a.cidade}/${a.uf}` : '';

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
const ICONES_SERVICO = { wash: 'Máquina de lavar', dry: 'Secagem', iron: 'Passadoria', shirt: 'Camisa' };
const card = (ic, t, d, href, label = 'Saiba mais') =>
  `<article class="card"><div class="ico"><svg viewBox="0 0 24 24">${I[ic] || I.wash}</svg></div><h3>${e(t)}</h3><p>${e(d)}</p>${href ? `<a class="btn sm" href="${e(href)}">${e(label)}</a>` : ''}</article>`;
const stepper = n => `<ol class="steps">${['Cadastro', 'Pedido', 'Agendamento', 'Confirmação'].map((t, i) => `<li class="${i + 1 < n ? 'done' : i + 1 === n ? 'on' : ''}"><b>${i + 1 < n ? '✓' : i + 1}</b>${t}</li>`).join('')}</ol>`;

/* ============ estado (carregado uma vez, sem recarregar a página) ============ */
// Perfis: 'cliente' (usa o site), 'admin' (= FUNCIONÁRIO da lavanderia) e dono (funcionário + gestão da equipe).
let user = null, pendingFlash = null, servicosP = null;
const flash = (m, t = 'ok') => { pendingFlash = [m, t]; };
const go = h => { if (location.hash === h) route(); else location.hash = h; };
const getServicos = () => servicosP ??= sb.from('servicos').select('*').eq('ativo', true).order('id')
  .then(r => { if (r.error) servicosP = null; return r.data || []; });

async function refreshUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { user = null; return; }
  const { data: p } = await sb.from('clientes').select('nome,perfil').eq('id', session.user.id).maybeSingle();
  user = { id: session.user.id, email: session.user.email, nome: p?.nome || session.user.email, perfil: p?.perfil || 'cliente', dono: false };
  if (user.perfil === 'admin') { const { data: d } = await sb.rpc('sou_dono'); user.dono = d === true; }
}

/* ============ horários (DFD 4.0 Consultar Disponibilidade) ============ */
const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
async function horarios(d) {
  const dow = new Date(d + 'T12:00:00').getDay();
  if (dow === 0) return { fechado: true, lista: [] };
  const base = dow === 6 ? HORARIOS.filter(h => h <= '12:00') : HORARIOS;
  const { data, error } = await sb.rpc('horarios_lotados', { d });
  const lotado = new Set((data || []).map(r => String(r.horario).slice(0, 5)));
  const agora = new Date().toTimeString().slice(0, 5);
  return { fechado: false, erro: !!error, lista: base.map(h => ({ h, livre: !lotado.has(h) && !(d === hoje() && h <= agora) })) };
}
const slotsHtml = l => `<div class="slots">${l.map(s => `<button type="button" class="slot" data-h="${s.h}" ${s.livre ? '' : 'disabled'}>${s.h}<small>${s.livre ? 'Disponível' : 'Indisponível'}</small></button>`).join('')}</div>`;

/* ============ cabeçalho e rodapé (desenhados uma vez, só atualizam) ============ */
const NAVKEY = { inicio: 'inicio', servicos: 'servicos', solicitar: 'servicos', agendar: 'servicos', horarios: 'servicos', sobre: 'sobre' };
function renderHeader(key = '') {
  const ativo = NAVKEY[key] || '';
  const a = (h, t, k) => `<a href="${h}"${k === ativo ? ' class="on"' : ''}>${t}</a>`;
  const conta = user
    ? `<a class="btn" href="${user.perfil === 'admin' ? '#admin' : '#pedidos'}">${user.perfil === 'admin' ? 'Painel' : 'Meus pedidos'}</a><a class="sair" href="#" id="sair">Sair</a>`
    : '<a class="btn" href="#login">Entrar</a>';
  $('hdr').innerHTML = `<div class="wrap bar"><a class="logo" href="#inicio"><img src="assets/img/logo.jpg" alt="">SpinLav</a><button class="menu" id="menu" type="button" aria-label="Abrir menu" aria-expanded="false"><span></span></button><nav id="nv">${a('#inicio', 'Início', 'inicio')}${a('#servicos', 'Serviços', 'servicos')}${a('#sobre', 'Sobre Nós', 'sobre')}${conta}</nav></div>`;
  const mb = $('menu'), nv = $('nv');
  mb.addEventListener('click', () => { const o = nv.classList.toggle('open'); mb.setAttribute('aria-expanded', o); });
  nv.addEventListener('click', ev => { if (ev.target.closest('a')) { nv.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); } });
  $('sair')?.addEventListener('click', async ev => {
    ev.preventDefault(); await sb.auth.signOut(); user = null; flash('Você saiu da sua conta.'); go('#inicio');
  });
}
function renderFooter() {
  $('ftr').innerHTML = `<div class="wrap bar"><div><div class="logo">SpinLav</div><p>Cuidado e praticidade para uma rotina mais leve.</p></div><nav><a href="#inicio">Início</a><a href="#servicos">Serviços</a><a href="#sobre">Sobre Nós</a>${WHATSAPP_LAVANDERIA ? `<a href="https://wa.me/${soNum(WHATSAPP_LAVANDERIA)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</nav></div>`;
}
function showFlash() {
  const f = pendingFlash; pendingFlash = null;
  $('flash').innerHTML = f ? `<div class="wrap" style="padding-top:20px"><div class="alert ${e(f[1])}">${e(f[0])}</div></div>` : '';
}

/* ============ páginas (views) ============ */
const GOOGLE_SVG = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
const GOOGLE = `<button type="button" class="btn-google" id="g">${GOOGLE_SVG}Continuar com o Google</button><div class="ou"><span>ou</span></div>`;
function ligarGoogle() {
  $('g').addEventListener('click', async () => {
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
    if (error) { $('err').textContent = 'Não foi possível entrar com o Google. Tente novamente.'; $('err').hidden = false; }
  });
}
const SIDE = t => `<div class="side"><img src="assets/img/logo.jpg" alt="Logo SpinLav"><h2>Uma rotina mais leve começa aqui.</h2><p style="margin:0">${t}</p></div>`;
const aviso = (m, href, label) => `<div class="wrap page"><div class="card vazio"><p>${m}</p><a class="btn" href="${href}">${label}</a></div></div>`;

async function vInicio({ draw }) {
  const s = (await getServicos()).slice(0, 3);
  draw(`<section class="hero"><div class="wrap">
    <div><div class="eyebrow">Bem-vindo à SpinLav</div><h1>Suas roupas limpas, sua rotina mais leve</h1>
    <p>A SpinLav oferece serviços de lavanderia com cuidado, praticidade e confiança para deixar mais tempo livre na sua rotina.</p>
    <div class="btns"><a class="btn" href="#servicos">Conheça nossos serviços</a><a class="btn o" href="#sobre">Sobre a SpinLav</a></div></div>
    <div class="pic"><img class="ph" style="object-fit:cover;display:block" src="assets/img/toalhas.svg" alt="Toalhas limpas e dobradas"><div class="seal"><img src="assets/img/logo.jpg" alt="Logo SpinLav"></div></div>
  </div></section>
  <section class="sec" style="background:var(--pale)"><div class="wrap"><h2>Um cuidado que cabe na sua rotina</h2><p class="sub"></p><div class="grid g3">
    ${card('clock', 'Mais tempo livre', 'Deixe a lavagem com a gente e use seu tempo no que importa.')}
    ${card('shield', 'Cuidado com cada peça', 'Tratamos cada tecido com atenção e respeito.')}
    ${card('heart', 'Praticidade e confiança', 'Um serviço simples, organizado e feito para o seu dia a dia.')}
  </div></div></section>
  <section class="sec white"><div class="wrap"><h2>Para cada peça, um jeito de cuidar</h2><p class="sub"></p>
    <div class="grid g3">${s.map(x => card(x.icone, x.nome, x.descricao)).join('')}</div>
    <div class="center"><a class="btn" href="#servicos">Ver todos os serviços</a></div></div></section>`);
}

async function vServicos({ draw }) {
  const s = await getServicos();
  draw(`<div class="wrap page"><div class="head"><div class="eyebrow">Nossos serviços</div><h1>Cuidado para cada tipo de roupa</h1>
    <p style="margin:0;max-width:640px">Escolha a opção que combina com as suas peças. Cada cuidado foi pensado para facilitar o seu dia a dia.</p>
    <p style="margin:18px 0 0"><a class="btn o" href="#horarios">Consultar horários</a></p></div>
    ${s.length ? '' : '<p class="alert err">Não foi possível carregar os serviços. Confira a configuração do Supabase.</p>'}
    <div class="grid g4">${s.map(x => card(x.icone, x.nome, `${x.descricao} A partir de ${money(x.preco_peca)} por peça.`, '#solicitar?servico=' + x.id, 'Solicitar serviço')).join('')}</div></div>`);
}

function vSobre({ draw }) {
  draw(`<section class="hero about"><div class="wrap">
    <div class="txt"><div class="eyebrow">Sobre nós</div><h1>Cuidar das suas roupas é cuidar do seu tempo</h1>
    <p>A SpinLav é uma lavanderia profissional criada para oferecer praticidade e confiança no tratamento das roupas. Nossa proposta é tornar essa parte da rotina mais simples e atenciosa.</p>
    <div class="seal"><img src="assets/img/logo.jpg" alt="Logo SpinLav"></div></div>
    <div class="pic"><img class="ph" style="object-fit:cover;display:block" src="assets/img/sobre.jpg" alt="Profissional trabalhando na lavanderia"></div>
  </div></section>
  <section class="about-cards"><div class="wrap"><div class="grid g3">
    ${card('target', 'Missão', 'Facilitar a rotina das pessoas com serviços de lavanderia práticos, cuidadosos e confiáveis.')}
    ${card('eye', 'Visão', 'Ser referência em lavanderia profissional, reconhecida pela qualidade e pela atenção às pessoas.')}
    ${card('heart', 'Compromisso com o cliente', 'Atendimento claro e organizado, com respeito a cada peça e ao tempo de quem confia na SpinLav.')}
  </div></div></section>`);
}

function vLogin({ draw }) {
  if (user) return go(user.perfil === 'admin' ? '#admin' : '#pedidos');
  draw(`<div class="wrap login">
    <form class="card" id="f"><div class="eyebrow" style="margin:0">Área do cliente</div><h1>Bem-vindo à SpinLav.</h1>
      <p style="margin:0">Entre para solicitar serviços e acompanhar seus pedidos.</p>
      <p class="alert err" id="err" hidden></p>
      ${GOOGLE}
      <label for="email">E-mail</label><input id="email" type="email" required autocomplete="email">
      <label for="senha">Senha</label><input id="senha" type="password" required autocomplete="current-password">
      <button class="btn fit" type="submit" id="b">Entrar</button>
      <p class="note">Ainda não tem conta? <a href="#cadastro"><strong>Cadastre-se</strong></a></p></form>
    ${SIDE('Cuidado e praticidade com a identidade acolhedora da SpinLav.')}</div>`);
  ligarGoogle();
  $('f').addEventListener('submit', async ev => {
    ev.preventDefault(); $('b').disabled = true; $('err').hidden = true;
    const { error } = await sb.auth.signInWithPassword({ email: $('email').value.trim(), password: $('senha').value });
    if (error) { $('err').textContent = error.message.includes('Email not confirmed') ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).' : 'E-mail ou senha incorretos.'; $('err').hidden = false; $('b').disabled = false; return; }
    await refreshUser(); flash('Olá, ' + user.nome + '! Que bom ter você de volta.'); go(user.perfil === 'admin' ? '#admin' : '#pedidos');
  });
}

function vCadastro({ draw }) {
  if (user) return go('#pedidos');
  draw(`<div class="wrap login">
    <form class="card" id="f"><div class="eyebrow" style="margin:0">Novo por aqui</div><h1>Criar conta</h1>
      <p class="alert err" id="err" hidden></p>
      ${GOOGLE}
      <label for="nome">Nome</label><input id="nome" type="text" required minlength="2">
      <label for="email">E-mail</label><input id="email" type="email" required>
      <label for="senha">Senha</label><input id="senha" type="password" minlength="6" required>
      <label for="conf">Confirmar senha</label><input id="conf" type="password" required>
      <button class="btn fit" type="submit" id="b">Cadastrar</button>
      <p class="note">Já tem conta? <a href="#login"><strong>Entrar</strong></a></p></form>
    ${SIDE('Crie sua conta e peça sua coleta em poucos cliques.')}</div>`);
  ligarGoogle();
  const erro = m => { $('err').textContent = m; $('err').hidden = false; $('b').disabled = false; };
  $('f').addEventListener('submit', async ev => {
    ev.preventDefault(); $('b').disabled = true; $('err').hidden = true;
    if ($('senha').value !== $('conf').value) return erro('As senhas não coincidem.');
    const { data, error } = await sb.auth.signUp({ email: $('email').value.trim(), password: $('senha').value, options: { data: { nome: $('nome').value.trim() }, emailRedirectTo: location.origin + '/' } });
    if (error) return erro(error.message.includes('already') ? 'Já existe uma conta com este e-mail.' : error.message);
    if (data.session) { await refreshUser(); flash('Conta criada com sucesso! Agora você já pode solicitar um serviço.'); go('#servicos'); }
    else { flash('Conta criada! Enviamos um e-mail de confirmação: confirme e depois faça login.'); go('#login'); }
  });
}

/* DFD 2.0 Registrar Pedidos — regra do projeto: cada pedido tem UM serviço (tipo de lavagem) e uma quantidade de peças */
async function vSolicitar({ draw, need, live, params }) {
  if (!need()) return;
  const servicos = await getServicos(); if (!live()) return;
  const sel = Number(params.get('servico') || 0);
  draw(`<div class="wrap page"><div class="head"><div class="eyebrow">Novo pedido</div><h1>Solicitar serviço</h1></div>
    <div class="form">${stepper(2)}<form class="card" id="f">
      <p class="alert err" id="err" hidden></p>
      <label for="serv">Serviço / tipo de lavagem</label>
      <select id="serv" required><option value="">Selecione…</option>${servicos.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${e(s.nome)} — ${money(s.preco_peca)}/peça</option>`).join('')}</select>
      <label for="qtd">Quantidade de peças</label><input id="qtd" type="number" min="1" max="200" value="1" required>
      <label for="obs">Observações (opcional)</label><textarea id="obs" maxlength="500"></textarea>
      <div class="resumo" id="prev" hidden></div>
      <p class="note">Cada pedido tem um tipo de lavagem. Para lavar outras peças com um serviço diferente, faça um novo pedido. O valor final é confirmado pela lavanderia após a conferência das peças. No próximo passo você escolhe data e horário.</p>
      <button class="btn fit" type="submit" id="b">Registrar pedido e agendar</button></form></div></div>`);
  const calc = () => {
    const s = servicos.find(x => x.id === Number($('serv').value)), q = Number($('qtd').value) || 0, p = $('prev');
    if (!s || q < 1) { p.hidden = true; return; }
    p.hidden = false; p.innerHTML = `<span>Tempo estimado: <strong>${tempoFmt(calcTempo(s, q))}</strong></span><span>Valor estimado: <strong>${money(q * s.preco_peca)}</strong></span>`;
  };
  $('serv').addEventListener('change', calc); $('qtd').addEventListener('input', calc); calc();
  $('f').addEventListener('submit', async ev => {
    ev.preventDefault(); $('b').disabled = true; $('err').hidden = true;
    const { data, error } = await sb.from('pedidos').insert({ cliente_id: user.id, servico_id: Number($('serv').value), quantidade: Number($('qtd').value), observacoes: $('obs').value.trim() || null }).select('id').single();
    if (error) { $('err').textContent = 'Não foi possível registrar o pedido: ' + error.message; $('err').hidden = false; $('b').disabled = false; return; }
    go('#agendar?pedido=' + data.id);
  });
}

/* DFD 5.0 Realizar Agendamentos — a duração (tempo_base + peças × tempo_por_peça) é calculada aqui, junto da escolha do horário */
async function vAgendar({ draw, need, live, params }) {
  if (!need()) return;
  const id = Number(params.get('pedido') || 0);
  const re = params.get('reagendar') === '1';
  const [{ data: p }, { data: pf }, { data: cur }] = await Promise.all([
    sb.from('pedidos').select('*, servicos(nome)').eq('id', id).eq('cliente_id', user.id).maybeSingle(),
    sb.from('clientes').select('cep,logradouro,numero,complemento,bairro,cidade,uf,telefone').eq('id', user.id).maybeSingle(),
    re ? sb.from('agendamentos').select(AG_COLS).eq('pedido_id', id).maybeSingle() : Promise.resolve({ data: null })
  ]);
  if (!live()) return;
  if (!p) return draw(aviso('Pedido não encontrado.', '#solicitar', 'Fazer um pedido'));
  if (p.status !== (re ? 'agendado' : 'pendente')) return draw(aviso(re ? 'Este pedido não pode mais ser reagendado.' : 'Este pedido não está aguardando agendamento.', '#pedidos', 'Ver meus pedidos'));
  const src = { ...(pf || {}), ...Object.fromEntries(Object.entries(cur || {}).filter(([, x]) => x != null)) };
  const tipo0 = cur?.tipo || 'coleta';
  const v = k => e(src[k] || '');
  draw(`<div class="wrap page"><div class="head"><div class="eyebrow">Pedido #${p.id}</div><h1>${re ? 'Reagendar pedido' : 'Agendar data e horário'}</h1></div>
    <div class="form">${re ? '' : stepper(3)}<form class="card" id="f">
      <div class="resumo"><span>Serviço: <strong>${e(p.servicos.nome)}</strong></span><span>Peças: <strong>${p.quantidade}</strong></span><span>Duração estimada: <strong>${tempoFmt(p.tempo_estimado_min)}</strong></span><span>Valor: <strong>${money(p.valor_estimado)}</strong></span></div>
      ${re && cur ? `<p class="note">Agendamento atual: <strong>${dataBR(cur.data_agendada)} às ${String(cur.horario).slice(0, 5)}</strong>. Escolha o novo dia e horário abaixo.</p>` : ''}
      <p class="alert err" id="err" hidden></p>
      <label for="tipo">Modalidade do atendimento</label>
      <select id="tipo"><option value="coleta" ${tipo0 === 'coleta' ? 'selected' : ''}>Coleta em casa</option><option value="balcao" ${tipo0 === 'balcao' ? 'selected' : ''}>Levar à lavanderia</option></select>
      <label for="tel">WhatsApp para contato</label>
      <input id="tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="15" placeholder="(11) 90000-0000" required value="${e(fmtTel(src.telefone))}">
      <fieldset class="end" id="end" aria-label="Endereço da coleta">
        <div class="eyebrow" style="margin:0">Endereço da coleta</div>
        <label for="cep">CEP</label>
        <input id="cep" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${e(fmtCep(src.cep))}">
        <p class="note" id="cepmsg" hidden></p>
        <label for="rua">Rua / Avenida</label>
        <input id="rua" type="text" autocomplete="address-line1" maxlength="120" value="${v('logradouro')}">
        <div class="duo">
          <div><label for="num">Número</label><input id="num" type="text" maxlength="10" autocomplete="off" value="${v('numero')}"></div>
          <div><label for="comp">Complemento</label><input id="comp" type="text" maxlength="60" autocomplete="address-line2" placeholder="Apto, bloco… (opcional)" value="${v('complemento')}"></div>
        </div>
        <label for="bai">Bairro</label>
        <input id="bai" type="text" maxlength="80" value="${v('bairro')}">
        <div class="duo uf">
          <div><label for="cid">Cidade</label><input id="cid" type="text" maxlength="80" autocomplete="address-level2" value="${v('cidade')}"></div>
          <div><label for="uf">UF</label><input id="uf" type="text" maxlength="2" autocomplete="address-level1" style="text-transform:uppercase" value="${v('uf')}"></div>
        </div>
      </fieldset>
      <label for="pg">Forma de pagamento</label>
      <select id="pg">${Object.entries(PAGTO).map(([k, t]) => `<option value="${k}" ${(src.forma_pagamento || 'pix') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <p class="note">O pagamento é feito na entrega ou na retirada das peças, na forma escolhida.</p>
      <div class="resumo" id="fr" hidden></div>
      <label for="dt">${re ? 'Nova data' : 'Data'}</label><input id="dt" type="date" min="${hoje()}" required>
      <label>Horários</label><div id="slots"><p class="note">Escolha uma data para consultar os horários disponíveis.</p></div>
      <button class="btn fit" type="submit" id="b" disabled>${re ? 'Confirmar novo horário' : 'Confirmar agendamento'}</button></form></div></div>`);

  /* endereço: aparece só na coleta em casa */
  const campos = ['cep', 'rua', 'num', 'bai', 'cid', 'uf'];
  const modo = () => { const c = $('tipo').value === 'coleta'; $('end').hidden = !c; campos.forEach(k => $(k).required = c); };
  /* frete: calculado pelo banco (rpc calcular_frete) conforme cidade/bairro */
  const base = Number(p.valor_estimado) || 0; let foraArea = false, tFrete, nFrete = 0;
  const calcFrete = async () => {
    const fr = $('fr'), my = ++nFrete;
    if ($('tipo').value !== 'coleta') { foraArea = false; fr.innerHTML = `<span>Frete: <strong>Grátis (você leva à lavanderia)</strong></span><span>Total estimado: <strong>${money(base)}</strong></span>`; fr.hidden = false; return; }
    const cid = $('cid').value.trim(), uf = $('uf').value.trim().toUpperCase();
    if (!cid || uf.length !== 2) { foraArea = false; fr.hidden = true; return; }
    const { data, error } = await sb.rpc('calcular_frete', { p_cidade: cid, p_uf: uf, p_bairro: $('bai').value.trim(), p_valor: base });
    if (!live() || my !== nFrete) return;
    if (error || data == null) { foraArea = true; fr.innerHTML = '<span>Ainda não entregamos neste endereço. Escolha “Levar à lavanderia” ou outro endereço.</span>'; }
    else { foraArea = false; const f = Number(data); fr.innerHTML = `<span>Frete: <strong>${f ? money(f) : 'Grátis'}</strong></span><span>Total estimado: <strong>${money(base + f)}</strong></span>`; }
    fr.hidden = false;
  };
  const deb = () => { clearTimeout(tFrete); tFrete = setTimeout(calcFrete, 400); };
  ['cid', 'uf', 'bai'].forEach(k => $(k).addEventListener('input', deb));
  $('tipo').addEventListener('change', () => { $('err').hidden = true; modo(); calcFrete(); });
  calcFrete();
  modo();
  $('tel').addEventListener('input', () => { $('tel').value = fmtTel($('tel').value); });
  $('cep').addEventListener('input', async () => {
    const d = $('cep').value.replace(/\D/g, '').slice(0, 8);
    $('cep').value = fmtCep(d);
    if (d.length !== 8) { $('cepmsg').hidden = true; return; }
    const m = $('cepmsg'); m.textContent = 'Buscando endereço…'; m.hidden = false;
    try {
      const r = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json();
      if (!live()) return;
      if (r.erro) { m.textContent = 'CEP não encontrado. Preencha o endereço manualmente.'; return; }
      if (r.logradouro) $('rua').value = r.logradouro;
      if (r.bairro) $('bai').value = r.bairro;
      $('cid').value = r.localidade || ''; $('uf').value = r.uf || '';
      m.hidden = true; calcFrete(); $('num').focus();
    } catch { if (live()) m.textContent = 'Não foi possível buscar o CEP. Preencha o endereço manualmente.'; }
  });

  let h = '';
  const carregar = async () => {
    h = ''; $('b').disabled = true;
    if (!$('dt').value || $('dt').value < hoje()) { $('slots').innerHTML = '<p class="note">Escolha uma data a partir de hoje.</p>'; return; }
    $('slots').innerHTML = '<p class="note">Consultando horários…</p>';
    const r = await horarios($('dt').value); if (!live()) return;
    $('slots').innerHTML = r.fechado ? '<p class="note">Não atendemos aos domingos. Escolha outra data.</p>'
      : r.erro ? '<p class="alert err">Não foi possível consultar os horários.</p>'
      : r.lista.some(s => s.livre) ? slotsHtml(r.lista) : '<p class="note">Sem horários disponíveis nesta data. Tente outro dia.</p>';
  };
  $('dt').addEventListener('change', () => { $('err').hidden = true; carregar(); });
  $('slots').addEventListener('click', ev => {
    const s = ev.target.closest('.slot'); if (!s || s.disabled) return;
    $('slots').querySelectorAll('.slot').forEach(x => x.classList.remove('sel')); s.classList.add('sel'); h = s.dataset.h; $('b').disabled = false;
  });
  const falha = m => { $('err').textContent = m; $('err').hidden = false; };
  $('f').addEventListener('submit', async ev => {
    ev.preventDefault(); if (!h) return; $('err').hidden = true;
    const col = $('tipo').value === 'coleta';
    const tel = soNum($('tel').value);
    if (tel.length < 10 || tel.length > 11) return falha('Informe o WhatsApp com DDD, por exemplo (11) 90000-0000.');
    const end = col ? {
      cep: $('cep').value.replace(/\D/g, ''), logradouro: $('rua').value.trim(), numero: $('num').value.trim(),
      complemento: $('comp').value.trim() || null, bairro: $('bai').value.trim(), cidade: $('cid').value.trim(), uf: $('uf').value.trim().toUpperCase()
    } : {};
    if (col && (end.cep.length !== 8 || !/^[A-Z]{2}$/.test(end.uf))) return falha('Confira o CEP (8 números) e a UF (2 letras) do endereço.');
    if (col && foraArea) return falha('Ainda não entregamos neste endereço. Escolha “Levar à lavanderia” ou outro endereço.');
    $('b').disabled = true;
    const { error } = re
      ? await sb.rpc('reagendar_pedido', { p_pedido: p.id, p_data: $('dt').value, p_horario: h, p_tipo: $('tipo').value, p_dados: { ...end, telefone: tel } })
      : await sb.from('agendamentos').insert({ pedido_id: p.id, cliente_id: user.id, tipo: $('tipo').value, data_agendada: $('dt').value, horario: h, telefone: tel, forma_pagamento: $('pg').value, ...end });
    if (error) { falha(/lotado|indispon/i.test(error.message) ? 'Esse horário não está mais disponível. Escolha outro.' : (re ? 'Não foi possível reagendar: ' : 'Não foi possível agendar: ') + error.message); carregar(); return; }
    if (re) await sb.from('agendamentos').update({ forma_pagamento: $('pg').value }).eq('pedido_id', p.id);   // reagendamento: atualiza a forma de pagamento
    await sb.from('clientes').update({ ...end, telefone: tel }).eq('id', user.id);   // guarda no perfil (se não der, o agendamento já está salvo)
    flash(re ? `Pedido reagendado para ${dataBR($('dt').value)} às ${h}.` : `Agendamento confirmado para ${dataBR($('dt').value)} às ${h}. Obrigado!${$('pg').value === 'pix' && PIX_CHAVE ? ' Chave Pix: ' + PIX_CHAVE + '.' : ''}`); go('#pedidos');
  });
}

/* DFD 4.0 Consultar Disponibilidade */
async function vHorarios({ draw, live }) {
  draw(`<div class="wrap page"><div class="head"><div class="eyebrow">Agenda</div><h1>Consultar horários</h1>
    <p style="margin:0;max-width:640px">Escolha uma data e veja os horários disponíveis para coleta ou entrega. Atendemos de segunda a sexta, das 8h às 17h, e aos sábados, das 8h às 12h.</p></div>
    <div class="card form"><label for="dt">Data</label><input id="dt" type="date" min="${hoje()}" value="${hoje()}"><div id="slots"></div>
    <a class="btn fit" href="${user ? '#solicitar' : '#login'}">${user ? 'Fazer um pedido' : 'Entrar para agendar'}</a></div></div>`);
  const mostrar = async () => {
    const d = $('dt').value;
    if (!d || d < hoje()) { $('slots').innerHTML = '<p class="note">Escolha uma data a partir de hoje.</p>'; return; }
    $('slots').innerHTML = '<p class="note">Consultando horários…</p>';
    const r = await horarios(d); if (!live()) return;
    $('slots').innerHTML = r.fechado ? '<p class="note">Não atendemos aos domingos.</p>' : r.erro ? '<p class="alert err">Não foi possível consultar os horários.</p>' : slotsHtml(r.lista);
    $('slots').querySelectorAll('.slot').forEach(x => x.style.cursor = 'default');
  };
  $('dt').addEventListener('change', mostrar); mostrar();
}

const ag = p => Array.isArray(p.agendamentos) ? p.agendamentos[0] : p.agendamentos;
const totalTxt = p => { const a = ag(p), f = Number(a?.frete || 0); return `${money(Number(p.valor_estimado) + f)}${a ? `<br><small>${f ? 'com frete ' + money(f) : 'sem frete'} · ${PAGTO[a.forma_pagamento] || '—'}${p.pago ? ' · pago ✓' : ''}</small>` : ''}`; };
const quando = (p, curto, comEnd) => {
  const a = ag(p);
  if (!a) return '—';
  const end = comEnd && a.tipo === 'coleta' && endTxt(a) ? `<br><small>${e(endTxt(a))}</small>` : '';
  return `${dataBR(a.data_agendada)} às ${String(a.horario).slice(0, 5)}<br><small>${a.tipo === 'coleta' ? (curto ? 'Coleta' : 'Coleta em casa') : (curto ? 'Balcão' : 'Na lavanderia')}</small>${end}`;
};

/* DFD 6.0 Consultar Pedidos e Agendamentos (visão do cliente) */
async function vPedidos({ draw, need, live }) {
  if (!need()) return;
  const { data, error } = await sb.from('pedidos').select(`*, servicos(nome), agendamentos(${AG_COLS})`).eq('cliente_id', user.id).order('criado_em', { ascending: false });
  if (!live()) return;
  const l = data || [];
  draw(`<div class="wrap page"><div class="head"><div class="eyebrow">Olá, ${e(user.nome)}</div><h1>Meus pedidos</h1></div><div class="card">
    ${error ? '<p class="alert err">Não foi possível carregar seus pedidos.</p>' : ''}
    ${!l.length ? '<div class="vazio"><p>Você ainda não fez nenhum pedido.</p><a class="btn" href="#solicitar">Solicitar serviço</a></div>' : `
    <div class="scroll"><table class="tbl"><thead><tr><th>Nº</th><th>Serviço</th><th>Peças</th><th>Duração est.</th><th>Agendamento</th><th>Valor est.</th><th>Status</th><th></th></tr></thead><tbody>
    ${l.map(p => `<tr><td data-label="Pedido">#${p.id}</td><td data-label="Serviço">${e(p.servicos?.nome)}</td><td data-label="Peças">${p.quantidade}</td>
      <td data-label="Duração est.">${tempoFmt(p.tempo_estimado_min)}</td><td data-label="Agendamento">${quando(p, false, true)}</td><td data-label="Valor est.">${totalTxt(p)}</td>
      <td data-label="Status"><span class="badge s-${p.status}">${STATUS[p.status]}</span></td>
      <td><div class="acoes">${p.status === 'pendente' ? `<a class="btn mini" href="#agendar?pedido=${p.id}">Agendar</a>` : ''}${p.status === 'agendado' && !p.pago ? `<button class="btn zap mini" data-pagar="${p.id}">Pagar agora</button>` : ''}${p.status === 'agendado' ? `<a class="btn mini" href="#agendar?pedido=${p.id}&reagendar=1">Reagendar</a>` : ''}${['pendente', 'agendado'].includes(p.status) ? `<button class="btn o mini" data-cancelar="${p.id}">Cancelar</button>` : ''}</div></td></tr>`).join('')}
    </tbody></table></div><div><a class="btn" href="#solicitar">Novo pedido</a></div>`}</div></div>`);
  app.querySelectorAll('[data-pagar]').forEach(btn => btn.addEventListener('click', async () => {
    const t = btn.textContent; btn.disabled = true; btn.textContent = 'Abrindo…';
    const { data, error } = await sb.functions.invoke('criar-pagamento', { body: { pedido_id: Number(btn.dataset.pagar) } });
    if (error || !data?.url) { flash('Não foi possível abrir o pagamento online agora. Você pode pagar na entrega ou na retirada.', 'err'); route(); return; }
    location.href = data.url;
  }));
  app.querySelectorAll('[data-cancelar]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Cancelar este pedido? O horário agendado será liberado.')) return;
    const { error } = await sb.from('pedidos').update({ status: 'cancelado' }).eq('id', btn.dataset.cancelar).in('status', ['pendente', 'agendado']);
    flash(error ? 'Este pedido não pode mais ser cancelado.' : 'Pedido cancelado.', error ? 'err' : 'ok'); route();
  }));
}

/* ---------- área do funcionário (perfil 'admin') ---------- */
const zapMsg = (p, a) => {
  const n = String(p.clientes?.nome || '').split(' ')[0];
  const hh = a ? String(a.horario).slice(0, 5) : '';
  const m = {
    pendente: 'Precisamos confirmar o agendamento do seu pedido.',
    agendado: a ? `Confirmamos o ${a.tipo === 'coleta' ? 'recolhimento das suas peças' : 'seu atendimento'} em ${dataBR(a.data_agendada)} às ${hh}.` : 'Seu pedido está agendado.',
    em_andamento: 'Suas peças já estão sendo cuidadas por aqui.',
    concluido: a?.tipo === 'coleta' ? 'Seu pedido está pronto! Vamos combinar o melhor horário para a entrega?' : 'Seu pedido está pronto para retirada na lavanderia!',
    cancelado: 'Seu pedido foi cancelado.'
  };
  return `Olá${n ? ', ' + n : ''}! Aqui é da SpinLav, sobre o seu pedido #${p.id}. ${m[p.status] || ''}`;
};
const zapBtn = (p, a) => {
  const l = waLink(a?.telefone || p.clientes?.telefone, zapMsg(p, a));
  return l ? `<a class="btn zap mini" href="${e(l)}" target="_blank" rel="noopener">WhatsApp</a>` : '<small>sem telefone</small>';
};
const statusSel = p => `<select id="st-${p.id}" aria-label="Status do pedido ${p.id}">${Object.entries(STATUS).map(([k, t]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${t}</option>`).join('')}</select><button class="btn mini" data-salvar="${p.id}">Salvar</button><button class="btn o mini" data-pago="${p.id}" data-v="${p.pago ? 0 : 1}">${p.pago ? 'Desfazer pago' : 'Marcar pago'}</button>`;
const salvarStatus = async id => {
  const { error } = await sb.from('pedidos').update({ status: $('st-' + id).value }).eq('id', id);
  flash(error ? 'Não foi possível atualizar o status.' : 'Status atualizado.', error ? 'err' : 'ok'); route();
};
const admClick = async ev => {
  const s = ev.target.closest('[data-salvar]'); if (s) return salvarStatus(s.dataset.salvar);
  const g = ev.target.closest('[data-pago]'); if (!g) return;
  g.disabled = true;
  const { error } = await sb.rpc('marcar_pago', { p_pedido: Number(g.dataset.pago), p_pago: g.dataset.v === '1' });
  flash(error ? 'Não foi possível atualizar o pagamento.' : 'Pagamento atualizado.', error ? 'err' : 'ok'); route();
};
const admTabs = a => `<div class="tabs">${[['agenda', 'Agenda do dia'], ['pedidos', 'Todos os pedidos'], ['clientes', 'Clientes'], ['servicos', 'Serviços'], ['bloqueios', 'Bloqueios'], ['frete', 'Frete'], ...(user.dono ? [['equipe', 'Equipe'], ['registro', 'Registro']] : [])].map(([k, t]) => `<a class="tab${a === k ? ' on' : ''}" href="#admin?aba=${k}">${t}</a>`).join('')}</div>`;
const admShell = (aba, inner) => `<div class="wrap page"><div class="head"><div class="eyebrow">Área do funcionário</div><h1>Painel da lavanderia</h1></div>${admTabs(aba)}<div class="card" id="adm">${inner}</div></div>`;
const numOuNull = v => String(v).trim() === '' ? null : Number(String(v).replace(',', '.'));

/* ---------- verificação em duas etapas (app autenticador) ---------- */
async function mfaGate({ draw, live }) {
  const { data: lf } = await sb.auth.mfa.listFactors();
  if (!live()) return;
  const ativo = (lf?.totp || [])[0];
  const erro = m => { $('err').textContent = m; $('err').hidden = false; $('b').disabled = false; };
  const concluir = async () => { await refreshUser(); flash('Verificação concluída. Bem-vindo ao painel!'); route(); };
  if (ativo) {
    draw(`<div class="wrap login"><form class="card" id="f"><div class="eyebrow" style="margin:0">Segurança</div><h1>Verificação em duas etapas</h1>
      <p style="margin:0">Digite o código de 6 dígitos do seu app autenticador para abrir o painel.</p>
      <p class="alert err" id="err" hidden></p>
      <label for="cod">Código</label><input id="cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
      <button class="btn fit" type="submit" id="b">Verificar</button></form>
      ${SIDE('O painel do funcionário exige um segundo passo de segurança.')}</div>`);
    $('f').addEventListener('submit', async ev => {
      ev.preventDefault(); $('b').disabled = true; $('err').hidden = true;
      const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: ativo.id, code: $('cod').value.replace(/\D/g, '') });
      if (error) return erro('Código incorreto ou expirado. Tente o código atual do app.');
      concluir();
    });
    return;
  }
  for (const f of (lf?.all || [])) if (f.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SpinLav' });
  if (!live()) return;
  if (error || !data) return draw(aviso('Não foi possível ativar a verificação em duas etapas. Confira se o MFA (TOTP) está ativado no Supabase.', '#inicio', 'Voltar ao início'));
  draw(`<div class="wrap login"><form class="card" id="f"><div class="eyebrow" style="margin:0">Segurança</div><h1>Ative a verificação em duas etapas</h1>
    <p style="margin:0">Para acessar o painel, cadastre um app autenticador (Google Authenticator, Authy, Microsoft Authenticator…): escaneie o QR Code e digite o código que aparecer.</p>
    <img class="qr" id="qr" alt="QR Code para o app autenticador" width="200" height="200">
    <p class="note">Sem câmera? Digite esta chave no app: <span class="cod">${e(data.totp.secret)}</span></p>
    <p class="alert err" id="err" hidden></p>
    <label for="cod">Código do app</label><input id="cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
    <button class="btn fit" type="submit" id="b">Ativar e entrar</button></form>
    ${SIDE('Guarde bem o acesso ao app: ele será pedido sempre que você entrar no painel.')}</div>`);
  $('qr').src = data.totp.qr_code;
  $('f').addEventListener('submit', async ev => {
    ev.preventDefault(); $('b').disabled = true; $('err').hidden = true;
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: data.id, code: $('cod').value.replace(/\D/g, '') });
    if (error) return erro('Código incorreto. Confira o código atual no app e tente de novo.');
    concluir();
  });
}

async function vAdmin({ draw, need, live, params }) {
  if (!need(true)) return;
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!live()) return;
  if (aal?.currentLevel !== 'aal2') return mfaGate({ draw, live });
  const aba = ['agenda', 'pedidos', 'clientes', 'servicos', 'bloqueios', 'frete', 'equipe', 'registro'].includes(params.get('aba')) ? params.get('aba') : 'agenda';
  if (['equipe', 'registro'].includes(aba) && !user.dono) { flash('Esta área é exclusiva do dono.', 'err'); return go('#admin'); }

  /* ----- Agenda do dia ----- */
  if (aba === 'agenda') {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(params.get('data') || '') ? params.get('data') : hoje();
    const soma = n => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    const [{ data: agd, error }, { data: bl }] = await Promise.all([
      sb.from('agendamentos').select(`${AG_COLS}, pedidos(id,status,pago,quantidade,observacoes,servicos(nome),clientes(nome,email,telefone))`).eq('data_agendada', d).order('horario'),
      sb.from('bloqueios').select('*').eq('data', d)
    ]);
    if (!live()) return;
    const itens = (agd || []).filter(x => x.pedidos && x.pedidos.status !== 'cancelado');
    const dia = new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    draw(admShell('agenda', `
      <div class="diabar"><a class="btn o mini" href="#admin?aba=agenda&data=${soma(-1)}">← Dia anterior</a>
        <input id="dia" type="date" value="${d}" aria-label="Escolher dia"><a class="btn o mini" href="#admin?aba=agenda&data=${soma(1)}">Próximo dia →</a>
        ${d !== hoje() ? `<a class="btn mini" href="#admin?aba=agenda">Hoje</a>` : ''}</div>
      <h2 style="font-size:20px;text-transform:capitalize;margin-bottom:4px">${e(dia)}</h2>
      <p style="margin:0 0 14px">${itens.length} agendamento(s) neste dia.</p>
      ${error ? '<p class="alert err">Não foi possível carregar a agenda.</p>' : ''}
      ${(bl || []).map(b => `<p class="bloq">Bloqueado: ${b.horario ? String(b.horario).slice(0, 5) : 'dia inteiro'}${b.motivo ? ' — ' + e(b.motivo) : ''}</p>`).join('')}
      ${itens.length ? itens.map(x => { const p = x.pedidos; return `<div class="agi"><div class="hr">${String(x.horario).slice(0, 5)}</div><div class="info">
        <strong>${e(p.clientes?.nome)} <small>· pedido #${p.id}</small></strong>
        <span>${e(p.servicos?.nome)} · ${p.quantidade} peça(s)</span>
        <span>${x.tipo === 'coleta' ? 'Coleta em casa' + (endTxt(x) ? ' — ' + e(endTxt(x)) : '') : 'Cliente leva à lavanderia'}</span>
        ${p.observacoes ? `<small>Obs.: ${e(p.observacoes)}</small>` : ''}
        <div class="acts"><span class="badge s-${p.status}">${STATUS[p.status]}</span>${statusSel(p)}${zapBtn(p, x)}</div></div></div>`; }).join('')
        : '<div class="vazio"><p>Nenhum agendamento neste dia.</p></div>'}`));
    $('dia').addEventListener('change', () => { if ($('dia').value) go('#admin?aba=agenda&data=' + $('dia').value); });
    $('adm').addEventListener('click', admClick);
    return;
  }

  /* ----- Todos os pedidos (com filtros) ----- */
  if (aba === 'pedidos') {
    const { data, error } = await sb.from('pedidos').select(`*, servicos(nome), clientes(nome,email,telefone), agendamentos(${AG_COLS})`).order('criado_em', { ascending: false });
    if (!live()) return;
    const l = data || [];
    const tabela = r => `<div class="scroll"><table class="tbl"><thead><tr><th>Nº</th><th>Cliente</th><th>Serviço</th><th>Peças</th><th>Agendamento</th><th>Valor</th><th>Obs.</th><th>Status</th><th></th></tr></thead><tbody>
      ${r.map(p => `<tr><td data-label="Pedido">#${p.id}</td><td data-label="Cliente">${e(p.clientes?.nome)}<br><small>${e(p.clientes?.email)}</small></td><td data-label="Serviço">${e(p.servicos?.nome)}</td><td data-label="Peças">${p.quantidade}</td>
        <td data-label="Agendamento">${quando(p, true, true)}</td><td data-label="Valor">${totalTxt(p)}</td><td data-label="Obs.">${e(p.observacoes || '—')}</td>
        <td data-label="Status"><div class="inline">${statusSel(p)}</div></td><td>${zapBtn(p, ag(p))}</td></tr>`).join('')}</tbody></table></div>`;
    draw(admShell('pedidos', `${error ? '<p class="alert err">Não foi possível carregar os pedidos.</p>' : ''}
      <div class="filtros">
        <div><label for="f-q">Buscar cliente ou nº</label><input id="f-q" type="text" placeholder="Nome, e-mail ou número"></div>
        <div><label for="f-st">Status</label><select id="f-st"><option value="">Todos</option>${Object.entries(STATUS).map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select></div>
        <div><label for="f-dt">Data do agendamento</label><input id="f-dt" type="date"></div>
      </div><p id="cont" style="margin:0 0 10px"></p><div id="lista"></div>`));
    const lista = () => {
      const s = $('f-st').value, dt = $('f-dt').value, q = $('f-q').value.trim().toLowerCase();
      const r = l.filter(p => (!s || p.status === s) && (!dt || ag(p)?.data_agendada === dt) && (!q || `${p.clientes?.nome} ${p.clientes?.email} ${p.id}`.toLowerCase().includes(q)));
      $('cont').textContent = `${r.length} de ${l.length} pedido(s)`;
      $('lista').innerHTML = r.length ? tabela(r) : '<div class="vazio"><p>Nenhum pedido encontrado.</p></div>';
    };
    ['f-q', 'f-st', 'f-dt'].forEach(i => $(i).addEventListener('input', lista));
    $('adm').addEventListener('click', admClick);
    lista();
    return;
  }

  /* ----- Clientes (consulta, somente leitura) — RF001/RF005, DFD 1.0 e 6.0 ----- */
  if (aba === 'clientes') {
    const { data, error } = await sb.rpc('listar_clientes_func');
    if (!live()) return;
    const l = (data || []).slice().sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const tabela = r => `<div class="scroll"><table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Pedidos</th><th>Perfil</th><th></th></tr></thead><tbody>
      ${r.map(c => { const z = waLink(c.telefone, `Olá, ${String(c.nome || '').split(' ')[0]}! Aqui é da SpinLav.`); return `<tr><td data-label="Nome">${e(c.nome)}</td><td data-label="E-mail">${e(c.email)}</td>
        <td data-label="Telefone">${c.telefone ? e(fmtTel(c.telefone)) : '—'}</td><td data-label="Pedidos">${Number(c.total_pedidos) || 0}</td>
        <td data-label="Perfil"><span class="badge ${c.perfil === 'admin' ? 's-agendado' : 's-cancelado'}">${c.perfil === 'admin' ? 'Funcionário' : 'Cliente'}</span></td>
        <td>${z ? `<a class="btn zap mini" href="${e(z)}" target="_blank" rel="noopener">WhatsApp</a>` : '<small>sem telefone</small>'}</td></tr>`; }).join('')}</tbody></table></div>`;
    draw(admShell('clientes', `
      <p style="margin:0 0 14px">Consulta dos clientes cadastrados. Esta tela é somente leitura: o funcionário vê os dados de contato e o total de pedidos, mas não altera cadastros nem perfis.</p>
      ${error ? '<p class="alert err">Não foi possível carregar os clientes. Rode o SQL funcionario-servicos-clientes.sql no Supabase.</p>' : ''}
      <div class="filtros"><div><label for="f-q">Buscar por nome, e-mail ou telefone</label><input id="f-q" type="text" placeholder="Digite para filtrar"></div></div>
      <p id="cont" style="margin:0 0 10px"></p><div id="lista"></div>`));
    const lista = () => {
      const q = $('f-q').value.trim().toLowerCase(), qn = soNum(q);
      const r = l.filter(c => !q || `${c.nome} ${c.email}`.toLowerCase().includes(q) || (qn && soNum(c.telefone).includes(qn)));
      $('cont').textContent = `${r.length} de ${l.length} cliente(s)`;
      $('lista').innerHTML = r.length ? tabela(r) : '<div class="vazio"><p>Nenhum cliente encontrado.</p></div>';
    };
    $('f-q').addEventListener('input', lista); lista();
    return;
  }

  /* ----- Serviços e tipos de lavagem (RF003, DFD 3.0) ----- */
  if (aba === 'servicos') {
    const { data, error } = await sb.from('servicos').select('*').order('id');
    if (!live()) return;
    const l = data || [];
    const optIc = sel => Object.entries(ICONES_SERVICO).map(([k, t]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${t}</option>`).join('');
    const ler = (p) => ({
      nome: $(`${p}n`).value.trim(), descricao: $(`${p}d`).value.trim(), icone: $(`${p}i`).value,
      preco_peca: numOuNull($(`${p}p`).value), tempo_base_min: numOuNull($(`${p}b`).value), tempo_peca_min: numOuNull($(`${p}t`).value)
    });
    const invalido = s => !s.nome ? 'Informe o nome do serviço.'
      : !s.descricao ? 'Informe uma descrição curta.'
      : (s.preco_peca == null || !(s.preco_peca >= 0)) ? 'Informe o preço por peça (0 ou mais).'
      : (!Number.isInteger(s.tempo_base_min) || s.tempo_base_min < 0 || !Number.isInteger(s.tempo_peca_min) || s.tempo_peca_min < 0) ? 'Os tempos devem ser números inteiros de minutos (0 ou mais).' : '';
    draw(admShell('servicos', `
      <p style="margin:0 0 14px">Cadastre os tipos de lavagem. A <strong>duração</strong> de um pedido é calculada como <strong>tempo base + peças × tempo por peça</strong>. Alterar preço ou tempo vale só para pedidos novos: pedidos já feitos mantêm o valor e o tempo do momento em que foram registrados. Para tirar um serviço do site, desmarque “Ativo” (não é possível apagar serviços que já têm pedidos).</p>
      ${error ? '<p class="alert err">Não foi possível carregar os serviços. Rode o SQL funcionario-servicos-clientes.sql no Supabase.</p>' : ''}
      <p class="alert err" id="err" hidden></p>
      <form id="fs" class="filtros">
        <div><label for="n-n">Nome</label><input id="n-n" type="text" maxlength="60" required></div>
        <div><label for="n-d">Descrição</label><input id="n-d" type="text" maxlength="160" required></div>
        <div><label for="n-i">Ícone</label><select id="n-i">${optIc('wash')}</select></div>
        <div><label for="n-p">Preço por peça (R$)</label><input id="n-p" type="number" min="0" step="0.01" required></div>
        <div><label for="n-b">Tempo base (min)</label><input id="n-b" type="number" min="0" step="1" value="0" required></div>
        <div><label for="n-t">Tempo por peça (min)</label><input id="n-t" type="number" min="0" step="1" value="0" required></div>
        <div style="justify-content:flex-end"><button class="btn" type="submit" id="n-ok">Adicionar serviço</button></div>
      </form>
      ${l.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Nome</th><th>Descrição</th><th>Ícone</th><th>Preço/peça</th><th>Base (min)</th><th>Por peça (min)</th><th>Ativo</th><th></th></tr></thead><tbody>
        ${l.map(s => `<tr><td data-label="Nome"><input id="e${s.id}n" type="text" maxlength="60" value="${e(s.nome)}"></td>
          <td data-label="Descrição"><input id="e${s.id}d" type="text" maxlength="160" value="${e(s.descricao)}"></td>
          <td data-label="Ícone"><select id="e${s.id}i">${optIc(s.icone)}</select></td>
          <td data-label="Preço/peça"><input id="e${s.id}p" type="number" min="0" step="0.01" value="${s.preco_peca}" style="max-width:110px"></td>
          <td data-label="Base (min)"><input id="e${s.id}b" type="number" min="0" step="1" value="${s.tempo_base_min}" style="max-width:100px"></td>
          <td data-label="Por peça (min)"><input id="e${s.id}t" type="number" min="0" step="1" value="${s.tempo_peca_min}" style="max-width:100px"></td>
          <td data-label="Ativo"><input id="e${s.id}a" type="checkbox" ${s.ativo ? 'checked' : ''} aria-label="Ativo"></td>
          <td><button class="btn mini" data-ssalvar="${s.id}">Salvar</button></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vazio"><p>Nenhum serviço cadastrado.</p></div>'}`));
    const falha = m => { $('err').textContent = m; $('err').hidden = false; };
    $('fs').addEventListener('submit', async ev => {
      ev.preventDefault(); $('err').hidden = true;
      const s = ler('n-'); const m = invalido(s); if (m) return falha(m);
      $('n-ok').disabled = true;
      const { error } = await sb.from('servicos').insert({ ...s, ativo: true });
      if (error) { $('n-ok').disabled = false; return falha('Não foi possível adicionar: ' + error.message); }
      servicosP = null; flash('Serviço adicionado.'); route();
    });
    $('adm').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-ssalvar]'); if (!b) return;
      const i = b.dataset.ssalvar; $('err').hidden = true;
      const s = ler(`e${i}`); const m = invalido(s); if (m) return falha(m);
      b.disabled = true;
      const { error } = await sb.from('servicos').update({ ...s, ativo: $(`e${i}a`).checked }).eq('id', i);
      servicosP = null; flash(error ? 'Não foi possível salvar o serviço.' : 'Serviço atualizado.', error ? 'err' : 'ok'); route();
    });
    return;
  }

  /* ----- Equipe: quem é funcionário (só o dono) ----- */
  if (aba === 'equipe') {
    const { data, error } = await sb.rpc('listar_clientes');
    if (!live()) return;
    const rank = c => c.dono ? 0 : c.perfil === 'admin' ? 1 : 2;
    const l = (data || []).slice().sort((a, b) => rank(a) - rank(b) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
    const tabela = r => `<div class="scroll"><table class="tbl"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr></thead><tbody>
      ${r.map(c => `<tr><td data-label="Nome">${e(c.nome)}</td><td data-label="E-mail">${e(c.email)}</td>
        <td data-label="Perfil"><span class="badge ${c.dono ? 's-concluido' : c.perfil === 'admin' ? 's-agendado' : 's-cancelado'}">${c.dono ? 'Dono' : c.perfil === 'admin' ? 'Funcionário' : 'Cliente'}</span></td>
        <td>${c.id === user.id ? '<small>você</small>' : c.dono ? '<small>dono</small>' : c.perfil === 'admin'
          ? `<button class="btn o mini" data-perfil="${c.id}" data-novo="cliente" data-nome="${e(c.nome)}">Remover acesso</button>`
          : `<button class="btn mini" data-perfil="${c.id}" data-novo="admin" data-nome="${e(c.nome)}">Tornar funcionário</button>`}</td></tr>`).join('')}</tbody></table></div>`;
    draw(admShell('equipe', `
      <p style="margin:0 0 14px">Só o dono vê esta aba. A pessoa precisa ter criado uma conta no site antes. Depois de mudar, ela deve sair e entrar de novo. Todas as mudanças ficam no Registro.</p>
      ${error ? '<p class="alert err">Não foi possível carregar a lista. Rode o SQL seguranca-admin.sql no Supabase.</p>' : ''}
      <div class="filtros"><div><label for="f-q">Buscar por nome ou e-mail</label><input id="f-q" type="text" placeholder="Digite para filtrar"></div></div>
      <div id="lista"></div>`));
    const lista = () => {
      const q = $('f-q').value.trim().toLowerCase();
      const r = l.filter(c => !q || `${c.nome} ${c.email}`.toLowerCase().includes(q));
      $('lista').innerHTML = r.length ? tabela(r) : '<div class="vazio"><p>Nenhuma conta encontrada.</p></div>';
    };
    $('f-q').addEventListener('input', lista); lista();
    $('lista').addEventListener('click', async ev => {
      const b = ev.target.closest('[data-perfil]'); if (!b) return;
      const tornar = b.dataset.novo === 'admin';
      if (!confirm(tornar ? `Dar acesso de funcionário para ${b.dataset.nome}?` : `Remover o acesso de funcionário de ${b.dataset.nome}?`)) return;
      b.disabled = true;
      const { error } = await sb.rpc('definir_perfil', { p_cliente: b.dataset.perfil, p_perfil: b.dataset.novo });
      flash(error ? 'Não foi possível alterar o perfil: ' + error.message : (tornar ? 'Agora essa pessoa é funcionária.' : 'Acesso de funcionário removido.'), error ? 'err' : 'ok'); route();
    });
    return;
  }

  /* ----- Registro de ações (só o dono) ----- */
  if (aba === 'registro') {
    const { data, error } = await sb.from('auditoria').select('*').order('quando', { ascending: false }).limit(300);
    if (!live()) return;
    const l = data || [];
    const ACAO = { pedido_status: 'Status de pedido', perfil: 'Acesso / perfil', bloqueio_criado: 'Bloqueio criado', bloqueio_removido: 'Bloqueio removido', servico_criado: 'Serviço criado', servico_alterado: 'Serviço alterado' };
    const tabela = r => `<div class="scroll"><table class="tbl"><thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Detalhe</th></tr></thead><tbody>
      ${r.map(x => `<tr><td data-label="Quando">${e(new Date(x.quando).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }))}</td><td data-label="Quem">${e(x.ator_email)}</td><td data-label="Ação">${e(ACAO[x.acao] || x.acao)}</td><td data-label="Detalhe">${e(x.alvo || '')}${x.detalhe ? ' — ' + e(x.detalhe) : ''}</td></tr>`).join('')}</tbody></table></div>`;
    draw(admShell('registro', `
      <p style="margin:0 0 14px">Últimas ações feitas por funcionários (até 300). Este registro não pode ser editado nem apagado pelo site.</p>
      ${error ? '<p class="alert err">Não foi possível carregar o registro. Rode o SQL seguranca-admin.sql no Supabase.</p>' : ''}
      <div class="filtros"><div><label for="f-q">Filtrar</label><input id="f-q" type="text" placeholder="Pessoa, ação ou pedido"></div></div>
      <div id="lista"></div>`));
    const lista = () => {
      const q = $('f-q').value.trim().toLowerCase();
      const r = l.filter(x => !q || `${x.ator_email} ${ACAO[x.acao] || x.acao} ${x.alvo} ${x.detalhe}`.toLowerCase().includes(q));
      $('lista').innerHTML = r.length ? tabela(r) : '<div class="vazio"><p>Nenhum registro.</p></div>';
    };
    $('f-q').addEventListener('input', lista); lista();
    return;
  }

  /* ----- Frete: zonas de entrega e valores ----- */
  if (aba === 'frete') {
    const { data, error } = await sb.from('zonas_frete').select('*').order('uf').order('cidade').order('bairro', { nullsFirst: true });
    if (!live()) return;
    const l = data || [];
    const num = numOuNull;
    draw(admShell('frete', `
      <p style="margin:0 0 14px">Cadastre onde você faz coleta/entrega e quanto cobra. O valor de um <strong>bairro</strong> vale mais que o da <strong>cidade</strong>. Valor 0 = frete grátis. “Grátis acima de” zera o frete quando o valor das peças do pedido chega a esse valor. Cidades não cadastradas ficam sem coleta em casa.</p>
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
      ${l.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Cidade</th><th>Bairro</th><th>Frete (R$)</th><th>Grátis acima de</th><th>Ativo</th><th></th></tr></thead><tbody>
        ${l.map(z => `<tr><td data-label="Cidade">${e(z.cidade)}/${e(z.uf)}</td><td data-label="Bairro">${e(z.bairro || 'Cidade toda')}</td>
          <td data-label="Frete (R$)"><input id="v-${z.id}" type="number" min="0" step="0.01" value="${z.valor}" style="max-width:120px"></td>
          <td data-label="Grátis acima de"><input id="g-${z.id}" type="number" min="0.01" step="0.01" value="${z.frete_gratis_acima ?? ''}" placeholder="—" style="max-width:120px"></td>
          <td data-label="Ativo"><input id="a-${z.id}" type="checkbox" ${z.ativo ? 'checked' : ''} aria-label="Ativo"></td>
          <td><div class="acoes"><button class="btn mini" data-zsalvar="${z.id}">Salvar</button><button class="btn o mini" data-zdel="${z.id}">Remover</button></div></td></tr>`).join('')}</tbody></table></div>`
        : '<div class="vazio"><p>Nenhuma zona cadastrada. Sem zonas, a coleta em casa fica indisponível.</p></div>'}`));
    $('fz').addEventListener('submit', async ev => {
      ev.preventDefault(); $('z-ok').disabled = true; $('err').hidden = true;
      const uf = $('z-u').value.trim().toUpperCase();
      const falha = m => { $('err').textContent = m; $('err').hidden = false; $('z-ok').disabled = false; };
      if (!/^[A-Z]{2}$/.test(uf)) return falha('A UF precisa ter 2 letras (ex.: SP).');
      const { error } = await sb.from('zonas_frete').insert({ cidade: $('z-c').value.trim(), uf, bairro: $('z-b').value.trim() || null, valor: num($('z-v').value), frete_gratis_acima: num($('z-g').value) });
      if (error) return falha(/duplicate|unique/i.test(error.message) ? 'Essa cidade/bairro já está cadastrada.' : 'Não foi possível adicionar: ' + error.message);
      flash('Zona de frete adicionada.'); route();
    });
    $('adm').addEventListener('click', async ev => {
      const sv = ev.target.closest('[data-zsalvar]'), dl = ev.target.closest('[data-zdel]');
      if (sv) {
        const i = sv.dataset.zsalvar; sv.disabled = true;
        const { error } = await sb.from('zonas_frete').update({ valor: num($('v-' + i).value), frete_gratis_acima: num($('g-' + i).value), ativo: $('a-' + i).checked }).eq('id', i);
        flash(error ? 'Não foi possível salvar.' : 'Frete atualizado.', error ? 'err' : 'ok'); route();
      } else if (dl && confirm('Remover esta zona de frete?')) {
        const { error } = await sb.from('zonas_frete').delete().eq('id', dl.dataset.zdel);
        flash(error ? 'Não foi possível remover.' : 'Zona removida.', error ? 'err' : 'ok'); route();
      }
    });
    return;
  }

  /* ----- Bloqueios de datas e horários ----- */
  const { data: bl, error } = await sb.from('bloqueios').select('*').gte('data', hoje()).order('data').order('horario', { nullsFirst: true });
  if (!live()) return;
  draw(admShell('bloqueios', `
    <p style="margin:0 0 14px">Bloqueie feriados, folgas ou horários específicos. Os clientes verão esses horários como indisponíveis. Agendamentos já feitos não são cancelados automaticamente: avise os clientes.</p>
    ${error ? '<p class="alert err">Não foi possível carregar os bloqueios. Rode o SQL de administração no Supabase (admin-e-seguranca.sql).</p>' : ''}
    <p class="alert err" id="err" hidden></p>
    <form id="fb" class="filtros">
      <div><label for="b-dt">Data</label><input id="b-dt" type="date" min="${hoje()}" required></div>
      <div><label for="b-h">Horário</label><select id="b-h"><option value="">Dia inteiro</option>${HORARIOS.map(h => `<option value="${h}">${h}</option>`).join('')}</select></div>
      <div><label for="b-m">Motivo (opcional)</label><input id="b-m" type="text" maxlength="80" placeholder="Feriado, folga…"></div>
      <div style="justify-content:flex-end"><button class="btn" type="submit" id="b-ok">Bloquear</button></div>
    </form>
    ${(bl || []).length ? `<div class="scroll"><table class="tbl"><thead><tr><th>Data</th><th>Horário</th><th>Motivo</th><th></th></tr></thead><tbody>
      ${bl.map(b => `<tr><td data-label="Data">${dataBR(b.data)}</td><td data-label="Horário">${b.horario ? String(b.horario).slice(0, 5) : 'Dia inteiro'}</td><td data-label="Motivo">${e(b.motivo || '—')}</td><td><button class="btn o mini" data-del="${b.id}">Remover</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="vazio"><p>Nenhum bloqueio futuro.</p></div>'}`));
  $('fb').addEventListener('submit', async ev => {
    ev.preventDefault(); $('b-ok').disabled = true; $('err').hidden = true;
    const { error } = await sb.from('bloqueios').insert({ data: $('b-dt').value, horario: $('b-h').value || null, motivo: $('b-m').value.trim() || null });
    if (error) { $('err').textContent = /duplicate|unique/i.test(error.message) ? 'Esse bloqueio já existe.' : 'Não foi possível bloquear: ' + error.message; $('err').hidden = false; $('b-ok').disabled = false; return; }
    flash('Bloqueio adicionado.'); route();
  });
  $('adm').addEventListener('click', async ev => {
    const b = ev.target.closest('[data-del]'); if (!b) return;
    const { error } = await sb.from('bloqueios').delete().eq('id', b.dataset.del);
    flash(error ? 'Não foi possível remover o bloqueio.' : 'Bloqueio removido.', error ? 'err' : 'ok'); route();
  });
}

/* ============ roteador (troca de página instantânea, sem recarregar) ============ */
const routes = { inicio: vInicio, servicos: vServicos, sobre: vSobre, login: vLogin, cadastro: vCadastro, solicitar: vSolicitar, agendar: vAgendar, horarios: vHorarios, pedidos: vPedidos, admin: vAdmin };
let token = 0;
async function route() {
  const [name, qs] = location.hash.replace(/^#/, '').split('?');
  const key = routes[name] ? name : 'inicio';
  const t = ++token, live = () => t === token;
  let rendered = false;
  const timer = setTimeout(() => { if (live() && !rendered) app.innerHTML = '<div class="wrap page"><p class="note">Carregando…</p></div>'; }, 150);
  const draw = html => {
    if (!live()) return false;
    rendered = true; clearTimeout(timer);
    app.innerHTML = html; app.classList.remove('in'); void app.offsetWidth; app.classList.add('in');
    scrollTo(0, 0); return true;
  };
  const need = (admin = false) => {
    if (!user) { flash('Entre na sua conta para continuar.', 'err'); go('#login'); return false; }
    if (admin && user.perfil !== 'admin') { flash('Acesso restrito aos funcionários.', 'err'); go('#inicio'); return false; }
    return true;
  };
  renderHeader(key); showFlash();
  try { await routes[key]({ draw, need, live, params: new URLSearchParams(qs || '') }); }
  catch (err) { console.error(err); draw(aviso('Algo deu errado ao carregar esta página.', '#inicio', 'Voltar ao início')); }
  clearTimeout(timer);
  document.title = 'SpinLav — lavanderia profissional';
}

/* ============ inicialização ============ */
sb.auth.onAuthStateChange(ev => {
  if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') setTimeout(async () => { await refreshUser(); renderHeader(location.hash.replace(/^#/, '').split('?')[0]); }, 0);
});
async function boot() {
  const h = location.hash;
  if (/access_token|error_description/.test(h)) {          // retorno do link de confirmação do e-mail
    const p = new URLSearchParams(h.slice(1));
    await sb.auth.getSession();
    await refreshUser();
    if (p.get('error_description')) { flash('O link do e-mail é inválido ou expirou. Entre ou cadastre-se novamente.', 'err'); history.replaceState(null, '', '#login'); }
    else if (p.get('type') === 'signup') { flash('E-mail confirmado! Você já pode usar sua conta.'); history.replaceState(null, '', user ? '#servicos' : '#login'); }
    else if (user) { flash('Olá, ' + user.nome + '! Login feito com sucesso.'); history.replaceState(null, '', user.perfil === 'admin' ? '#admin' : '#servicos'); }
    else history.replaceState(null, '', '#login');
  } else await refreshUser();
  renderFooter(); addEventListener('hashchange', route); route();
}
renderHeader(); renderFooter();
boot();
