/* TalentCI — config.js
   Configuration du projet Supabase utilisé par le site.

   🔐 SÉCURITÉ : aucun identifiant admin n'est codé en dur. L'accès admin
   est déterminé par `profils.type = 'admin'` et surtout par les policies
   RLS de Supabase (voir sql/). Masquer le bouton "Admin" côté client
   n'est qu'un confort d'interface : la vraie protection est en base. */

/* ┌─────────────────────────────────────────────────────────┐
   │  COLLE TES CLÉS ICI  ↓↓↓  (ou laisse "" pour config UI) │
   └─────────────────────────────────────────────────────────┘ */
const CONFIG_SUPABASE = {
  url: "https://zqjzcuttmocmwjesvwdw.supabase.co",
  key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxanpjdXR0bW9jbXdqZXN2d2R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NjM0MDcsImV4cCI6MjA5MTMzOTQwN30.Suw4HBPl3JNn_xIYmbm6MaxEAmkL9JuHrjiMcz1-1EY"
  // Clé "anon / public" — conçue pour être visible côté client, ce n'est pas un secret.
  // Codée en dur ici pour que le site fonctionne sur tout appareil sans qu'un
  // visiteur ait besoin de reconfigurer Supabase lui-même (auparavant stockée
  // en localStorage = à refaire à chaque nouveau navigateur/téléphone).
};
/* ┌─────────────────────────────────────────────────────────┐
   │  FIN DE LA CONFIGURATION                                 │
   └─────────────────────────────────────────────────────────┘ */
