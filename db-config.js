/* ============================================================
   db-config.js  —  ISI DENGAN DATA SUPABASE ANDA.
   ------------------------------------------------------------
   Cara mendapatkan:
   Supabase Dashboard > Project Settings > Data API / API
     • url      = "Project URL"      (mis. https://abcxyz.supabase.co)
     • anonKey  = "anon public" key
   Catatan: anon key MEMANG boleh publik di front-end — keamanan
   dijaga oleh Row Level Security (RLS) di database, bukan oleh key.
   ============================================================ */
window.WEDDING_DB = {
  url:         "",            // contoh: "https://abcxyz.supabase.co"
  anonKey:     "",            // anon public key
  defaultSlug: "sekar-bimo"   // slug default bila URL tidak menyebut ?site=/subdomain/path
};
