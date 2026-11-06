# SpinLav — site estático + Supabase (GitHub + Vercel)

HTML/CSS/JavaScript puro, sem build. Banco e login: **Supabase**. Hospedagem: **Vercel**. Layout responsivo (menu hambúrguer no celular, tabelas viram cartões, cards em 1/2/3 colunas).

## Como o site segue o DFD Nível 0
| DFD | No site | No banco |
|---|---|---|
| 1.0 Cadastrar Cliente | `cadastro.html` (+ `login.html`) | D1 `clientes` |
| 2.0 Registrar Pedido | `solicitar.html` | D2 `pedidos` |
| 3.0 Registrar Serviço de Lavagem | escolha do serviço/tipo de lavagem em `solicitar.html` | D3 `servicos` |
| 5.0 Calcular Tempo de Lavagem | tempo estimado (base + peças × tempo/peça) exibido ao solicitar e nos pedidos | colunas `tempo_*` + gatilho |
| 4.0 Realizar Agendamento | `agendar.html` (tipo, data e horário; confirmação) | D4 `agendamentos` |
| 5.0 Consultar Disponibilidade | `disponibilidade.html` e a escolha de horário em `agendar.html` | função `horarios_lotados` |

Fluxo do cliente: Cadastro → Pedido (com tempo estimado) → Agendamento → Confirmação em "Meus pedidos".

## 1) Supabase
1. Crie um projeto em https://supabase.com.
2. **SQL Editor** → cole `supabase/schema.sql` → **Run** (o início do arquivo apaga tabelas da versão anterior).
3. **Project Settings → API**: copie a Project URL e a anon key para `assets/config.js`.
4. Para testar rápido: **Authentication → Providers → Email** → desative "Confirm email".

## 2) GitHub
```bash
cd spinlav-site
git init && git add . && git commit -m "SpinLav: site com Supabase e DFD"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/spinlav.git
git push -u origin main
```

## 3) Vercel
Add New → Project → importe o repositório → Framework "Other" → Deploy. Depois, no Supabase → Authentication → URL Configuration, coloque a URL da Vercel em Site URL.

## 4) Administrador
Cadastre-se e rode no SQL Editor:
```sql
update public.clientes set perfil = 'admin' where email = 'seu-email@exemplo.com';
```

## Regras de agenda (editáveis em `schema.sql` e `assets/app.js`)
Seg–sex 8h–17h, sábado 8h–12h, domingo fechado, horários de 1 em 1 hora, até 3 pedidos por horário. Cancelar um pedido libera o horário.
