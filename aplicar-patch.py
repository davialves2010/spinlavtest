# Uso (na pasta do projeto):  python3 aplicar-patch.py
# Altera assets/spa.js (faz backup em assets/spa.js.bak). Se algum trecho não for encontrado, não grava nada.
import shutil
F = 'assets/spa.js'
s = open(F, encoding='utf-8').read()
def rep(old, new):
    global s
    assert s.count(old) == 1, 'Trecho não encontrado (ou repetido): ' + old[:70]
    s = s.replace(old, new)

rep("""const AG_COLS = 'data_agendada,horario,tipo,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf';""",
"""const AG_COLS = 'data_agendada,horario,tipo,telefone,cep,logradouro,numero,complemento,bairro,cidade,uf,forma_pagamento,frete';
const PAGTO = { pix: 'Pix', cartao: 'Cartão (maquininha)', dinheiro: 'Dinheiro' };
const PIX_CHAVE = '';   // chave Pix da lavanderia (vazio = não mostra no aviso de confirmação)""")

rep("""      <label for="dt">${re ? 'Nova data' : 'Data'}</label><input id="dt" type="date" min="${hoje()}" required>""",
"""      <label for="pg">Forma de pagamento</label>
      <select id="pg">${Object.entries(PAGTO).map(([k, t]) => `<option value="${k}" ${(src.forma_pagamento || 'pix') === k ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <p class="note">O pagamento é feito na entrega ou na retirada das peças, na forma escolhida.</p>
      <div class="resumo" id="fr" hidden></div>
      <label for="dt">${re ? 'Nova data' : 'Data'}</label><input id="dt" type="date" min="${hoje()}" required>""")

rep("""  $('tipo').addEventListener('change', () => { $('err').hidden = true; modo(); });""",
"""  /* frete: calculado pelo banco (rpc calcular_frete) conforme cidade/bairro */
  const base = Number(p.valor_estimado) || 0; let foraArea = false, tFrete, nFrete = 0;
  const calcFrete = async () => {
    const fr = $('fr'), my = ++nFrete;
    if ($('tipo').value !== 'coleta') { foraArea = false; fr.innerHTML = `<span>Frete: <strong>Grátis (você leva à lavanderia)</strong></span><span>Total estimado: <strong>${money(base)}</strong></span>`; fr.hidden = false; return; }
    const cid = $('cid').value.trim(), uf = $('uf').value.trim().toUpperCase();
    if (!cid || uf.length !== 2) { foraArea = false; fr.hidden = true; return; }
    const { data, error } = await sb.rpc('calcular_frete', { p_cidade: cid, p_uf: uf, p_bairro: $('bai').value.trim() });
    if (!live() || my !== nFrete) return;
    if (error || data == null) { foraArea = true; fr.innerHTML = '<span>Ainda não entregamos neste endereço. Escolha “Levar à lavanderia” ou outro endereço.</span>'; }
    else { foraArea = false; const f = Number(data); fr.innerHTML = `<span>Frete: <strong>${f ? money(f) : 'Grátis'}</strong></span><span>Total estimado: <strong>${money(base + f)}</strong></span>`; }
    fr.hidden = false;
  };
  const deb = () => { clearTimeout(tFrete); tFrete = setTimeout(calcFrete, 400); };
  ['cid', 'uf', 'bai'].forEach(k => $(k).addEventListener('input', deb));
  $('tipo').addEventListener('change', () => { $('err').hidden = true; modo(); calcFrete(); });
  calcFrete();""")

rep("""      m.hidden = true; $('num').focus();""", """      m.hidden = true; calcFrete(); $('num').focus();""")

rep("""    if (col && (end.cep.length !== 8 || !/^[A-Z]{2}$/.test(end.uf))) return falha('Confira o CEP (8 números) e a UF (2 letras) do endereço.');""",
"""    if (col && (end.cep.length !== 8 || !/^[A-Z]{2}$/.test(end.uf))) return falha('Confira o CEP (8 números) e a UF (2 letras) do endereço.');
    if (col && foraArea) return falha('Ainda não entregamos neste endereço. Escolha “Levar à lavanderia” ou outro endereço.');""")

rep("""horario: h, telefone: tel, ...end });""", """horario: h, telefone: tel, forma_pagamento: $('pg').value, ...end });""")

rep("""    await sb.from('clientes').update({ ...end, telefone: tel }).eq('id', user.id);""",
"""    if (re) await sb.from('agendamentos').update({ forma_pagamento: $('pg').value }).eq('pedido_id', p.id);   // reagendamento: atualiza a forma de pagamento
    await sb.from('clientes').update({ ...end, telefone: tel }).eq('id', user.id);""")

rep("""às ${h}. Obrigado!`""", """às ${h}. Obrigado!${$('pg').value === 'pix' && PIX_CHAVE ? ' Chave Pix: ' + PIX_CHAVE + '.' : ''}`""")

rep("""const quando = (p, curto, comEnd) => {""",
"""const totalTxt = p => { const a = ag(p), f = Number(a?.frete || 0); return `${money(Number(p.valor_estimado) + f)}${a ? `<br><small>${f ? 'com frete ' + money(f) : 'sem frete'} · ${PAGTO[a.forma_pagamento] || '—'}</small>` : ''}`; };
const quando = (p, curto, comEnd) => {""")

rep("""<td data-label="Valor est.">${money(p.valor_estimado)}</td>""", """<td data-label="Valor est.">${totalTxt(p)}</td>""")
rep("""<td data-label="Valor">${money(p.valor_estimado)}</td>""", """<td data-label="Valor">${totalTxt(p)}</td>""")

shutil.copy(F, F + '.bak')
open(F, 'w', encoding='utf-8').write(s)
print('Pronto! Backup em assets/spa.js.bak')
