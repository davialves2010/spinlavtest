// funcoes pequenas usadas em varias telas

export const $ = id => document.getElementById(id);

export const STATUS = {
  pendente: 'Pendente',
  agendado: 'Agendado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
  cancelado: 'Cancelado'
};

export const PAGAMENTO = {
  pix: 'Pix',
  cartao: 'Cartão (maquininha)',
  dinheiro: 'Dinheiro'
};

// colunas do agendamento que o site precisa ler
export const COLUNAS_AGENDAMENTO =
  'data_agendada,horario,tipo,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf,forma_pagamento,frete';

// troca caracteres especiais pra nao quebrar o html (evita XSS)
export function escapar(texto) {
  const trocas = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(texto ?? '').replace(/[&<>"']/g, c => trocas[c]);
}

export function dinheiro(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// '2026-11-17' vira '17/11/2026'
export function dataBR(data) {
  return data.split('-').reverse().join('/');
}

// data de hoje no fuso do usuario, formato yyyy-mm-dd
export function hoje() {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function somarDias(data, dias) {
  const d = new Date(data + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function formatarTempo(minutos) {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return resto + ' min';
  return resto ? `${horas}h ${resto}min` : `${horas}h`;
}

// mesma conta que o gatilho do banco faz
export function calcularTempo(servico, quantidade) {
  return servico.tempo_base_min + quantidade * servico.tempo_peca_min;
}

export function somenteNumeros(texto) {
  return String(texto || '').replace(/\D/g, '');
}

export function formatarCep(cep) {
  const d = somenteNumeros(cep).slice(0, 8);
  return d.length > 5 ? d.slice(0, 5) + '-' + d.slice(5) : d;
}

export function formatarTelefone(telefone) {
  const d = somenteNumeros(telefone).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function linkWhatsapp(telefone, mensagem) {
  let numero = somenteNumeros(telefone);
  if (!numero) return '';
  if (numero.length <= 11) numero = '55' + numero;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

export function textoEndereco(a) {
  if (!a?.logradouro) return '';
  const comp = a.complemento ? ' - ' + a.complemento : '';
  return `${a.logradouro}, ${a.numero}${comp} - ${a.bairro}, ${a.cidade}/${a.uf}`;
}

// campo vazio vira null, virgula vira ponto
export function numeroOuNulo(valor) {
  if (String(valor).trim() === '') return null;
  return Number(String(valor).replace(',', '.'));
}
