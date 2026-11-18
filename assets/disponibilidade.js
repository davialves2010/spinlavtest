import { supabase } from './supabase.js';
import { hoje, somarDias } from './util.js';

export const HORARIOS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00'
];

// retorna os horarios do dia e se cada um esta livre
export async function buscarHorarios(data) {
  const diaSemana = new Date(data + 'T12:00:00').getDay();
  if (diaSemana === 0) return { fechado: true, lista: [] };

  const base = diaSemana === 6 ? HORARIOS.filter(h => h <= '12:00') : HORARIOS;
  const { data: lotados, error } = await supabase.rpc('horarios_lotados', { d: data });
  const ocupados = new Set((lotados || []).map(r => String(r.horario).slice(0, 5)));
  const agora = new Date().toTimeString().slice(0, 5);

  const lista = base.map(h => {
    const jaPassou = data === hoje() && h <= agora;
    return { h, livre: !ocupados.has(h) && !jaPassou };
  });

  return { fechado: false, erro: !!error, lista };
}

// expediente em minutos: [abre, fecha]. domingo nao tem
function expediente(data) {
  const diaSemana = new Date(data + 'T12:00:00').getDay();
  if (diaSemana === 0) return null;
  if (diaSemana === 6) return [8 * 60, 12 * 60];
  return [8 * 60, 17 * 60];
}

function minutosParaHora(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return `${h}:${m}`;
}

// previsao = horario de inicio + duracao, contando so o expediente
export function previsaoConclusao(data, hora, duracaoMin) {
  let dia = data;
  let inicio = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
  let falta = Math.max(0, duracaoMin);

  for (let i = 0; i < 90; i++) {
    const janela = expediente(dia);
    if (janela) {
      inicio = Math.max(inicio, janela[0]);
      const livre = janela[1] - inicio;
      if (livre > 0 && falta <= livre) {
        return { data: dia, hora: minutosParaHora(inicio + falta) };
      }
      if (livre > 0) falta -= livre;
    }
    dia = somarDias(dia, 1);
    inicio = 0;
  }
  return null;
}

export function htmlHorarios(lista) {
  const botoes = lista.map(s => {
    const desabilitado = s.livre ? '' : 'disabled';
    const texto = s.livre ? 'Disponível' : 'Indisponível';
    return `<button type="button" class="slot" data-h="${s.h}" ${desabilitado}>${s.h}<small>${texto}</small></button>`;
  });
  return `<div class="slots">${botoes.join('')}</div>`;
}
