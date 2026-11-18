// trocar de tela = mudar o hash. O router escuta o evento hashchange.

export function ir(hash) {
  if (location.hash === hash) {
    window.dispatchEvent(new Event('hashchange'));
  } else {
    location.hash = hash;
  }
}

export function recarregar() {
  window.dispatchEvent(new Event('hashchange'));
}
