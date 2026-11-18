# Segurança do SpinLav

## Configurar no Supabase
1. Authentication > Providers > Email: deixar "Confirm email" ligado, pra ninguém criar conta com e-mail dos outros.
2. Authentication > URL Configuration: colocar o endereço do site em Site URL e Redirect URLs.
3. Confirmar que o MFA do tipo TOTP está ativado.
4. Nunca colocar a `service_role key` no site. No `config.js` vai só a anon (publishable) key.

## Ordem pra ativar o MFA do painel
1. Rodar `supabase/seguranca-admin.sql` e depois `supabase/funcionario-servicos-clientes.sql` no SQL Editor e fazer o deploy.
2. Entrar no painel. O site pede pra cadastrar um app autenticador (Google Authenticator, Authy...). Escanear o QR Code e digitar o código.
3. Sair, entrar de novo e ver se o painel pede o código.
4. Só depois ligar a exigência no banco:
   `update public.config_seguranca set valor = true where chave = 'mfa_admin';`
   Se der problema, desligar com `valor = false`.

## Papéis
- **Cliente**: só vê e mexe nos próprios pedidos.
- **Funcionário** (`perfil = 'admin'`): cuida da agenda, pedidos, serviços, bloqueios e frete. Consulta clientes só pra leitura.
- **Dono**: faz tudo que o funcionário faz, mais a aba Equipe (promover e remover funcionários) e a aba Registro. Pra mudar quem é o dono: `update public.clientes set dono = true where email = '...';`

## Quem pode o quê
| Ação | Cliente | Funcionário | Dono |
|---|---|---|---|
| Ver serviços ativos | sim | sim | sim |
| Criar e editar serviços, preços e tempos | não | sim | sim |
| Cadastrar-se e editar o próprio perfil | sim | sim | sim |
| Ver a lista de clientes (só leitura) | não | sim | sim |
| Registrar pedido e agendar | só o seu | não | não |
| Ver, cancelar e reagendar pedidos | só os seus | não | não |
| Ver todos os pedidos e a agenda | não | sim | sim |
| Mudar status e marcar como pago | não | sim | sim |
| Consultar horários | sim | sim | sim |
| Bloquear datas e definir frete | não | sim | sim |
| Promover ou remover funcionários | não | não | sim |
| Ver o Registro de ações | não | não | sim |

Se perguntarem quem pode ver ou alterar dados de outros clientes: só funcionário e dono, e isso é garantido no banco (RLS e funções `security definer`), não só escondendo botão no site. O funcionário só consulta, nenhuma tela deixa ele alterar o cadastro de outro cliente.

## Se uma conta de funcionário for invadida
1. `update public.clientes set perfil = 'cliente', dono = false where email = '...';`
2. No Supabase, Authentication > Users, bloquear ou excluir o usuário (isso derruba as sessões).
3. Olhar a aba Registro pra ver o que foi feito.
