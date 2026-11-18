import {
  $, escapar, dinheiro, dataBR, hoje, formatarTempo, calcularTempo, formatarTelefone,
  somenteNumeros, PAGAMENTO, STATUS, COLUNAS_AGENDAMENTO
} from '../util.js';
import { supabase } from '../supabase.js';
import { estado, avisar, carregarServicos } from '../estado.js';
import { ir, recarregar } from '../navegacao.js';
import { buscarHorarios, previsaoConclusao, htmlHorarios } from '../disponibilidade.js';
import { PIX_CHAVE } from '../negocio.js';
import {
  etapas, aviso, camposEndereco, ligarBuscaCep, ligarMascaraTelefone, totalTexto, quandoTexto
} from './comum.js';

// funcionario nao faz pedido: manda de volta pro painel
function barrarFuncionario() {
  if (estado.usuario.perfil !== 'admin') return false;
  avisar('Funcionários não fazem pedidos. Use o painel.', 'err');
  ir('#admin');
  return true;
}

// cada pedido tem UM servico e uma quantidade de pecas
export async function telaSolicitar({ desenhar, exigirLogin, aindaAtual, params }) {
  if (!exigirLogin()) return;
  if (barrarFuncionario()) return;

  const servicos = await carregarServicos();
  if (!aindaAtual()) return;

  const preSelecionado = Number(params.get('servico') || 0);
  const opcoes = servicos.map(s => {
    const marcado = s.id === preSelecionado ? 'selected' : '';
    return `<option value="${s.id}" ${marcado}>${escapar(s.nome)} - ${dinheiro(s.preco_peca)}/peça</option>`;
  }).join('');

  desenhar(`<div class="wrap page">
    <div class="head"><div class="eyebrow">Novo pedido</div><h1>Solicitar serviço</h1></div>
    <div class="form">${etapas(2)}
    <form class="card" id="f">
      <p class="alert err" id="err" hidden></p>
      <label for="serv">Serviço / tipo de lavagem</label>
      <select id="serv" required><option value="">Selecione...</option>${opcoes}</select>
      <label for="qtd">Quantidade de peças</label>
      <input id="qtd" type="number" min="1" max="200" value="1" required>
      <label for="obs">Observações (opcional)</label>
      <textarea id="obs" maxlength="500"></textarea>
      <div class="resumo" id="prev" hidden></div>
      <p class="note">Cada pedido tem um tipo de lavagem. Para lavar outras peças com um serviço diferente, faça um novo pedido. O valor final é confirmado pela lavanderia após a conferência das peças. No próximo passo você escolhe data e horário.</p>
      <button class="btn fit" type="submit" id="b">Registrar pedido e agendar</button>
    </form></div></div>`);

  function mostrarEstimativa() {
    const servico = servicos.find(s => s.id === Number($('serv').value));
    const qtd = Number($('qtd').value) || 0;
    const caixa = $('prev');

    if (!servico || qtd < 1) {
      caixa.hidden = true;
      return;
    }
    caixa.hidden = false;
    caixa.innerHTML = `<span>Tempo estimado: <strong>${formatarTempo(calcularTempo(servico, qtd))}</strong></span>`
      + `<span>Valor estimado: <strong>${dinheiro(qtd * servico.preco_peca)}</strong></span>`;
  }

  $('serv').addEventListener('change', mostrarEstimativa);
  $('qtd').addEventListener('input', mostrarEstimativa);
  mostrarEstimativa();

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;

    const { data, error } = await supabase.from('pedidos').insert({
      cliente_id: estado.usuario.id,
      servico_id: Number($('serv').value),
      quantidade: Number($('qtd').value),
      observacoes: $('obs').value.trim() || null
    }).select('id').single();

    if (error) {
      $('err').textContent = 'Não foi possível registrar o pedido: ' + error.message;
      $('err').hidden = false;
      $('b').disabled = false;
      return;
    }
    ir('#agendar?pedido=' + data.id);
  });
}

// agendar (ou reagendar) o pedido: data, horario, modalidade, endereco e pagamento
export async function telaAgendar({ desenhar, exigirLogin, aindaAtual, params }) {
  if (!exigirLogin()) return;
  if (barrarFuncionario()) return;

  const usuario = estado.usuario;
  const pedidoId = Number(params.get('pedido') || 0);
  const reagendando = params.get('reagendar') === '1';

  const [{ data: pedido }, { data: perfil }, { data: atual }] = await Promise.all([
    supabase.from('pedidos').select('*, servicos(nome)').eq('id', pedidoId).eq('cliente_id', usuario.id).maybeSingle(),
    supabase.from('clientes').select('cep,logradouro,numero,complemento,bairro,cidade,uf,telefone').eq('id', usuario.id).maybeSingle(),
    reagendando
      ? supabase.from('agendamentos').select(COLUNAS_AGENDAMENTO).eq('pedido_id', pedidoId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);
  if (!aindaAtual()) return;

  if (!pedido) return desenhar(aviso('Pedido não encontrado.', '#solicitar', 'Fazer um pedido'));

  const statusEsperado = reagendando ? 'agendado' : 'pendente';
  if (pedido.status !== statusEsperado) {
    const msg = reagendando
      ? 'Este pedido não pode mais ser reagendado.'
      : 'Este pedido não está aguardando agendamento.';
    return desenhar(aviso(msg, '#pedidos', 'Ver meus pedidos'));
  }

  // dados do agendamento atual (se houver) por cima dos dados do perfil
  const preenchidos = Object.fromEntries(Object.entries(atual || {}).filter(([, valor]) => valor != null));
  const dados = { ...(perfil || {}), ...preenchidos };
  const modalidade = atual?.tipo || 'coleta';
  const pagamentoTravado = reagendando && pedido.pago;

  const opcoesPagamento = Object.entries(PAGAMENTO).map(([chave, nome]) => {
    const marcado = (dados.forma_pagamento || 'pix') === chave ? 'selected' : '';
    return `<option value="${chave}" ${marcado}>${nome}</option>`;
  }).join('');

  const avisoAtual = reagendando && atual
    ? `<p class="note">Agendamento atual: <strong>${dataBR(atual.data_agendada)} às ${String(atual.horario).slice(0, 5)}</strong>. Escolha o novo dia e horário abaixo.</p>`
    : '';

  desenhar(`<div class="wrap page">
    <div class="head">
      <div class="eyebrow">Pedido #${pedido.id}</div>
      <h1>${reagendando ? 'Reagendar pedido' : 'Agendar data e horário'}</h1>
    </div>
    <div class="form">${reagendando ? '' : etapas(3)}
    <form class="card" id="f">
      <div class="resumo">
        <span>Serviço: <strong>${escapar(pedido.servicos.nome)}</strong></span>
        <span>Peças: <strong>${pedido.quantidade}</strong></span>
        <span>Duração estimada: <strong>${formatarTempo(pedido.tempo_estimado_min)}</strong></span>
        <span>Valor: <strong>${dinheiro(pedido.valor_estimado)}</strong></span>
      </div>
      ${avisoAtual}
      <p class="alert err" id="err" hidden></p>
      <label for="tipo">Modalidade do atendimento</label>
      <select id="tipo">
        <option value="coleta" ${modalidade === 'coleta' ? 'selected' : ''}>Coleta em casa</option>
        <option value="balcao" ${modalidade === 'balcao' ? 'selected' : ''}>Levar à lavanderia</option>
      </select>
      <label for="tel">WhatsApp para contato</label>
      <input id="tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="15" placeholder="(11) 90000-0000" required value="${escapar(formatarTelefone(dados.telefone))}">
      ${camposEndereco(dados, 'Endereço da coleta', 'end')}
      <label for="pg">Forma de pagamento</label>
      <select id="pg" ${pagamentoTravado ? 'disabled' : ''}>${opcoesPagamento}</select>
      <p class="note">${pagamentoTravado
        ? 'Este pedido já foi pago, então a forma de pagamento não pode mais ser alterada.'
        : 'O pagamento é feito na entrega ou na retirada das peças, na forma escolhida.'}</p>
      <div class="resumo" id="fr" hidden></div>
      <label for="dt">${reagendando ? 'Nova data' : 'Data'}</label>
      <input id="dt" type="date" min="${hoje()}" required>
      <label>Horários</label>
      <div id="slots"><p class="note">Escolha uma data para consultar os horários disponíveis.</p></div>
      <div class="resumo" id="conc" hidden></div>
      <button class="btn fit" type="submit" id="b" disabled>${reagendando ? 'Confirmar novo horário' : 'Confirmar agendamento'}</button>
    </form></div></div>`);

  // o endereco so aparece na coleta em casa
  const camposObrigatorios = ['cep', 'rua', 'num', 'bai', 'cid', 'uf'];
  function ajustarModalidade() {
    const coleta = $('tipo').value === 'coleta';
    $('end').hidden = !coleta;
    camposObrigatorios.forEach(id => { $(id).required = coleta; });
  }

  // frete calculado no banco (rpc calcular_frete) conforme cidade e bairro
  const valorPedido = Number(pedido.valor_estimado) || 0;
  let foraDaArea = false;
  let timerFrete;
  let consultaFrete = 0;

  async function calcularFrete() {
    const caixa = $('fr');
    const minhaConsulta = ++consultaFrete;

    if ($('tipo').value !== 'coleta') {
      foraDaArea = false;
      caixa.innerHTML = `<span>Frete: <strong>Grátis (você leva à lavanderia)</strong></span><span>Total estimado: <strong>${dinheiro(valorPedido)}</strong></span>`;
      caixa.hidden = false;
      return;
    }

    const cidade = $('cid').value.trim();
    const uf = $('uf').value.trim().toUpperCase();
    if (!cidade || uf.length !== 2) {
      foraDaArea = false;
      caixa.hidden = true;
      return;
    }

    const { data, error } = await supabase.rpc('calcular_frete', {
      p_cidade: cidade, p_uf: uf, p_bairro: $('bai').value.trim(), p_valor: valorPedido
    });
    if (!aindaAtual() || minhaConsulta !== consultaFrete) return;

    if (error || data == null) {
      foraDaArea = true;
      caixa.innerHTML = '<span>Ainda não entregamos neste endereço. Escolha "Levar à lavanderia" ou outro endereço.</span>';
    } else {
      foraDaArea = false;
      const frete = Number(data);
      caixa.innerHTML = `<span>Frete: <strong>${frete ? dinheiro(frete) : 'Grátis'}</strong></span><span>Total estimado: <strong>${dinheiro(valorPedido + frete)}</strong></span>`;
    }
    caixa.hidden = false;
  }

  function calcularFreteComEspera() {
    clearTimeout(timerFrete);
    timerFrete = setTimeout(calcularFrete, 400);
  }

  ['cid', 'uf', 'bai'].forEach(id => $(id).addEventListener('input', calcularFreteComEspera));
  $('tipo').addEventListener('change', () => {
    $('err').hidden = true;
    ajustarModalidade();
    calcularFrete();
  });
  calcularFrete();
  ajustarModalidade();
  ligarMascaraTelefone();
  ligarBuscaCep(aindaAtual, calcularFrete);

  let horarioEscolhido = '';

  async function carregarHorarios() {
    horarioEscolhido = '';
    $('b').disabled = true;
    $('conc').hidden = true;

    if (!$('dt').value || $('dt').value < hoje()) {
      $('slots').innerHTML = '<p class="note">Escolha uma data a partir de hoje.</p>';
      return;
    }

    $('slots').innerHTML = '<p class="note">Consultando horários...</p>';
    const resultado = await buscarHorarios($('dt').value);
    if (!aindaAtual()) return;

    if (resultado.fechado) {
      $('slots').innerHTML = '<p class="note">Não atendemos aos domingos. Escolha outra data.</p>';
    } else if (resultado.erro) {
      $('slots').innerHTML = '<p class="alert err">Não foi possível consultar os horários.</p>';
    } else if (resultado.lista.some(s => s.livre)) {
      $('slots').innerHTML = htmlHorarios(resultado.lista);
    } else {
      $('slots').innerHTML = '<p class="note">Sem horários disponíveis nesta data. Tente outro dia.</p>';
    }
  }

  $('dt').addEventListener('change', () => {
    $('err').hidden = true;
    carregarHorarios();
  });

  $('slots').addEventListener('click', ev => {
    const botao = ev.target.closest('.slot');
    if (!botao || botao.disabled) return;

    $('slots').querySelectorAll('.slot').forEach(s => s.classList.remove('sel'));
    botao.classList.add('sel');
    horarioEscolhido = botao.dataset.h;
    $('b').disabled = false;

    const previsao = previsaoConclusao($('dt').value, horarioEscolhido, Number(pedido.tempo_estimado_min) || 0);
    $('conc').hidden = !previsao;
    if (previsao) {
      $('conc').innerHTML = `<span>Previsão de conclusão: <strong>${dataBR(previsao.data)} às ${previsao.hora}</strong></span>`
        + `<span><small>Estimativa de ${formatarTempo(pedido.tempo_estimado_min)} contando só o horário de funcionamento. O prazo final é confirmado pela lavanderia.</small></span>`;
    }
  });

  function mostrarErro(texto) {
    $('err').textContent = texto;
    $('err').hidden = false;
  }

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!horarioEscolhido) return;
    $('err').hidden = true;

    const coleta = $('tipo').value === 'coleta';
    const telefone = somenteNumeros($('tel').value);
    if (telefone.length < 10 || telefone.length > 11) {
      return mostrarErro('Informe o WhatsApp com DDD, por exemplo (11) 90000-0000.');
    }

    let endereco = {};
    if (coleta) {
      endereco = {
        cep: somenteNumeros($('cep').value),
        logradouro: $('rua').value.trim(),
        numero: $('num').value.trim(),
        complemento: $('comp').value.trim() || null,
        bairro: $('bai').value.trim(),
        cidade: $('cid').value.trim(),
        uf: $('uf').value.trim().toUpperCase()
      };
      if (endereco.cep.length !== 8 || !/^[A-Z]{2}$/.test(endereco.uf)) {
        return mostrarErro('Confira o CEP (8 números) e a UF (2 letras) do endereço.');
      }
      if (foraDaArea) {
        return mostrarErro('Ainda não entregamos neste endereço. Escolha "Levar à lavanderia" ou outro endereço.');
      }
    }

    $('b').disabled = true;
    const data = $('dt').value;
    let resposta;

    if (reagendando) {
      resposta = await supabase.rpc('reagendar_pedido', {
        p_pedido: pedido.id, p_data: data, p_horario: horarioEscolhido,
        p_tipo: $('tipo').value, p_dados: { ...endereco, telefone }
      });
    } else {
      resposta = await supabase.from('agendamentos').insert({
        pedido_id: pedido.id, cliente_id: usuario.id, tipo: $('tipo').value,
        data_agendada: data, horario: horarioEscolhido, telefone,
        forma_pagamento: $('pg').value, ...endereco
      });
    }

    if (resposta.error) {
      const msg = resposta.error.message;
      if (/lotado|indispon/i.test(msg)) {
        mostrarErro('Esse horário não está mais disponível. Escolha outro.');
      } else {
        mostrarErro((reagendando ? 'Não foi possível reagendar: ' : 'Não foi possível agendar: ') + msg);
      }
      carregarHorarios();
      return;
    }

    // no reagendamento a forma de pagamento muda por uma funcao do banco
    let avisoPagamento = '';
    if (reagendando && !pedido.pago) {
      const { error } = await supabase.rpc('alterar_forma_pagamento', { p_pedido: pedido.id, p_forma: $('pg').value });
      if (error) avisoPagamento = ' Atenção: não foi possível alterar a forma de pagamento (' + error.message + ').';
    }

    // guarda endereco e telefone no perfil. Se falhar, o agendamento ja esta salvo
    await supabase.from('clientes').update({ ...endereco, telefone }).eq('id', usuario.id);

    if (reagendando) {
      avisar(`Pedido reagendado para ${dataBR(data)} às ${horarioEscolhido}.${avisoPagamento}`);
    } else {
      const pix = $('pg').value === 'pix' && PIX_CHAVE ? ' Chave Pix: ' + PIX_CHAVE + '.' : '';
      avisar(`Agendamento confirmado para ${dataBR(data)} às ${horarioEscolhido}. Obrigado!${pix}`);
    }
    ir('#pedidos');
  });
}

export async function telaHorarios({ desenhar, aindaAtual }) {
  const usuario = estado.usuario;
  let hrefBotao = '#solicitar';
  let textoBotao = 'Fazer um pedido';
  if (!usuario) {
    hrefBotao = '#login';
    textoBotao = 'Entrar para agendar';
  } else if (usuario.perfil === 'admin') {
    hrefBotao = '#admin';
    textoBotao = 'Ir ao painel';
  }

  desenhar(`<div class="wrap page"><div class="head">
    <div class="eyebrow">Agenda</div><h1>Consultar horários</h1>
    <p style="margin:0;max-width:640px">Escolha uma data e veja os horários disponíveis para coleta ou entrega. Atendemos de segunda a sexta, das 8h às 17h, e aos sábados, das 8h às 12h.</p></div>
    <div class="card form">
      <label for="dt">Data</label><input id="dt" type="date" min="${hoje()}" value="${hoje()}">
      <div id="slots"></div>
      <a class="btn fit" href="${hrefBotao}">${textoBotao}</a>
    </div></div>`);

  async function mostrar() {
    const data = $('dt').value;
    if (!data || data < hoje()) {
      $('slots').innerHTML = '<p class="note">Escolha uma data a partir de hoje.</p>';
      return;
    }

    $('slots').innerHTML = '<p class="note">Consultando horários...</p>';
    const resultado = await buscarHorarios(data);
    if (!aindaAtual()) return;

    if (resultado.fechado) $('slots').innerHTML = '<p class="note">Não atendemos aos domingos.</p>';
    else if (resultado.erro) $('slots').innerHTML = '<p class="alert err">Não foi possível consultar os horários.</p>';
    else $('slots').innerHTML = htmlHorarios(resultado.lista);

    // aqui os horarios so podem ser consultados, nao clicados
    $('slots').querySelectorAll('.slot').forEach(s => { s.style.cursor = 'default'; });
  }

  $('dt').addEventListener('change', mostrar);
  mostrar();
}

// pedidos e agendamentos do cliente
export async function telaPedidos({ desenhar, exigirLogin, aindaAtual }) {
  if (!exigirLogin()) return;

  const { data, error } = await supabase
    .from('pedidos')
    .select(`*, servicos(nome), agendamentos(${COLUNAS_AGENDAMENTO})`)
    .eq('cliente_id', estado.usuario.id)
    .order('criado_em', { ascending: false });
  if (!aindaAtual()) return;

  const pedidos = data || [];

  function botoesDoPedido(p) {
    const botoes = [];
    if (p.status === 'pendente') {
      botoes.push(`<a class="btn mini" href="#agendar?pedido=${p.id}">Agendar</a>`);
    }
    if (p.status === 'agendado' && !p.pago) {
      botoes.push(`<button class="btn zap mini" data-pagar="${p.id}">Pagar agora</button>`);
    }
    if (p.status === 'agendado') {
      botoes.push(`<a class="btn mini" href="#agendar?pedido=${p.id}&reagendar=1">Reagendar</a>`);
    }
    if (['pendente', 'agendado'].includes(p.status)) {
      botoes.push(`<button class="btn o mini" data-cancelar="${p.id}">Cancelar</button>`);
    }
    return botoes.join('');
  }

  const linhas = pedidos.map(p => `<tr>
    <td data-label="Pedido">#${p.id}</td>
    <td data-label="Serviço">${escapar(p.servicos?.nome)}</td>
    <td data-label="Peças">${p.quantidade}</td>
    <td data-label="Duração est.">${formatarTempo(p.tempo_estimado_min)}</td>
    <td data-label="Agendamento">${quandoTexto(p, false, true)}</td>
    <td data-label="Valor est.">${totalTexto(p)}</td>
    <td data-label="Status"><span class="badge s-${p.status}">${STATUS[p.status]}</span></td>
    <td><div class="acoes">${botoesDoPedido(p)}</div></td></tr>`).join('');

  const conteudo = pedidos.length
    ? `<div class="scroll"><table class="tbl"><thead><tr><th>Nº</th><th>Serviço</th><th>Peças</th><th>Duração est.</th><th>Agendamento</th><th>Valor est.</th><th>Status</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>
       <div><a class="btn" href="#solicitar">Novo pedido</a></div>`
    : '<div class="vazio"><p>Você ainda não fez nenhum pedido.</p><a class="btn" href="#solicitar">Solicitar serviço</a></div>';

  desenhar(`<div class="wrap page">
    <div class="head"><div class="eyebrow">Olá, ${escapar(estado.usuario.nome)}</div><h1>Meus pedidos</h1></div>
    <div class="card">
      ${error ? '<p class="alert err">Não foi possível carregar seus pedidos.</p>' : ''}
      ${conteudo}
    </div></div>`);

  const app = $('app');

  app.querySelectorAll('[data-pagar]').forEach(botao => {
    botao.addEventListener('click', async () => {
      botao.disabled = true;
      botao.textContent = 'Abrindo...';
      const { data, error } = await supabase.functions.invoke('criar-pagamento', {
        body: { pedido_id: Number(botao.dataset.pagar) }
      });
      if (error || !data?.url) {
        avisar('Não foi possível abrir o pagamento online agora. Você pode pagar na entrega ou na retirada.', 'err');
        recarregar();
        return;
      }
      location.href = data.url;
    });
  });

  app.querySelectorAll('[data-cancelar]').forEach(botao => {
    botao.addEventListener('click', async () => {
      if (!confirm('Cancelar este pedido? O horário agendado será liberado.')) return;
      const { error } = await supabase.from('pedidos')
        .update({ status: 'cancelado' })
        .eq('id', botao.dataset.cancelar)
        .in('status', ['pendente', 'agendado']);
      avisar(error ? 'Este pedido não pode mais ser cancelado.' : 'Pedido cancelado.', error ? 'err' : 'ok');
      recarregar();
    });
  });
}
