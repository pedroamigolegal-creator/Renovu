/* ------------------------------------------------------------------
   Configuração do Renovu
   Supabase → Project Settings → API:
     • Project URL        → SUPABASE_URL
     • anon / public key  → SUPABASE_ANON_KEY   (essa chave PODE ficar no site;
                                                  a segurança vem do RLS do schema.sql)
   NUNCA coloque a chave "service_role" aqui.
------------------------------------------------------------------- */
window.RENOVU_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // O cadastro pede só username + senha, mas o Supabase exige um e-mail.
  // Por baixo dos panos o login usa  username@EMAIL_DOMAIN  (nunca é mostrado).
  // Coloque o seu domínio da Vercel (sem "www").
  EMAIL_DOMAIN: 'renovu.app'
};
