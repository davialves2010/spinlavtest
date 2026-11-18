# SpinLav

Site de uma lavanderia feito com HTML, CSS e JavaScript puro, usando o Supabase como banco e login. Hospedado na Vercel. O site é uma página só (SPA): as telas trocam pelo hash da URL (`#servicos`, `#pedidos`, `#admin`...), sem recarregar. Também dá pra instalar no celular como app (PWA).

## Quem usa
- **Cliente**: se cadastra, faz pedido, agenda e acompanha os pedidos.
- **Funcionário** (`clientes.perfil = 'admin'`): usa o painel em `#admin`.
- **Dono**: é funcionário e também gerencia a equipe e vê o registro de ações.

O banco não é um ator, ele faz parte do sistema. O painel e o app do cliente são o mesmo código e usam o mesmo Supabase.

## Requisitos funcionais
| RF | O que é | Onde fica |
|---|---|---|
| RF001 | Gerenciar cadastro de clientes | `#cadastro`, `#login`, `#perfil`, `#recuperar`. No painel, aba Clientes (só leitura) |
| RF002 | Registrar e consultar pedidos | `#solicitar`, `#pedidos` |
| RF003 | Gerenciar serviços e tipos de lavagem | painel, aba Serviços |
| RF004 | Agendar, checando horários e calculando a duração | `#agendar` e `#horarios` |
| RF005 | Consultar clientes, pedidos e agendamentos conforme a permissão | `#pedidos` (cliente) e abas Agenda, Pedidos e Clientes do painel |

## Eventos
| LE | Evento | Tela |
|---|---|---|
| LE001 | Cliente pede o cadastro | `#cadastro` |
| LE002 | Cliente registra pedido | `#solicitar` |
| LE003 | Cliente escolhe o serviço de lavagem | `#solicitar` (um serviço por pedido) |
| LE004 | Cliente consulta horários | `#horarios` e `#agendar` |
| LE005 | Cliente agenda | `#agendar` |
| LE006 | Cliente consulta seus pedidos | `#pedidos` |
| LE007 | Funcionário consulta agendamentos e pedidos | `#admin` |
| LE008 | Funcionário gerencia serviços | `#admin`, aba Serviços |

A duração não é um evento, é uma regra do agendamento: `tempo_base + peças × tempo_por_peça`, calculada por um gatilho no banco. Na tela de agendar aparece também a previsão de conclusão, que conta só o expediente (seg a sex 8h às 17h, sábado 8h às 12h, domingo fechado).

## DFD nível 0
| Nº | Processo | Tela | Depósito |
|---|---|---|---|
| 1.0 | Gerenciar clientes | `#cadastro`, `#login`, aba Clientes | `clientes` |
| 2.0 | Registrar pedidos | `#solicitar` | `pedidos` |
| 3.0 | Gerenciar serviços de lavagem | painel, Serviços | `servicos` |
| 4.0 | Consultar disponibilidade | `#horarios`, horários em `#agendar` | lê `agendamentos` e `bloqueios` (função `horarios_lotados`) |
| 5.0 | Realizar agendamentos | `#agendar` | `agendamentos` |
| 6.0 | Consultar pedidos e agendamentos | `#pedidos`, abas Agenda e Pedidos | lê `pedidos` e `agendamentos` |

Entidades externas: Cliente e Funcionário.

## Regras de negócio
- Serviço é o catálogo (tipo de lavagem, preço e tempos). Pedido é a solicitação de um cliente para um serviço com N peças. Agendamento é a data, o horário e a modalidade (coleta em casa ou levar à lavanderia).
- Funcionário não faz pedido. Só o cliente registra e agenda.
- Cada pedido tem um serviço só. Para outro tipo de lavagem, outro pedido.
- No máximo 3 pedidos por horário, respeitando os bloqueios. Quem valida é o banco.
- `valor_estimado` e `tempo_estimado_min` ficam gravados no pedido na hora em que ele é criado. Se o preço do serviço mudar depois, os pedidos antigos não mudam.
- Agenda de seg a sex 8h às 17h, sábado 8h às 12h, domingo fechado, de hora em hora. Cancelar um pedido libera o horário.
- Na tela, a coluna `agendamentos.tipo` aparece como "Modalidade", pra não confundir com tipo de lavagem.

## Como montar

### 1) Supabase
1. Criar um projeto em https://supabase.com.
2. No SQL Editor, rodar nesta ordem: `supabase/schema.sql`, `supabase/seguranca-admin.sql`, os SQLs de frete e pagamento, `supabase/funcionario-servicos-clientes.sql`, `supabase/documentar-colunas.sql` e `supabase/correcoes-reagendar-e-funcionario.sql`.
3. Em Project Settings > API, copiar a URL e a anon key para `assets/config.js`.
4. Pra testar rápido dá pra desligar o "Confirm email" em Authentication > Providers > Email. Em produção deixe ligado (ver `SEGURANCA.md`).

### 2) GitHub
```bash
git add .
git commit -m "mensagem do commit"
git push
```

### 3) Vercel
Add New > Project, importar o repositório, Framework "Other" e Deploy. Depois, no Supabase em Authentication > URL Configuration, colocar a URL da Vercel em Site URL.

### 4) Primeiro dono
Crie uma conta pelo site e rode no SQL Editor:
```sql
update public.clientes set perfil = 'admin', dono = true where email = 'seu-email@exemplo.com';
```
Depois o dono promove os outros funcionários pela aba Equipe.

## Pastas
```
index.html            página única (cabeçalho, conteúdo e rodapé)
sw.js, manifest       service worker e PWA
assets/
  spa.js              ponto de entrada: monta as rotas e inicia o site
  router.js           troca de tela pelo hash
  navegacao.js        ir() e recarregar()
  estado.js           usuário logado, mensagens e cache dos serviços
  supabase.js         cliente do Supabase
  layout.js           cabeçalho, rodapé e mensagens
  util.js             formatadores e funções pequenas
  disponibilidade.js  horários livres e previsão de conclusão
  config.js           URL e chave do Supabase (não sobrescreva a sua)
  negocio.js          WhatsApp e chave Pix da lavanderia
  views/              telas do cliente (publico, conta, pedidos)
  views/admin/        abas do painel (agenda, pedidos, clientes, servicos, frete, bloqueios, equipe, registro)
supabase/             SQLs do banco
docs/                 banco de dados e casos de uso
SEGURANCA.md          checklist e permissões
```

## Recuperar senha
No Supabase, em Authentication > URL Configuration, a URL do site precisa estar em Site URL e em Redirect URLs, porque o link do e-mail volta pra raiz do site. O texto do e-mail dá pra traduzir em Authentication > Email Templates > Reset Password.

## Login com Google
1. No Google Cloud Console, criar um projeto, configurar a tela de permissão OAuth (tipo Externo) e criar um ID de cliente OAuth do tipo aplicativo da Web.
2. Em URIs de redirecionamento, colocar `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Em Origens JavaScript, `https://SEU-SITE.vercel.app`.
3. No Supabase, em Authentication > Providers > Google, ativar e colar o Client ID e o Client Secret.
4. Conferir a URL do site em Authentication > URL Configuration.
5. Rodar no SQL Editor o `create or replace function public.handle_new_user()` do `schema.sql`, pra pegar o nome da conta Google.

## Extras
Frete por região, pagamento online, login com Google, verificação em duas etapas, WhatsApp e PWA foram acrescentados depois, como evolução do projeto. O fluxo principal continua o mesmo: cadastro, pedido, agendamento e consulta.
