import { $, escapar, numeroOuNulo } from '../../util.js';
import { supabase } from '../../supabase.js';
import { avisar, limparCacheServicos } from '../../estado.js';
import { recarregar } from '../../navegacao.js';
import { ICONES_SERVICO } from '../comum.js';
import { moldura } from './comum.js';

function opcoesIcone(selecionado) {
  return Object.entries(ICONES_SERVICO).map(([chave, nome]) =>
    `<option value="${chave}" ${selecionado === chave ? 'selected' : ''}>${nome}</option>`
  ).join('');
}

// os campos de cada linha tem id = prefixo + letra (n, d, i, p, b, t)
function lerCampos(prefixo) {
  return {
    nome: $(prefixo + 'n').value.trim(),
    descricao: $(prefixo + 'd').value.trim(),
    icone: $(prefixo + 'i').value,
    preco_peca: numeroOuNulo($(prefixo + 'p').value),
    tempo_base_min: numeroOuNulo($(prefixo + 'b').value),
    tempo_peca_min: numeroOuNulo($(prefixo + 't').value)
  };
}

// devolve o texto do erro, ou '' se estiver tudo certo
function validar(s) {
  if (!s.nome) return 'Informe o nome do serviço.';
  if (!s.descricao) return 'Informe uma descrição curta.';
  if (s.preco_peca == null || !(s.preco_peca >= 0)) return 'Informe o preço por peça (0 ou mais).';

  const baseOk = Number.isInteger(s.tempo_base_min) && s.tempo_base_min >= 0;
  const pecaOk = Number.isInteger(s.tempo_peca_min) && s.tempo_peca_min >= 0;
  if (!baseOk || !pecaOk) return 'Os tempos devem ser números inteiros de minutos (0 ou mais).';
  return '';
}

export async function abaServicos({ desenhar, aindaAtual }) {
  const { data, error } = await supabase.from('servicos').select('*').order('id');
  if (!aindaAtual()) return;

  const servicos = data || [];

  const linhas = servicos.map(s => `<tr>
    <td data-label="Nome"><input id="e${s.id}n" type="text" maxlength="60" value="${escapar(s.nome)}"></td>
    <td data-label="Descrição"><input id="e${s.id}d" type="text" maxlength="160" value="${escapar(s.descricao)}"></td>
    <td data-label="Ícone"><select id="e${s.id}i">${opcoesIcone(s.icone)}</select></td>
    <td data-label="Preço/peça"><input id="e${s.id}p" type="number" min="0" step="0.01" value="${s.preco_peca}" style="max-width:110px"></td>
    <td data-label="Base (min)"><input id="e${s.id}b" type="number" min="0" step="1" value="${s.tempo_base_min}" style="max-width:100px"></td>
    <td data-label="Por peça (min)"><input id="e${s.id}t" type="number" min="0" step="1" value="${s.tempo_peca_min}" style="max-width:100px"></td>
    <td data-label="Ativo"><input id="e${s.id}a" type="checkbox" ${s.ativo ? 'checked' : ''} aria-label="Ativo"></td>
    <td><button class="btn mini" data-ssalvar="${s.id}">Salvar</button></td></tr>`).join('');

  const tabela = servicos.length
    ? `<div class="scroll"><table class="tbl"><thead><tr><th>Nome</th><th>Descrição</th><th>Ícone</th><th>Preço/peça</th><th>Base (min)</th><th>Por peça (min)</th><th>Ativo</th><th></th></tr></thead><tbody>${linhas}</tbody></table></div>`
    : '<div class="vazio"><p>Nenhum serviço cadastrado.</p></div>';

  desenhar(moldura('servicos', `
    <p style="margin:0 0 14px">Cadastre os tipos de lavagem. A <strong>duração</strong> de um pedido é <strong>tempo base + peças × tempo por peça</strong>. Mudar preço ou tempo vale só para pedidos novos, os antigos mantêm o valor e o tempo de quando foram feitos. Para tirar um serviço do site, desmarque "Ativo" (serviços que já têm pedidos não podem ser apagados).</p>
    ${error ? '<p class="alert err">Não foi possível carregar os serviços. Rode o SQL funcionario-servicos-clientes.sql no Supabase.</p>' : ''}
    <p class="alert err" id="err" hidden></p>
    <form id="fs" class="filtros">
      <div><label for="n-n">Nome</label><input id="n-n" type="text" maxlength="60" required></div>
      <div><label for="n-d">Descrição</label><input id="n-d" type="text" maxlength="160" required></div>
      <div><label for="n-i">Ícone</label><select id="n-i">${opcoesIcone('wash')}</select></div>
      <div><label for="n-p">Preço por peça (R$)</label><input id="n-p" type="number" min="0" step="0.01" required></div>
      <div><label for="n-b">Tempo base (min)</label><input id="n-b" type="number" min="0" step="1" value="0" required></div>
      <div><label for="n-t">Tempo por peça (min)</label><input id="n-t" type="number" min="0" step="1" value="0" required></div>
      <div style="justify-content:flex-end"><button class="btn" type="submit" id="n-ok">Adicionar serviço</button></div>
    </form>
    ${tabela}`));

  function mostrarErro(texto) {
    $('err').textContent = texto;
    $('err').hidden = false;
  }

  $('fs').addEventListener('submit', async ev => {
    ev.preventDefault();
    $('err').hidden = true;

    const novo = lerCampos('n-');
    const problema = validar(novo);
    if (problema) return mostrarErro(problema);

    $('n-ok').disabled = true;
    const { error } = await supabase.from('servicos').insert({ ...novo, ativo: true });
    if (error) {
      $('n-ok').disabled = false;
      return mostrarErro('Não foi possível adicionar: ' + error.message);
    }

    limparCacheServicos();
    avisar('Serviço adicionado.');
    recarregar();
  });

  $('adm').addEventListener('click', async ev => {
    const botao = ev.target.closest('[data-ssalvar]');
    if (!botao) return;

    const id = botao.dataset.ssalvar;
    $('err').hidden = true;

    const editado = lerCampos('e' + id);
    const problema = validar(editado);
    if (problema) return mostrarErro(problema);

    botao.disabled = true;
    const { error } = await supabase.from('servicos')
      .update({ ...editado, ativo: $(`e${id}a`).checked })
      .eq('id', id);

    limparCacheServicos();
    avisar(error ? 'Não foi possível salvar o serviço.' : 'Serviço atualizado.', error ? 'err' : 'ok');
    recarregar();
  });
}
