/* SpinLav — botão flutuante de configurações (tema, texto, contraste, animações, app) */
(() => {
  const KEY = 'spinlav:prefs';
  const DEF = { tema: 'auto', texto: 1, contraste: false, reduzir: false };
  const root = document.documentElement;
  const mq = matchMedia('(prefers-color-scheme: dark)');

  const load = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEF }; } };
  const save = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {} };
  let prefs = load();

  /* ---------- aplicar preferências ---------- */
  function apply() {
    if (prefs.tema === 'claro') root.dataset.theme = 'light';
    else if (prefs.tema === 'escuro') root.dataset.theme = 'dark';
    else delete root.dataset.theme;
    prefs.contraste ? root.dataset.contrast = 'alto' : delete root.dataset.contrast;
    prefs.reduzir ? root.dataset.motion = 'off' : delete root.dataset.motion;
    root.style.setProperty('--cfg-zoom', prefs.texto);
    const escuro = prefs.tema === 'escuro' || (prefs.tema === 'auto' && mq.matches);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#0f1c2e' : '#ffffff');
  }
  mq.addEventListener?.('change', apply);

  /* ---------- estilos ---------- */
  const css = `
#hdr,#flash,#app,#ftr{zoom:var(--cfg-zoom,1)}
:root[data-motion="off"] *,:root[data-motion="off"] *::before,:root[data-motion="off"] *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
html:root[data-contrast="alto"]{--txt:var(--ink);--line:#5b7390}
html:root[data-contrast="alto"] a:not(.btn){text-decoration:underline}
.cfg-fab{position:fixed;right:12px;top:58%;z-index:60;width:48px;height:48px;border-radius:50%;border:2px solid var(--line,#d3e3f0);background:var(--card,#fff);color:var(--brand,#1c3d73);display:grid;place-items:center;cursor:pointer;padding:0;box-shadow:0 8px 22px rgba(16,40,74,.25);transition:transform .25s,box-shadow .2s}
.cfg-fab:hover{box-shadow:0 10px 26px rgba(16,40,74,.35)}
.cfg-fab[aria-expanded="true"]{transform:rotate(90deg)}
.cfg-fab svg{width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.cfg-fab:focus-visible,.cfg-panel button:focus-visible{outline:3px solid var(--brand,#1c3d73);outline-offset:2px}
.cfg-back{position:fixed;inset:0;z-index:58;background:transparent}
.cfg-back[hidden],.cfg-panel[hidden]{display:none}
.cfg-panel{position:fixed;right:70px;top:50%;transform:translateY(-50%);z-index:59;width:min(330px,calc(100vw - 90px));max-height:calc(100vh - 40px);overflow:auto;background:var(--card,#fff);color:var(--txt,#2f4358);border:1px solid var(--line,#d3e3f0);border-radius:20px;box-shadow:0 14px 40px rgba(16,40,74,.28);padding:20px;font:400 15px/1.45 'DM Sans',system-ui,sans-serif;animation:cfgIn .18s ease}
@keyframes cfgIn{from{opacity:0;transform:translateY(-48%)}to{opacity:1;transform:translateY(-50%)}}
.cfg-panel h2{font:600 18px 'Poppins',system-ui,sans-serif;color:var(--ink,#10284a);margin:0 0 14px}
.cfg-sec{padding:12px 0;border-top:1px solid var(--line,#d3e3f0)}
.cfg-sec:first-of-type{border-top:0;padding-top:0}
.cfg-lbl{display:block;font-weight:600;font-size:14px;color:var(--ink,#10284a);margin-bottom:8px}
.cfg-seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:6px}
.cfg-seg button{font:600 14px 'DM Sans',system-ui,sans-serif;min-height:42px;padding:8px 6px;border-radius:10px;border:2px solid var(--line,#d3e3f0);background:var(--pale,#eef5fc);color:var(--ink,#10284a);cursor:pointer}
.cfg-seg button[aria-pressed="true"]{background:var(--brand,#1c3d73);border-color:var(--brand,#1c3d73);color:#fff}
.cfg-row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.cfg-row small{display:block;font-size:13px;opacity:.85}
.cfg-sw{flex:none;width:50px;height:30px;border-radius:99px;border:2px solid var(--line,#d3e3f0);background:var(--pale,#eef5fc);position:relative;cursor:pointer;padding:0;transition:background .2s}
.cfg-sw::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:var(--ink,#10284a);transition:transform .2s}
.cfg-sw[aria-checked="true"]{background:var(--brand,#1c3d73);border-color:var(--brand,#1c3d73)}
.cfg-sw[aria-checked="true"]::after{transform:translateX(20px);background:#fff}
.cfg-act{width:100%;min-height:44px;margin-top:8px;font:600 14px 'Poppins',system-ui,sans-serif;border-radius:10px;border:2px solid var(--brand,#1c3d73);background:transparent;color:var(--brand,#1c3d73);cursor:pointer}
.cfg-act.main{background:var(--brand,#1c3d73);color:#fff}
.cfg-act:first-of-type{margin-top:0}
.cfg-hint{margin:0;font-size:13px;background:var(--mint,#e0f4ea);border-radius:10px;padding:10px 12px;color:var(--txt,#2f4358)}
@media(max-width:560px){
  .cfg-panel{left:12px;right:12px;width:auto;top:auto;bottom:12px;transform:none;max-height:78vh;animation-name:cfgUp}
  @keyframes cfgUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- interface ---------- */
  const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const fab = document.createElement('button');
  fab.className = 'cfg-fab'; fab.type = 'button'; fab.innerHTML = GEAR;
  fab.setAttribute('aria-label', 'Abrir configurações'); fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'cfg-panel');

  const back = document.createElement('div'); back.className = 'cfg-back'; back.hidden = true;
  const panel = document.createElement('div');
  panel.className = 'cfg-panel'; panel.id = 'cfg-panel'; panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Configurações do site');

  const seg = (name, opts) => `<div class="cfg-seg" role="group" data-seg="${name}">${opts.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join('')}</div>`;
  const sw = (name, titulo, desc) => `<div class="cfg-row"><div><span class="cfg-lbl" style="margin:0">${titulo}</span><small>${desc}</small></div><button type="button" class="cfg-sw" role="switch" data-sw="${name}" aria-label="${titulo}"></button></div>`;

  panel.innerHTML = `<h2>Configurações</h2>
    <div class="cfg-sec"><span class="cfg-lbl">Aparência</span>${seg('tema', [['claro', '☀️ Claro'], ['escuro', '🌙 Escuro'], ['auto', 'Auto']])}</div>
    <div class="cfg-sec"><span class="cfg-lbl">Tamanho do texto</span>${seg('texto', [['1', 'A'], ['1.1', 'A+'], ['1.2', 'A++']])}</div>
    <div class="cfg-sec">${sw('contraste', 'Alto contraste', 'Bordas e textos mais marcados')}</div>
    <div class="cfg-sec">${sw('reduzir', 'Reduzir animações', 'Menos movimento nas telas')}</div>
    <div class="cfg-sec" id="cfg-app"></div>
    <div class="cfg-sec"><button type="button" class="cfg-act" id="cfg-upd">Buscar atualização do site</button><button type="button" class="cfg-act" id="cfg-rst">Restaurar padrões</button></div>`;

  document.body.append(back, fab, panel);

  function sync() {
    panel.querySelectorAll('[data-seg="tema"] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === prefs.tema)));
    panel.querySelectorAll('[data-seg="texto"] button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.v) === Number(prefs.texto))));
    panel.querySelector('[data-sw="contraste"]').setAttribute('aria-checked', String(prefs.contraste));
    panel.querySelector('[data-sw="reduzir"]').setAttribute('aria-checked', String(prefs.reduzir));
  }
  function appSec() {
    const box = panel.querySelector('#cfg-app');
    if (standalone()) { box.hidden = true; return; }
    const pwa = window.spinlavPWA;
    if (pwa?.podeInstalar()) { box.hidden = false; box.innerHTML = '<span class="cfg-lbl">Aplicativo</span><button type="button" class="cfg-act main" id="cfg-inst">Instalar app no dispositivo</button>'; }
    else if (isiOS) { box.hidden = false; box.innerHTML = '<span class="cfg-lbl">Aplicativo</span><p class="cfg-hint">No iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>'; }
    else box.hidden = true;
  }
  const set = (k, v) => { prefs[k] = v; save(prefs); apply(); sync(); };

  panel.addEventListener('click', async ev => {
    const b = ev.target.closest('button'); if (!b) return;
    const g = b.closest('[data-seg]')?.dataset.seg;
    if (g === 'tema') return set('tema', b.dataset.v);
    if (g === 'texto') return set('texto', Number(b.dataset.v));
    const s = b.dataset.sw;
    if (s) return set(s, !prefs[s]);
    if (b.id === 'cfg-inst') { await window.spinlavPWA?.instalar(); appSec(); }
    if (b.id === 'cfg-rst') { prefs = { ...DEF }; save(prefs); apply(); sync(); }
    if (b.id === 'cfg-upd') {
      b.disabled = true; b.textContent = 'Atualizando…';
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
        await Promise.all(regs.map(r => r.unregister()));
        if (window.caches) await Promise.all((await caches.keys()).map(k => caches.delete(k)));
      } catch {}
      location.reload();
    }
  });

  function abrir(o) {
    panel.hidden = back.hidden = !o;
    fab.setAttribute('aria-expanded', String(o));
    fab.setAttribute('aria-label', o ? 'Fechar configurações' : 'Abrir configurações');
    if (o) { appSec(); sync(); panel.querySelector('[data-seg="tema"] button[aria-pressed="true"]')?.focus(); }
  }
  fab.addEventListener('click', () => abrir(panel.hidden));
  back.addEventListener('click', () => abrir(false));
  addEventListener('keydown', ev => { if (ev.key === 'Escape' && !panel.hidden) { abrir(false); fab.focus(); } });
  addEventListener('spinlav:pwa', () => { if (!panel.hidden) appSec(); });

  apply(); sync();
})();
