/* SpinLav — registro do service worker e instalação do app (o botão fica em Configurações) */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(console.error));
}

let evento = null;
window.spinlavPWA = {
  podeInstalar: () => !!evento,
  instalar: async () => {
    if (!evento) return;
    evento.prompt();
    await evento.userChoice;
    evento = null;
  }
};

addEventListener('beforeinstallprompt', ev => {
  ev.preventDefault(); evento = ev;
  dispatchEvent(new Event('spinlav:pwa'));
});
addEventListener('appinstalled', () => { evento = null; dispatchEvent(new Event('spinlav:pwa')); });
