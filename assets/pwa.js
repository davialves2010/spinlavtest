// registra o service worker e guarda o evento de instalacao do app
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  });
}

let promptInstalacao = null;

window.spinlavPWA = {
  podeInstalar() {
    return promptInstalacao !== null;
  },
  async instalar() {
    if (!promptInstalacao) return;
    promptInstalacao.prompt();
    await promptInstalacao.userChoice;
    promptInstalacao = null;
  }
};

window.addEventListener('beforeinstallprompt', ev => {
  ev.preventDefault();
  promptInstalacao = ev;
  window.dispatchEvent(new Event('spinlav:pwa'));
});

window.addEventListener('appinstalled', () => {
  promptInstalacao = null;
  window.dispatchEvent(new Event('spinlav:pwa'));
});
