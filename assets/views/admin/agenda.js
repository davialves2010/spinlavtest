import { $, escapar, hoje, somarDias, textoEndereco, STATUS, COLUNAS_AGENDAMENTO } from '../../util.js';
import { supabase } from '../../supabase.js';
import { ir } from '../../navegacao.js';
import { moldura, seletorStatus, botaoWhatsapp, cliqueNosPedidos } from './comum.js';

export async function abaAgenda({ desenhar, aindaAtual, params }) {
  const dataParam = params.get('data') || '';
  const dia = /^\d{4}-\d{2}-\d{2}$/.test(dataParam) ? dataParam : hoje();

  const [{ data: agendamentos, error }, { data: bloqueios }] = await Promise.all([
    supabase.from('agendamentos')
      .select(`${COLUNAS_AGENDAMENTO}, pedidos(id,status,pago,quantidade,observacoes,servicos(nome),clientes(nome,email,telefone))`)
      .eq('data_agendada', dia).order('horario'),
    supabase.from('bloqueios').select('*').eq('data', dia)
  ]);
  if (!aindaAtual()) return;

  const itens = (agendamentos || []).filter(a => a.pedidos && a.pedidos.status !== 'cancelado');
  const titulo = new Date(dia + 'T12:00:00')
    .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  const avisosBloqueio = (bloqueios || []).map(b => {
    const hora = b.horario ? String(b.horario).slice(0, 5) : 'dia inteiro';
    const motivo = b.motivo ? ' - ' + escapar(b.motivo) : '';
    return `<p class="bloq">Bloqueado: ${hora}${motivo}</p>`;
  }).join('');

  const cartoes = itens.map(a => {
    const p = a.pedidos;
    const onde = a.tipo === 'coleta'
      ? 'Coleta em casa' + (textoEndereco(a) ? ' - ' + escapar(textoEndereco(a)) : '')
      : 'Cliente leva à lavanderia';

    return `<div class="agi"><div class="hr">${String(a.horario).slice(0, 5)}</div><div class="info">
      <strong>${escapar(p.clientes?.nome)} <small>· pedido #${p.id}</small></strong>
      <span>${escapar(p.servicos?.nome)} · ${p.quantidade} peça(s)</span>
      <span>${onde}</span>
      ${p.observacoes ? `<small>Obs.: ${escapar(p.observacoes)}</small>` : ''}
      <div class="acts"><span class="badge s-${p.status}">${STATUS[p.status]}</span>${seletorStatus(p)}${botaoWhatsapp(p, a)}</div>
    </div></div>`;
  }).join('');

  desenhar(moldura('agenda', `
    <div class="diabar">
      <a class="btn o mini" href="#admin?aba=agenda&data=${somarDias(dia, -1)}">Dia anterior</a>
      <input id="dia" type="date" value="${dia}" aria-label="Escolher dia">
      <a class="btn o mini" href="#admin?aba=agenda&data=${somarDias(dia, 1)}">Próximo dia</a>
      ${dia !== hoje() ? '<a class="btn mini" href="#admin?aba=agenda">Hoje</a>' : ''}
    </div>
    <h2 style="font-size:20px;text-transform:capitalize;margin-bottom:4px">${escapar(titulo)}</h2>
    <p style="margin:0 0 14px">${itens.length} agendamento(s) neste dia.</p>
    ${error ? '<p class="alert err">Não foi possível carregar a agenda.</p>' : ''}
    ${avisosBloqueio}
    ${cartoes || '<div class="vazio"><p>Nenhum agendamento neste dia.</p></div>'}`));

  $('dia').addEventListener('change', () => {
    if ($('dia').value) ir('#admin?aba=agenda&data=' + $('dia').value);
  });
  $('adm').addEventListener('click', cliqueNosPedidos);
}
