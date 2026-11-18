// pedacos de html e funcoes usadas em varias telas
import {
  $, escapar, dinheiro, dataBR, formatarCep, formatarTelefone,
  textoEndereco, PAGAMENTO
} from '../util.js';

export const ICONES = {
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

// opcoes de icone que o funcionario pode escolher ao criar um servico
export const ICONES_SERVICO = {
  wash: 'Máquina de lavar',
  dry: 'Secagem',
  iron: 'Passadoria',
  shirt: 'Camisa'
};

// fotos dos servicos, ficam na pasta img/ da raiz do site
export const FOTOS_SERVICO = {
  wash: 'img/lavagem.jpg',
  dry: 'img/secagem.jpg',
  iron: 'img/secadoria.jpg',
  shirt: 'img/delicadas.jpg'
};

export function cartao(icone, titulo, descricao, href, rotulo = 'Saiba mais') {
  const botao = href ? `<a class="btn sm" href="${escapar(href)}">${escapar(rotulo)}</a>` : '';
  const foto = FOTOS_SERVICO[icone];
  const topo = foto
    ? `<img class="foto" src="${foto}" alt="${escapar(titulo)}" loading="lazy">`
    : `<div class="ico"><svg viewBox="0 0 24 24">${ICONES[icone] || ICONES.wash}</svg></div>`;
  return `<article class="card">
    ${topo}
    <h3>${escapar(titulo)}</h3><p>${escapar(descricao)}</p>${botao}</article>`;
}

// barra de passos: Cadastro > Pedido > Agendamento > Confirmacao
export function etapas(atual) {
  const nomes = ['Cadastro', 'Pedido', 'Agendamento', 'Confirmação'];
  const itens = nomes.map((nome, i) => {
    const numero = i + 1;
    let classe = '';
    if (numero < atual) classe = 'done';
    else if (numero === atual) classe = 'on';
    return `<li class="${classe}"><b>${numero}</b>${nome}</li>`;
  });
  return `<ol class="steps">${itens.join('')}</ol>`;
}

export function aviso(mensagem, href, rotulo) {
  return `<div class="wrap page"><div class="card vazio"><p>${mensagem}</p><a class="btn" href="${href}">${rotulo}</a></div></div>`;
}

// o supabase devolve o agendamento como objeto ou como lista de 1 item
export function agendamentoDoPedido(pedido) {
  const ag = pedido.agendamentos;
  return Array.isArray(ag) ? ag[0] : ag;
}

export function totalTexto(pedido) {
  const ag = agendamentoDoPedido(pedido);
  const frete = Number(ag?.frete || 0);
  const total = dinheiro(Number(pedido.valor_estimado) + frete);
  if (!ag) return total;

  const textoFrete = frete ? 'com frete ' + dinheiro(frete) : 'sem frete';
  const forma = PAGAMENTO[ag.forma_pagamento] || '-';
  const pago = pedido.pago ? ' · pago' : '';
  return `${total}<br><small>${textoFrete} · ${forma}${pago}</small>`;
}

export function quandoTexto(pedido, curto, comEndereco) {
  const ag = agendamentoDoPedido(pedido);
  if (!ag) return '-';

  const ehColeta = ag.tipo === 'coleta';
  let modalidade;
  if (ehColeta) modalidade = curto ? 'Coleta' : 'Coleta em casa';
  else modalidade = curto ? 'Balcão' : 'Na lavanderia';

  const endereco = comEndereco && ehColeta && textoEndereco(ag)
    ? `<br><small>${escapar(textoEndereco(ag))}</small>`
    : '';

  return `${dataBR(ag.data_agendada)} às ${String(ag.horario).slice(0, 5)}<br><small>${modalidade}</small>${endereco}`;
}

// bloco de campos de endereco (usado no perfil e no agendamento)
export function camposEndereco(valores, titulo, id = '') {
  const v = campo => escapar(valores?.[campo] || '');
  return `<fieldset class="end" ${id ? `id="${id}"` : ''} aria-label="${titulo}">
    <div class="eyebrow" style="margin:0">${titulo}</div>
    <label for="cep">CEP</label>
    <input id="cep" type="text" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000" value="${escapar(formatarCep(valores?.cep))}">
    <p class="note" id="cepmsg" hidden></p>
    <label for="rua">Rua / Avenida</label>
    <input id="rua" type="text" autocomplete="address-line1" maxlength="120" value="${v('logradouro')}">
    <div class="duo">
      <div><label for="num">Número</label><input id="num" type="text" maxlength="10" autocomplete="off" value="${v('numero')}"></div>
      <div><label for="comp">Complemento</label><input id="comp" type="text" maxlength="60" autocomplete="address-line2" placeholder="Apto, bloco... (opcional)" value="${v('complemento')}"></div>
    </div>
    <label for="bai">Bairro</label>
    <input id="bai" type="text" maxlength="80" value="${v('bairro')}">
    <div class="duo uf">
      <div><label for="cid">Cidade</label><input id="cid" type="text" maxlength="80" autocomplete="address-level2" value="${v('cidade')}"></div>
      <div><label for="uf">UF</label><input id="uf" type="text" maxlength="2" autocomplete="address-level1" style="text-transform:uppercase" value="${v('uf')}"></div>
    </div>
  </fieldset>`;
}

// quando o CEP chega a 8 digitos, busca o endereco no ViaCEP
export function ligarBuscaCep(aindaAtual, depois) {
  $('cep').addEventListener('input', async () => {
    const digitos = $('cep').value.replace(/\D/g, '').slice(0, 8);
    $('cep').value = formatarCep(digitos);
    const msg = $('cepmsg');

    if (digitos.length !== 8) {
      msg.hidden = true;
      return;
    }

    msg.textContent = 'Buscando endereço...';
    msg.hidden = false;

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`);
      const r = await resposta.json();
      if (!aindaAtual()) return;

      if (r.erro) {
        msg.textContent = 'CEP não encontrado. Preencha o endereço manualmente.';
        return;
      }
      if (r.logradouro) $('rua').value = r.logradouro;
      if (r.bairro) $('bai').value = r.bairro;
      $('cid').value = r.localidade || '';
      $('uf').value = r.uf || '';
      msg.hidden = true;
      if (depois) depois();
      $('num').focus();
    } catch {
      if (aindaAtual()) msg.textContent = 'Não foi possível buscar o CEP. Preencha o endereço manualmente.';
    }
  });
}

export function ligarMascaraTelefone() {
  $('tel').addEventListener('input', () => {
    $('tel').value = formatarTelefone($('tel').value);
  });
}
