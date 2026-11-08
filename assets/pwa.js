/* SpinLav — registro do service worker + botão "Instalar app" */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(console.error));
}

let prompt = null;
const instalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function botao() {
  if (document.getElementById('pwa-install') || instalado()) return;
  const b = document.createElement('button');
  b.id = 'pwa-install'; b.type = 'button'; b.textContent = 'Instalar app';
  b.style.cssText = 'position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:50;padding:12px 20px;border-radius:99px;border:0;background:#1c3d73;color:#fff;font:600 15px Poppins,system-ui,sans-serif;box-shadow:0 8px 22px rgba(16,40,74,.35);cursor:pointer';
  b.addEventListener('click', async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    prompt = null; b.remove();
  });
  document.body.appendChild(b);
}

addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); prompt = ev; botao(); });
addEventListener('appinstalled', () => { prompt = null; document.getElementById('pwa-install')?.remove(); });
