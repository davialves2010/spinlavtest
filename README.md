# SpinLav — site estático + Supabase (GitHub + Vercel)

Site de **página única (SPA)**: `index.html` + `assets/spa.js`. A troca entre páginas é instantânea (sem recarregar), usando rotas por hash (`#servicos`, `#pedidos`, `#admin`…). Sem build. Banco e login: **Supabase**. Hospedagem: **Vercel**. Layout responsivo e instalável como app (PWA).

## Atores
- **Cliente**: cadastra-se, faz pedidos, agenda e acompanha seus pedidos (no celular, via PWA).
- **Funcionário** (`clientes.perfil = 'admin'`): opera a lavanderia pelo painel web (`#admin`).
- **Dono**: funcionário + gestão da equipe e registro de ações.

O banco de dados **não é ator**: é parte do sistema (Supabase, acessado pela API compartilhada entre o painel web e o PWA).

## Requisitos funcionais (RF) → site
| RF | Requisito | Onde no site |
|---|---|---|
| RF001 | Gerenciar cadastro de clientes | `#cadastro`, `#login` (cliente); painel → aba **Clientes** (funcionário, leitura) |
| RF002 | Registrar e consultar pedidos de lavagem | `#solicitar`, `#pedidos` |
| RF003 | Gerenciar serviços e tipos de lavagem | painel → aba **Serviços** (criar, editar preço/tempos, ativar/desativar) |
| RF004 | Realizar agendamentos, verificando horários e calculando a duração | `#agendar` (+ consulta em `#horarios`) |
| RF005 | Consultar clientes, pedidos e agendamentos conforme permissões | `#pedidos` (cliente); painel → abas **Agenda do dia**, **Todos os pedidos**, **Clientes** |

## Lista de eventos (LE) → site
| LE | Evento | Rota / tela |
|---|---|---|
| LE001 | Cliente solicita seu cadastro | `#cadastro` |
| LE002 | Cliente solicita registro de pedido | `#solicitar` |
| LE003 | Cliente solicita serviço de lavagem | escolha do serviço em `#solicitar` (cada pedido tem um serviço) |
| LE004 | Cliente consulta horários disponíveis | `#horarios` e a escolha do horário em `#agendar` |
| LE005 | Cliente solicita agendamento | `#agendar` |
| LE006 | Cliente consulta seus pedidos e agendamentos | `#pedidos` |
| LE007 | Funcionário consulta agendamentos e pedidos | painel (`#admin`) |

A **duração** não é evento: é regra interna do agendamento (`tempo_base + peças × tempo_por_peça`, calculada pelo gatilho do banco e exibida em `#agendar`).

## DFD nível 0 (renumerado)
| Nº | Processo | No site | Depósito |
|---|---|---|---|
| 1.0 | Gerenciar Clientes | `#cadastro`, `#login`, aba Clientes | D1 `clientes` |
| 2.0 | Registrar Pedidos | `#solicitar` | D2 `pedidos` |
| 3.0 | Gerenciar Serviços de Lavagem | painel → Serviços | D3 `servicos` |
| 4.0 | Consultar Disponibilidade | `#horarios`, horários em `#agendar` | lê D4 `agendamentos` e `bloqueios` (função `horarios_lotados`) |
| 5.0 | Realizar Agendamentos | `#agendar` (calcula a duração com os tempos de D3) | D4 `agendamentos` |
| 6.0 | Consultar Pedidos e Agendamentos | `#pedidos`, abas Agenda e Pedidos | lê D2, D4 |

Entidades externas: **Cliente** e **Funcionário**.

## Regras de negócio
- **Pedido × serviço × agendamento:** o *serviço* é o catálogo (tipo de lavagem, com preço e tempos); o *pedido* é a solicitação de um cliente para um serviço com N peças; o *agendamento* é a data, o horário e a **modalidade** (coleta em casa ou levar à lavanderia) do pedido.
- **Um pedido tem um serviço.** Para lavar com outro tipo de lavagem, o cliente faz outro pedido.
- **Conflito de horário:** até 3 pedidos por horário e respeito aos bloqueios, validado no banco.
- **Valor e tempo congelados:** `valor_estimado` e `tempo_estimado_min` são gravados no pedido pelo gatilho; mudar o preço do serviço depois não altera pedidos antigos.
- **Agenda:** seg–sex 8h–17h, sábado 8h–12h, domingo fechado, horários de 1 em 1 hora. Cancelar um pedido libera o horário.
- Na interface, a coluna `agendamentos.tipo` aparece como **Modalidade** (para não confundir com “tipo de lavagem”, que é o serviço).

## Como o site fala com o banco (Web × Mobile)
O cliente usa o site instalado como app (PWA) no celular; o funcionário usa o painel no computador. Os dois são o mesmo código e acessam o **mesmo Supabase** (API + Auth + RLS). Não há dois bancos: o que o cliente agenda aparece na hora no painel.

## 1) Supabase
1. Crie um projeto em https://supabase.com.
2. **SQL Editor** → rode, nesta ordem: `supabase/schema.sql`, `supabase/seguranca-admin.sql`, os SQLs de frete/pagamento que você já usa e **`supabase/funcionario-servicos-clientes.sql`**.
3. **Project Settings → API**: copie a Project URL e a anon key para `assets/config.js`.
4. Para testar rápido: **Authentication → Providers → Email** → desative "Confirm email" (em produção, deixe ligado — veja `SEGURANCA.md`).

## 2) GitHub
```bash
git add . && git commit -m "SpinLav: abas Serviços e Clientes, papel do Funcionário, documentação"
git push
```

## 3) Vercel
Add New → Project → importe o repositório → Framework "Other" → Deploy. Depois, no Supabase → Authentication → URL Configuration, coloque a URL da Vercel em Site URL.

## 4) Primeiro funcionário / dono
Cadastre-se e rode no SQL Editor:
```sql
update public.clientes set perfil = 'admin', dono = true where email = 'seu-email@exemplo.com';
```
Depois o dono promove os demais funcionários pela aba **Equipe**.

## Estrutura
- `index.html` — casca única (cabeçalho, rodapé e área de conteúdo)
- `assets/spa.js` — rotas, páginas e acesso ao Supabase
- `assets/config.js` — URL e chave do Supabase (**não sobrescreva o seu ao atualizar**)
- `supabase/` — SQLs do banco
- `docs/BANCO-DE-DADOS.md` — MER/DER e normalização (1FN, 2FN, 3FN)
- `docs/casos-de-uso.svg` — diagrama de casos de uso (UML)
- `SEGURANCA.md` — checklist e tabela de permissões

## Login com Google
1. Google Cloud Console → crie um projeto → **APIs e serviços → Tela de permissão OAuth** (tipo Externo) → **Credenciais → Criar credenciais → ID do cliente OAuth** (aplicativo da Web).
2. Em **URIs de redirecionamento autorizados**, cole `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Em **Origens JavaScript autorizadas**, `https://SEU-SITE.vercel.app`.
3. Supabase → **Authentication → Sign In / Providers → Google** → ative e cole o Client ID e o Client Secret.
4. Supabase → **Authentication → URL Configuration**: Site URL e Redirect URLs com o endereço da Vercel.
5. Rode no SQL Editor o `create or replace function public.handle_new_user()` do `schema.sql` (para pegar o nome da conta Google).

## Funcionalidades além do escopo dos requisitos
Frete por região, pagamento online, login com Google, verificação em duas etapas (MFA), WhatsApp e PWA foram acrescentados como **evolução do projeto**, sem alterar o fluxo principal documentado (cadastro → pedido → agendamento → consulta).
