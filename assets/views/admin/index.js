import { supabase } from '../../supabase.js';
import { estado, avisar } from '../../estado.js';
import { ir } from '../../navegacao.js';
import { pedirMfa } from './mfa.js';
import { abaAgenda } from './agenda.js';
import { abaPedidos } from './pedidos.js';
import { abaClientes } from './clientes.js';
import { abaServicos } from './servicos.js';
import { abaFrete } from './frete.js';
import { abaBloqueios } from './bloqueios.js';
import { abaEquipe } from './equipe.js';
import { abaRegistro } from './registro.js';

const ABAS = {
  agenda: abaAgenda,
  pedidos: abaPedidos,
  clientes: abaClientes,
  servicos: abaServicos,
  bloqueios: abaBloqueios,
  frete: abaFrete,
  equipe: abaEquipe,
  registro: abaRegistro
};

const ABAS_SO_DO_DONO = ['equipe', 'registro'];

export async function telaAdmin(contexto) {
  const { exigirLogin, aindaAtual, params } = contexto;
  if (!exigirLogin(true)) return;

  // so entra no painel quem passou pela verificacao em duas etapas (aal2)
  const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!aindaAtual()) return;
  if (nivel?.currentLevel !== 'aal2') return pedirMfa(contexto);

  const pedida = params.get('aba');
  const aba = ABAS[pedida] ? pedida : 'agenda';

  if (ABAS_SO_DO_DONO.includes(aba) && !estado.usuario.dono) {
    avisar('Esta área é exclusiva do dono.', 'err');
    return ir('#admin');
  }

  return ABAS[aba](contexto);
}
