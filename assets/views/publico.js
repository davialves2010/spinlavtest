import { escapar, dinheiro } from '../util.js';
import { estado, carregarServicos } from '../estado.js';
import { cartao } from './comum.js';

export async function telaInicio({ desenhar }) {
  const servicos = (await carregarServicos()).slice(0, 3);
  const cartoesServicos = servicos.map(s => cartao(s.icone, s.nome, s.descricao)).join('');

  desenhar(`<section class="hero"><div class="wrap">
    <div>
      <div class="eyebrow">Bem-vindo à SpinLav</div>
      <h1>Suas roupas limpas, sua rotina mais leve</h1>
      <p>A SpinLav oferece serviços de lavanderia com cuidado, praticidade e confiança para deixar mais tempo livre na sua rotina.</p>
      <div class="btns"><a class="btn" href="#servicos">Conheça nossos serviços</a><a class="btn o" href="#sobre">Sobre a SpinLav</a></div>
    </div>
    <div class="pic">
      <img class="ph" style="object-fit:cover;display:block" src="assets/img/toalhas.svg" alt="Toalhas limpas e dobradas">
      <div class="seal"><img src="assets/img/logo.jpg" alt="Logo SpinLav"></div>
    </div>
  </div></section>

  <section class="sec" style="background:var(--pale)"><div class="wrap">
    <h2>Um cuidado que cabe na sua rotina</h2><p class="sub"></p>
    <div class="grid g3">
      ${cartao('clock', 'Mais tempo livre', 'Deixe a lavagem com a gente e use seu tempo no que importa.')}
      ${cartao('shield', 'Cuidado com cada peça', 'Tratamos cada tecido com atenção e respeito.')}
      ${cartao('heart', 'Praticidade e confiança', 'Um serviço simples, organizado e feito para o seu dia a dia.')}
    </div>
  </div></section>

  <section class="sec white"><div class="wrap">
    <h2>Para cada peça, um jeito de cuidar</h2><p class="sub"></p>
    <div class="grid g3">${cartoesServicos}</div>
    <div class="center"><a class="btn" href="#servicos">Ver todos os serviços</a></div>
  </div></section>`);
}

export async function telaServicos({ desenhar }) {
  const servicos = await carregarServicos();
  const ehFuncionario = estado.usuario?.perfil === 'admin';

  const cartoes = servicos.map(s => {
    const descricao = `${s.descricao} A partir de ${dinheiro(s.preco_peca)} por peça.`;
    const href = ehFuncionario ? '' : '#solicitar?servico=' + s.id;
    return cartao(s.icone, s.nome, descricao, href, 'Solicitar serviço');
  }).join('');

  const erro = servicos.length
    ? ''
    : '<p class="alert err">Não foi possível carregar os serviços. Confira a configuração do Supabase.</p>';

  desenhar(`<div class="wrap page">
    <div class="head">
      <div class="eyebrow">Nossos serviços</div>
      <h1>Cuidado para cada tipo de roupa</h1>
      <p style="margin:0;max-width:640px">Escolha a opção que combina com as suas peças. Cada cuidado foi pensado para facilitar o seu dia a dia.</p>
      <p style="margin:18px 0 0"><a class="btn o" href="#horarios">Consultar horários</a></p>
    </div>
    ${erro}
    <div class="grid g4">${cartoes}</div>
  </div>`);
}

export function telaSobre({ desenhar }) {
  desenhar(`<section class="hero about"><div class="wrap">
    <div class="txt">
      <div class="eyebrow">Sobre nós</div>
      <h1>Cuidar das suas roupas é cuidar do seu tempo</h1>
      <p>A SpinLav é uma lavanderia profissional criada para oferecer praticidade e confiança no tratamento das roupas. Nossa proposta é tornar essa parte da rotina mais simples e atenciosa.</p>
      <div class="seal"><img src="assets/img/logo.jpg" alt="Logo SpinLav"></div>
    </div>
    <div class="pic"><img class="ph" style="object-fit:cover;display:block" src="img/sobre.jpg" alt="Profissional trabalhando na lavanderia"></div>
  </div></section>

  <section class="about-cards"><div class="wrap"><div class="grid g3">
    ${cartao('target', 'Missão', 'Facilitar a rotina das pessoas com serviços de lavanderia práticos, cuidadosos e confiáveis.')}
    ${cartao('eye', 'Visão', 'Ser referência em lavanderia profissional, reconhecida pela qualidade e pela atenção às pessoas.')}
    ${cartao('heart', 'Compromisso com o cliente', 'Atendimento claro e organizado, com respeito a cada peça e ao tempo de quem confia na SpinLav.')}
  </div></div></section>`);
}
