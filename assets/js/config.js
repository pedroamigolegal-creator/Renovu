/* ------------------------------------------------------------------
   Configuração do Renovu
   Supabase → Project Settings → API:
     • Project URL        → SUPABASE_URL
     • anon / public key  → SUPABASE_ANON_KEY   (essa chave PODE ficar no site;
                                                  a segurança vem do RLS do schema.sql)
   NUNCA coloque a chave "service_role" aqui.
------------------------------------------------------------------- */
window.RENOVU_CONFIG = {
  SUPABASE_URL: 'https://vgfxkxvuhicqyjyzduyi.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_U2kWWGIBA5XzbLKukIfqcQ_8rHWA6EV',

  // O cadastro pede só username + senha, mas o Supabase exige um e-mail.
  // Por baixo dos panos o login usa  username@EMAIL_DOMAIN  (nunca é mostrado).
  // Não precisa ser um domínio real nem receber e-mail: serve só de identificador.
  EMAIL_DOMAIN: 'renovu.app'
};
