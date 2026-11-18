// verificacao em duas etapas (app autenticador) exigida no painel
import { $ } from '../../util.js';
import { supabase } from '../../supabase.js';
import { escapar } from '../../util.js';
import { avisar, atualizarUsuario } from '../../estado.js';
import { recarregar } from '../../navegacao.js';
import { aviso } from '../comum.js';
import { lateral } from '../conta.js';

function mostrarErro(texto) {
  $('err').textContent = texto;
  $('err').hidden = false;
  $('b').disabled = false;
}

async function concluir() {
  await atualizarUsuario();
  avisar('Verificação concluída. Bem-vindo ao painel!');
  recarregar();
}

export async function pedirMfa({ desenhar, aindaAtual }) {
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  if (!aindaAtual()) return;

  const fatorAtivo = (fatores?.totp || [])[0];

  // ja tem app cadastrado: so pede o codigo
  if (fatorAtivo) {
    desenhar(`<div class="wrap login"><form class="card" id="f">
      <div class="eyebrow" style="margin:0">Segurança</div>
      <h1>Verificação em duas etapas</h1>
      <p style="margin:0">Digite o código de 6 dígitos do seu app autenticador para abrir o painel.</p>
      <p class="alert err" id="err" hidden></p>
      <label for="cod">Código</label>
      <input id="cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
      <button class="btn fit" type="submit" id="b">Verificar</button></form>
      ${lateral('O painel do funcionário exige um segundo passo de segurança.')}</div>`);

    $('f').addEventListener('submit', async ev => {
      ev.preventDefault();
      $('b').disabled = true;
      $('err').hidden = true;
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: fatorAtivo.id,
        code: $('cod').value.replace(/\D/g, '')
      });
      if (error) return mostrarErro('Código incorreto ou expirado. Tente o código atual do app.');
      concluir();
    });
    return;
  }

  // primeiro acesso: remove cadastros que ficaram pela metade e cria um novo
  for (const fator of (fatores?.all || [])) {
    if (fator.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: fator.id });
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'SpinLav' });
  if (!aindaAtual()) return;
  if (error || !data) {
    return desenhar(aviso(
      'Não foi possível ativar a verificação em duas etapas. Confira se o MFA (TOTP) está ativado no Supabase.',
      '#inicio', 'Voltar ao início'
    ));
  }

  desenhar(`<div class="wrap login"><form class="card" id="f">
    <div class="eyebrow" style="margin:0">Segurança</div>
    <h1>Ative a verificação em duas etapas</h1>
    <p style="margin:0">Para acessar o painel, cadastre um app autenticador (Google Authenticator, Authy, Microsoft Authenticator...): escaneie o QR Code e digite o código que aparecer.</p>
    <img class="qr" id="qr" alt="QR Code para o app autenticador" width="200" height="200">
    <p class="note">Sem câmera? Digite esta chave no app: <span class="cod">${escapar(data.totp.secret)}</span></p>
    <p class="alert err" id="err" hidden></p>
    <label for="cod">Código do app</label>
    <input id="cod" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required>
    <button class="btn fit" type="submit" id="b">Ativar e entrar</button></form>
    ${lateral('Guarde bem o acesso ao app: ele será pedido sempre que você entrar no painel.')}</div>`);

  $('qr').src = data.totp.qr_code;

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: data.id,
      code: $('cod').value.replace(/\D/g, '')
    });
    if (error) return mostrarErro('Código incorreto. Confira o código atual no app e tente de novo.');
    concluir();
  });
}
