import { $, escapar, formatarTelefone, somenteNumeros } from '../util.js';
import { supabase } from '../supabase.js';
import { estado, avisar, atualizarUsuario } from '../estado.js';
import { ir, recarregar } from '../navegacao.js';
import { camposEndereco, ligarBuscaCep, ligarMascaraTelefone } from './comum.js';

const GOOGLE_SVG = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';

const BOTAO_GOOGLE = `<button type="button" class="btn-google" id="g">${GOOGLE_SVG}Continuar com o Google</button><div class="ou"><span>ou</span></div>`;

function ligarBotaoGoogle() {
  $('g').addEventListener('click', async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: location.origin + '/' }
    });
    if (error) mostrarErro('Não foi possível entrar com o Google. Tente novamente.');
  });
}

// o botao de enviar do formulario sempre tem id="b" e a caixa de erro id="err"
function mostrarErro(texto) {
  $('err').textContent = texto;
  $('err').hidden = false;
  const botao = $('b');
  if (botao) botao.disabled = false;
}

function lateral(texto) {
  return `<div class="side"><img src="assets/img/logo.jpg" alt="Logo SpinLav"><h2>Uma rotina mais leve começa aqui.</h2><p style="margin:0">${texto}</p></div>`;
}

function destinoDoUsuario() {
  return estado.usuario.perfil === 'admin' ? '#admin' : '#pedidos';
}

export function telaLogin({ desenhar }) {
  if (estado.usuario) return ir(destinoDoUsuario());

  desenhar(`<div class="wrap login">
    <form class="card" id="f">
      <div class="eyebrow" style="margin:0">Área do cliente</div>
      <h1>Bem-vindo à SpinLav.</h1>
      <p style="margin:0">Entre para solicitar serviços e acompanhar seus pedidos.</p>
      <p class="alert err" id="err" hidden></p>
      ${BOTAO_GOOGLE}
      <label for="email">E-mail</label><input id="email" type="email" required autocomplete="email">
      <label for="senha">Senha</label><input id="senha" type="password" required autocomplete="current-password">
      <div class="row"><a href="#recuperar">Esqueci minha senha</a></div>
      <button class="btn fit" type="submit" id="b">Entrar</button>
      <p class="note">Ainda não tem conta? <a href="#cadastro"><strong>Cadastre-se</strong></a></p>
    </form>
    ${lateral('Cuidado e praticidade com a identidade acolhedora da SpinLav.')}</div>`);

  ligarBotaoGoogle();

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;

    const { error } = await supabase.auth.signInWithPassword({
      email: $('email').value.trim(),
      password: $('senha').value
    });

    if (error) {
      const naoConfirmado = error.message.includes('Email not confirmed');
      mostrarErro(naoConfirmado
        ? 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).'
        : 'E-mail ou senha incorretos.');
      return;
    }

    await atualizarUsuario();
    avisar('Olá, ' + estado.usuario.nome + '! Que bom ter você de volta.');
    ir(destinoDoUsuario());
  });
}

export function telaCadastro({ desenhar }) {
  if (estado.usuario) return ir('#pedidos');

  desenhar(`<div class="wrap login">
    <form class="card" id="f">
      <div class="eyebrow" style="margin:0">Novo por aqui</div>
      <h1>Criar conta</h1>
      <p class="alert err" id="err" hidden></p>
      ${BOTAO_GOOGLE}
      <label for="nome">Nome</label><input id="nome" type="text" required minlength="2">
      <label for="email">E-mail</label><input id="email" type="email" required>
      <label for="senha">Senha</label><input id="senha" type="password" minlength="6" required>
      <label for="conf">Confirmar senha</label><input id="conf" type="password" required>
      <button class="btn fit" type="submit" id="b">Cadastrar</button>
      <p class="note">Já tem conta? <a href="#login"><strong>Entrar</strong></a></p>
    </form>
    ${lateral('Crie sua conta e peça sua coleta em poucos cliques.')}</div>`);

  ligarBotaoGoogle();

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;

    if ($('senha').value !== $('conf').value) return mostrarErro('As senhas não coincidem.');

    const { data, error } = await supabase.auth.signUp({
      email: $('email').value.trim(),
      password: $('senha').value,
      options: { data: { nome: $('nome').value.trim() }, emailRedirectTo: location.origin + '/' }
    });

    if (error) {
      return mostrarErro(error.message.includes('already')
        ? 'Já existe uma conta com este e-mail.'
        : error.message);
    }

    if (data.session) {
      await atualizarUsuario();
      avisar('Conta criada com sucesso! Agora você já pode solicitar um serviço.');
      ir('#servicos');
    } else {
      avisar('Conta criada! Enviamos um e-mail de confirmação: confirme e depois faça login.');
      ir('#login');
    }
  });
}

// o cliente consulta e corrige o proprio cadastro
export async function telaPerfil({ desenhar, exigirLogin, aindaAtual }) {
  if (!exigirLogin()) return;

  const { data: perfil } = await supabase
    .from('clientes')
    .select('nome,email,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf')
    .eq('id', estado.usuario.id)
    .maybeSingle();
  if (!aindaAtual()) return;

  desenhar(`<div class="wrap page">
    <div class="head"><div class="eyebrow">Minha conta</div><h1>Meu perfil</h1></div>
    <div class="form"><form class="card" id="f">
      <p class="alert err" id="err" hidden></p>
      <label for="nome">Nome</label>
      <input id="nome" type="text" required minlength="2" maxlength="80" value="${escapar(perfil?.nome || '')}">
      <label for="email">E-mail</label>
      <input id="email" type="email" value="${escapar(perfil?.email || estado.usuario.email)}" disabled>
      <label for="tel">WhatsApp / telefone</label>
      <input id="tel" type="tel" inputmode="tel" autocomplete="tel" maxlength="15" placeholder="(11) 90000-0000" value="${escapar(formatarTelefone(perfil?.telefone))}">
      ${camposEndereco(perfil, 'Endereço para coleta')}
      <button class="btn fit" type="submit" id="b">Salvar alterações</button>
      <p class="note"><a href="#novasenha"><strong>Alterar minha senha</strong></a></p>
    </form></div></div>`);

  ligarMascaraTelefone();
  ligarBuscaCep(aindaAtual);

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;

    const telefone = somenteNumeros($('tel').value);
    const cep = somenteNumeros($('cep').value);
    const uf = $('uf').value.trim().toUpperCase();

    if (telefone && (telefone.length < 10 || telefone.length > 11)) {
      return mostrarErro('Informe o telefone com DDD, por exemplo (11) 90000-0000.');
    }
    if (cep && cep.length !== 8) return mostrarErro('O CEP precisa ter 8 números.');
    if (uf && !/^[A-Z]{2}$/.test(uf)) return mostrarErro('A UF precisa ter 2 letras (ex.: SP).');

    const { error } = await supabase.from('clientes').update({
      nome: $('nome').value.trim(),
      telefone: telefone || null,
      cep: cep || null,
      logradouro: $('rua').value.trim() || null,
      numero: $('num').value.trim() || null,
      complemento: $('comp').value.trim() || null,
      bairro: $('bai').value.trim() || null,
      cidade: $('cid').value.trim() || null,
      uf: uf || null
    }).eq('id', estado.usuario.id);

    if (error) return mostrarErro('Não foi possível salvar: ' + error.message);

    estado.usuario.nome = $('nome').value.trim();
    avisar('Perfil atualizado.');
    recarregar();
  });
}

export function telaRecuperar({ desenhar }) {
  if (estado.usuario) return ir('#perfil');

  desenhar(`<div class="wrap login">
    <form class="card" id="f">
      <div class="eyebrow" style="margin:0">Acesso</div>
      <h1>Recuperar senha</h1>
      <p style="margin:0">Informe o e-mail da sua conta. Enviaremos um link para você criar uma nova senha.</p>
      <p class="alert err" id="err" hidden></p>
      <p class="alert ok" id="okm" hidden></p>
      <label for="email">E-mail</label><input id="email" type="email" required autocomplete="email">
      <button class="btn fit" type="submit" id="b">Enviar link</button>
      <p class="note">Lembrou a senha? <a href="#login"><strong>Entrar</strong></a></p>
    </form>
    ${lateral('Você receberá um e-mail com o link para redefinir sua senha.')}</div>`);

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;
    $('okm').hidden = true;

    const { error } = await supabase.auth.resetPasswordForEmail($('email').value.trim(), {
      redirectTo: location.origin + '/'
    });

    if (error) {
      const limite = /rate|seconds|limit/i.test(error.message);
      return mostrarErro(limite
        ? 'Aguarde um minuto antes de pedir outro link.'
        : 'Não foi possível enviar o e-mail agora. Tente novamente.');
    }

    $('okm').textContent = 'Se existir uma conta com esse e-mail, enviamos o link. Confira também a caixa de spam.';
    $('okm').hidden = false;
    $('b').disabled = false;
  });
}

export function telaNovaSenha({ desenhar }) {
  if (!estado.usuario) {
    avisar('O link expirou ou é inválido. Peça um novo.', 'err');
    return ir('#recuperar');
  }

  desenhar(`<div class="wrap login">
    <form class="card" id="f">
      <div class="eyebrow" style="margin:0">Segurança</div>
      <h1>Nova senha</h1>
      <p class="alert err" id="err" hidden></p>
      <label for="senha">Nova senha</label>
      <input id="senha" type="password" minlength="6" required autocomplete="new-password">
      <label for="conf">Confirmar nova senha</label>
      <input id="conf" type="password" minlength="6" required autocomplete="new-password">
      <button class="btn fit" type="submit" id="b">Salvar nova senha</button>
    </form>
    ${lateral('Escolha uma senha com pelo menos 6 caracteres.')}</div>`);

  $('f').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('b').disabled = true;
    $('err').hidden = true;

    if ($('senha').value !== $('conf').value) return mostrarErro('As senhas não coincidem.');

    const { error } = await supabase.auth.updateUser({ password: $('senha').value });
    if (error) {
      return mostrarErro(/same|different/i.test(error.message)
        ? 'A nova senha precisa ser diferente da atual.'
        : 'Não foi possível alterar a senha: ' + error.message);
    }

    avisar('Senha alterada com sucesso.');
    ir(destinoDoUsuario());
  });
}

export { lateral };
