# SpinLav — checklist de segurança

## No Supabase (configuração, sem código)
1. **Authentication → Providers → Email → "Confirm email" LIGADO.** Evita contas com e-mail de terceiros.
2. **Authentication → URL Configuration:** Site URL e Redirect URLs com o endereço do site.
3. **Authentication → Multi-Factor (ou Sign In / Providers → MFA):** confirme que o **TOTP** está ativado.
4. Não compartilhe a `service_role key` (só a `anon/publishable key` vai no `config.js`).

## Ordem para ativar
1. Rode `supabase/seguranca-admin.sql` e depois `supabase/funcionario-servicos-clientes.sql` no SQL Editor e faça o deploy do site.
2. Entre no painel: o site pedirá para cadastrar o app autenticador (Google Authenticator, Authy, etc.). Escaneie o QR Code e digite o código.
3. Saia, entre de novo e confirme que o painel abre pedindo o código.
4. **Só então** ligue a exigência no banco:
   `update public.config_seguranca set valor = true where chave = 'mfa_admin';`
   Em emergência, desligue com `valor = false`.

## Papéis
- **Cliente:** vê e mexe só nos próprios pedidos.
- **Funcionário** (`perfil = 'admin'` no banco): opera agenda, pedidos, serviços, bloqueios e frete; consulta clientes (somente leitura).
- **Dono:** tudo do funcionário + aba **Equipe** (promover/remover funcionários) + aba **Registro**.
  Para mudar quem é dono, use o SQL Editor: `update public.clientes set dono = true where email = '...';`

## Tabela de permissões (quem pode ver ou alterar o quê)
| Informação / ação | Cliente | Funcionário | Dono |
|---|---|---|---|
| Ver catálogo de serviços ativos | ✔ | ✔ | ✔ |
| Criar/editar serviços, preços e tempos; ativar/desativar | — | ✔ | ✔ |
| Cadastrar-se e editar o próprio perfil | ✔ | ✔ | ✔ |
| Ver lista de clientes (nome, e-mail, telefone, nº de pedidos) | — | ✔ (leitura) | ✔ (leitura) |
| Registrar pedido e agendar | só em nome próprio | — | — |
| Ver/cancelar/reagendar pedidos | só os próprios | — | — |
| Ver todos os pedidos e a agenda | — | ✔ | ✔ |
| Alterar status do pedido e marcar pago | — | ✔ | ✔ |
| Consultar horários disponíveis | ✔ | ✔ | ✔ |
| Bloquear datas/horários e definir frete | — | ✔ | ✔ |
| Promover ou remover funcionários | — | — | ✔ |
| Ver o Registro (auditoria) de ações | — | — | ✔ |

Resposta para a banca — *“quem pode consultar ou alterar dados de outros clientes?”*: só funcionários e o dono, e isso é imposto **no banco** (RLS e funções `security definer`), não apenas escondendo botões no site. O funcionário consulta clientes em modo leitura; nenhuma tela permite alterar o cadastro de outro cliente.

## Se uma conta de funcionário for comprometida
1. `update public.clientes set perfil = 'cliente', dono = false where email = '...';`
2. Supabase → Authentication → Users → bloquear/excluir o usuário (isso derruba as sessões).
3. Consulte a aba **Registro** para ver o que foi feito.
