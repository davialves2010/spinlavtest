// botao flutuante de configuracoes: tema, tamanho do texto, contraste, animacoes e instalar o app
(() => {
  const CHAVE = 'spinlav:prefs';
  const PADRAO = { tema: 'auto', texto: 1, contraste: false, reduzir: false };
  const raiz = document.documentElement;
  const temaEscuroDoSistema = matchMedia('(prefers-color-scheme: dark)');

  function carregar() {
    try {
      return { ...PADRAO, ...JSON.parse(localStorage.getItem(CHAVE) || '{}') };
    } catch {
      return { ...PADRAO };
    }
  }

  function salvar(prefs) {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(prefs));
    } catch {}
  }

  let prefs = carregar();

  function aplicar() {
    if (prefs.tema === 'claro') raiz.dataset.theme = 'light';
    else if (prefs.tema === 'escuro') raiz.dataset.theme = 'dark';
    else delete raiz.dataset.theme;

    if (prefs.contraste) raiz.dataset.contrast = 'alto';
    else delete raiz.dataset.contrast;

    if (prefs.reduzir) raiz.dataset.motion = 'off';
    else delete raiz.dataset.motion;

    raiz.style.setProperty('--cfg-zoom', prefs.texto);

    const escuro = prefs.tema === 'escuro' || (prefs.tema === 'auto' && temaEscuroDoSistema.matches);
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', escuro ? '#0f1c2e' : '#ffffff');
  }

  temaEscuroDoSistema.addEventListener?.('change', aplicar);

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
  const estilo = document.createElement('style');
  estilo.textContent = css;
  document.head.appendChild(estilo);

  const ICONE_ENGRENAGEM = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const jaInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const botao = document.createElement('button');
  botao.className = 'cfg-fab';
  botao.type = 'button';
  botao.innerHTML = ICONE_ENGRENAGEM;
  botao.setAttribute('aria-label', 'Abrir configurações');
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', 'cfg-panel');

  const fundo = document.createElement('div');
  fundo.className = 'cfg-back';
  fundo.hidden = true;

  const painel = document.createElement('div');
  painel.className = 'cfg-panel';
  painel.id = 'cfg-panel';
  painel.hidden = true;
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-label', 'Configurações do site');

  function grupoDeBotoes(nome, opcoes) {
    const itens = opcoes.map(([valor, texto]) => `<button type="button" data-v="${valor}">${texto}</button>`).join('');
    return `<div class="cfg-seg" role="group" data-seg="${nome}">${itens}</div>`;
  }

  function interruptor(nome, titulo, descricao) {
    return `<div class="cfg-row"><div><span class="cfg-lbl" style="margin:0">${titulo}</span><small>${descricao}</small></div>
      <button type="button" class="cfg-sw" role="switch" data-sw="${nome}" aria-label="${titulo}"></button></div>`;
  }

  painel.innerHTML = `<h2>Configurações</h2>
    <div class="cfg-sec"><span class="cfg-lbl">Aparência</span>${grupoDeBotoes('tema', [['claro', 'Claro'], ['escuro', 'Escuro'], ['auto', 'Auto']])}</div>
    <div class="cfg-sec"><span class="cfg-lbl">Tamanho do texto</span>${grupoDeBotoes('texto', [['1', 'A'], ['1.1', 'A+'], ['1.2', 'A++']])}</div>
    <div class="cfg-sec">${interruptor('contraste', 'Alto contraste', 'Bordas e textos mais marcados')}</div>
    <div class="cfg-sec">${interruptor('reduzir', 'Reduzir animações', 'Menos movimento nas telas')}</div>
    <div class="cfg-sec" id="cfg-app"></div>
    <div class="cfg-sec">
      <button type="button" class="cfg-act" id="cfg-upd">Buscar atualização do site</button>
      <button type="button" class="cfg-act" id="cfg-rst">Restaurar padrões</button>
    </div>`;

  document.body.append(fundo, botao, painel);

  // marca no painel o que esta selecionado
  function atualizarPainel() {
    painel.querySelectorAll('[data-seg="tema"] button').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.v === prefs.tema));
    });
    painel.querySelectorAll('[data-seg="texto"] button').forEach(b => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.v) === Number(prefs.texto)));
    });
    painel.querySelector('[data-sw="contraste"]').setAttribute('aria-checked', String(prefs.contraste));
    painel.querySelector('[data-sw="reduzir"]').setAttribute('aria-checked', String(prefs.reduzir));
  }

  // secao de instalar o app (some se ja estiver instalado)
  function atualizarSecaoApp() {
    const caixa = painel.querySelector('#cfg-app');
    if (jaInstalado()) {
      caixa.hidden = true;
      return;
    }

    if (window.spinlavPWA?.podeInstalar()) {
      caixa.hidden = false;
      caixa.innerHTML = '<span class="cfg-lbl">Aplicativo</span><button type="button" class="cfg-act main" id="cfg-inst">Instalar app no dispositivo</button>';
    } else if (ehIOS) {
      caixa.hidden = false;
      caixa.innerHTML = '<span class="cfg-lbl">Aplicativo</span><p class="cfg-hint">No iPhone: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>';
    } else {
      caixa.hidden = true;
    }
  }

  function mudar(chave, valor) {
    prefs[chave] = valor;
    salvar(prefs);
    aplicar();
    atualizarPainel();
  }

  painel.addEventListener('click', async ev => {
    const alvo = ev.target.closest('button');
    if (!alvo) return;

    const grupo = alvo.closest('[data-seg]')?.dataset.seg;
    if (grupo === 'tema') return mudar('tema', alvo.dataset.v);
    if (grupo === 'texto') return mudar('texto', Number(alvo.dataset.v));

    const interruptorNome = alvo.dataset.sw;
    if (interruptorNome) return mudar(interruptorNome, !prefs[interruptorNome]);

    if (alvo.id === 'cfg-inst') {
      await window.spinlavPWA?.instalar();
      atualizarSecaoApp();
    }

    if (alvo.id === 'cfg-rst') {
      prefs = { ...PADRAO };
      salvar(prefs);
      aplicar();
      atualizarPainel();
    }

    // apaga o service worker e o cache pra buscar a versao nova do site
    if (alvo.id === 'cfg-upd') {
      alvo.disabled = true;
      alvo.textContent = 'Atualizando...';
      try {
        const registros = await navigator.serviceWorker?.getRegistrations?.() || [];
        await Promise.all(registros.map(r => r.unregister()));
        if (window.caches) {
          const chaves = await caches.keys();
          await Promise.all(chaves.map(c => caches.delete(c)));
        }
      } catch {}
      location.reload();
    }
  });

  function abrir(aberto) {
    painel.hidden = !aberto;
    fundo.hidden = !aberto;
    botao.setAttribute('aria-expanded', String(aberto));
    botao.setAttribute('aria-label', aberto ? 'Fechar configurações' : 'Abrir configurações');
    if (aberto) {
      atualizarSecaoApp();
      atualizarPainel();
      painel.querySelector('[data-seg="tema"] button[aria-pressed="true"]')?.focus();
    }
  }

  botao.addEventListener('click', () => abrir(painel.hidden));
  fundo.addEventListener('click', () => abrir(false));

  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && !painel.hidden) {
      abrir(false);
      botao.focus();
    }
  });

  window.addEventListener('spinlav:pwa', () => {
    if (!painel.hidden) atualizarSecaoApp();
  });

  aplicar();
  atualizarPainel();
})();
