# EcoBairro V2 — MVP conectado a banco

## O que esta versão resolve
- Área do morador com login.
- Cadastro do perfil e código anônimo.
- Registro mensal de água e energia.
- Indicadores por pessoa e comparação com metas.
- Diagnóstico básico.
- Controle explícito de consentimento para compartilhamento anônimo.
- SQL com Row Level Security para que cada morador enxergue apenas seus próprios registros.

## Como colocar no ar
1. Crie um projeto no Supabase.
2. Abra o SQL Editor e execute `supabase_schema.sql`.
3. No projeto web, copie `config.example.js` para `config.js`.
4. Preencha `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` com os dados do projeto.
5. Publique os arquivos HTML/CSS/JS em qualquer hospedagem estática.

A documentação atual do Supabase recomenda `@supabase/supabase-js` para o cliente JavaScript e destaca RLS como o mecanismo que define o que o cliente pode acessar. A publishable key pode ficar no cliente; chaves secretas/service devem permanecer apenas no servidor. Veja a documentação oficial antes de publicar em produção.

## Próximo passo de produto
Criar a área `/admin` com autenticação própria e relatórios agregados, preferencialmente por uma Edge Function/API protegida. A view `admin_anonymous_consumption` já prepara a base anonimizada.
