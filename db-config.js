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
  url:         "https://jrsquphiknvqwscwwdlk.supabase.co",            // contoh: "https://abcxyz.supabase.co"
  anonKey:     "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3F1cGhpa252cXdzY3d3ZGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mjg0NDMsImV4cCI6MjEwMDEwNDQ0M30.NoGCj_l4nLiNSgPMHQyM9sCDUf34UdIQVVJRq-QQ1wQ",            // anon public key
  defaultSlug: "sekar-bimo"   // slug default bila URL tidak menyebut ?site=/subdomain/path
};
