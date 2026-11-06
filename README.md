# SpinLav — site estático + Supabase (pronto para GitHub e Vercel)

Site em HTML/CSS/JavaScript puro (sem build). Banco de dados e login: **Supabase**. Hospedagem: **Vercel**.

## 1) Criar o banco no Supabase
1. Crie um projeto em https://supabase.com.
2. Abra **SQL Editor**, cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.
4. Cole os dois valores em `assets/config.js`.
5. (Para testar rápido) **Authentication → Providers → Email**: desative "Confirm email". Em produção, deixe ativado.

## 2) Subir no GitHub
```bash
cd spinlav-site
git init
git add .
git commit -m "SpinLav: site com Supabase"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/spinlav.git
git push -u origin main
```
(Crie antes o repositório vazio `spinlav` em https://github.com/new.)

## 3) Publicar na Vercel
1. Em https://vercel.com → **Add New → Project** → importe o repositório `spinlav`.
2. Framework Preset: **Other**. Não precisa de build command nem output directory.
3. Clique em **Deploy**. Cada `git push` na `main` publica de novo.
4. No Supabase → **Authentication → URL Configuration**, coloque a URL da Vercel em **Site URL** (e em Redirect URLs).

## 4) Criar o administrador
Cadastre-se no site normalmente e, no SQL Editor, rode:
```sql
update public.profiles set perfil = 'admin' where email = 'seu-email@exemplo.com';
```
Depois entre de novo: o botão "Painel" aparece e você gerencia os pedidos.

## Funções
- Cadastro, login e logout (Supabase Auth)
- Solicitar serviço (valor estimado calculado no banco)
- Meus pedidos: acompanhar status e cancelar pedidos pendentes
- Painel admin: ver todos os pedidos e mudar o status

## Segurança
A `anon key` fica visível no navegador por natureza. Quem protege os dados são as regras **RLS** de `schema.sql`:
cliente só vê e cria os próprios pedidos; só admin vê tudo e altera status. Nunca use a `service_role key` neste projeto.
