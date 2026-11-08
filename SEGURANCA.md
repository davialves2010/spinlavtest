# SpinLav — checklist de segurança

## No Supabase (configuração, sem código)
1. **Authentication → Providers → Email → "Confirm email" LIGADO.** Evita contas com e-mail de terceiros.
2. **Authentication → URL Configuration:** Site URL e Redirect URLs com o endereço do site.
3. **Authentication → Multi-Factor (ou Sign In / Providers → MFA):** confirme que o **TOTP** está ativado.
4. Não compartilhe a `service_role key` (só a `anon/publishable key` vai no `config.js`).

## Ordem para ativar
1. Rode `supabase/seguranca-admin.sql` no SQL Editor e faça o deploy do site.
2. Entre no painel: o site pedirá para cadastrar o app autenticador (Google Authenticator, Authy, etc.). Escaneie o QR Code e digite o código.
3. Saia, entre de novo e confirme que o painel abre pedindo o código.
4. **Só então** ligue a exigência no banco:
   `update public.config_seguranca set valor = true where chave = 'mfa_admin';`
   Em emergência, desligue com `valor = false`.

## Papéis
- **Cliente:** vê e mexe só nos próprios pedidos.
- **Administrador:** opera agenda, pedidos e bloqueios.
- **Dono:** tudo do administrador + aba **Equipe** (promover/remover admins) + aba **Registro**.
  Para mudar quem é dono, use o SQL Editor: `update public.clientes set dono = true where email = '...';`

## Se uma conta admin for comprometida
1. `update public.clientes set perfil = 'cliente', dono = false where email = '...';`
2. Supabase → Authentication → Users → bloquear/excluir o usuário (isso derruba as sessões).
3. Consulte a aba **Registro** para ver o que foi feito.
