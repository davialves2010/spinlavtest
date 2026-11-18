// pecas compartilhadas pelas abas do painel
import { $, escapar, dataBR, linkWhatsapp, STATUS } from '../../util.js';
import { supabase } from '../../supabase.js';
import { estado, avisar } from '../../estado.js';
import { recarregar } from '../../navegacao.js';

export function mensagemWhatsapp(pedido, agendamento) {
  const primeiroNome = String(pedido.clientes?.nome || '').split(' ')[0];
  const hora = agendamento ? String(agendamento.horario).slice(0, 5) : '';

  const frases = {
    pendente: 'Precisamos confirmar o agendamento do seu pedido.',
    em_andamento: 'Suas peças já estão sendo cuidadas por aqui.',
    cancelado: 'Seu pedido foi cancelado.'
  };

  if (agendamento) {
    const acao = agendamento.tipo === 'coleta' ? 'recolhimento das suas peças' : 'seu atendimento';
    frases.agendado = `Confirmamos o ${acao} em ${dataBR(agendamento.data_agendada)} às ${hora}.`;
  } else {
    frases.agendado = 'Seu pedido está agendado.';
  }

  frases.concluido = agendamento?.tipo === 'coleta'
    ? 'Seu pedido está pronto! Vamos combinar o melhor horário para a entrega?'
    : 'Seu pedido está pronto para retirada na lavanderia!';

  const saudacao = primeiroNome ? ', ' + primeiroNome : '';
  return `Olá${saudacao}! Aqui é da SpinLav, sobre o seu pedido #${pedido.id}. ${frases[pedido.status] || ''}`;
}

export function botaoWhatsapp(pedido, agendamento) {
  const telefone = agendamento?.telefone || pedido.clientes?.telefone;
  const link = linkWhatsapp(telefone, mensagemWhatsapp(pedido, agendamento));
  if (!link) return '<small>sem telefone</small>';
  return `<a class="btn zap mini" href="${escapar(link)}" target="_blank" rel="noopener">WhatsApp</a>`;
}

// select de status + botoes salvar e marcar pago
export function seletorStatus(pedido) {
  const opcoes = Object.entries(STATUS).map(([chave, nome]) =>
    `<option value="${chave}" ${pedido.status === chave ? 'selected' : ''}>${nome}</option>`
  ).join('');

  return `<select id="st-${pedido.id}" aria-label="Status do pedido ${pedido.id}">${opcoes}</select>
    <button class="btn mini" data-salvar="${pedido.id}">Salvar</button>
    <button class="btn o mini" data-pago="${pedido.id}" data-v="${pedido.pago ? 0 : 1}">${pedido.pago ? 'Desfazer pago' : 'Marcar pago'}</button>`;
}

async function salvarStatus(id) {
  const { error } = await supabase.from('pedidos').update({ status: $('st-' + id).value }).eq('id', id);
  avisar(error ? 'Não foi possível atualizar o status.' : 'Status atualizado.', error ? 'err' : 'ok');
  recarregar();
}

// clique nos botoes de status e de pagamento (usado na agenda e na lista de pedidos)
export async function cliqueNosPedidos(ev) {
  const botaoSalvar = ev.target.closest('[data-salvar]');
  if (botaoSalvar) return salvarStatus(botaoSalvar.dataset.salvar);

  const botaoPago = ev.target.closest('[data-pago]');
  if (!botaoPago) return;

  botaoPago.disabled = true;
  const { error } = await supabase.rpc('marcar_pago', {
    p_pedido: Number(botaoPago.dataset.pago),
    p_pago: botaoPago.dataset.v === '1'
  });
  avisar(error ? 'Não foi possível atualizar o pagamento.' : 'Pagamento atualizado.', error ? 'err' : 'ok');
  recarregar();
}

export function abasDoPainel(ativa) {
  const abas = [
    ['agenda', 'Agenda do dia'], ['pedidos', 'Todos os pedidos'], ['clientes', 'Clientes'],
    ['servicos', 'Serviços'], ['bloqueios', 'Bloqueios'], ['frete', 'Frete']
  ];
  if (estado.usuario.dono) abas.push(['equipe', 'Equipe'], ['registro', 'Registro']);

  const links = abas.map(([chave, nome]) =>
    `<a class="tab${ativa === chave ? ' on' : ''}" href="#admin?aba=${chave}">${nome}</a>`
  ).join('');
  return `<div class="tabs">${links}</div>`;
}

export function moldura(aba, conteudo) {
  return `<div class="wrap page">
    <div class="head"><div class="eyebrow">Área do funcionário</div><h1>Painel da lavanderia</h1></div>
    ${abasDoPainel(aba)}
    <div class="card" id="adm">${conteudo}</div></div>`;
}
