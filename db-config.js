/* =====================================================================
   db-config.js  —  Konfigurasi koneksi Supabase untuk undangan
   ---------------------------------------------------------------------
   Isi dua nilai di bawah dengan kredensial project Supabase kamu:
     - url     : Project URL   (Settings > API > Project URL)
     - anonKey : anon public key (Settings > API > Project API keys)
   Biarkan kosong ('') untuk mode demo/offline (tanpa backend).
   File ini AMAN dibagikan ke publik (anon key memang untuk sisi klien;
   keamanan data dijaga oleh Row Level Security di Supabase).
   ===================================================================== */
window.WEDDING_DB_CONFIG = {
  url: 'https://jrsquphiknvqwscwwdlk.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impyc3F1cGhpa252cXdzY3d3ZGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1Mjg0NDMsImV4cCI6MjEwMDEwNDQ0M30.NoGCj_l4nLiNSgPMHQyM9sCDUf34UdIQVVJRq-QQ1wQ',
  // slug default saat dibuka langsung (file:// atau tanpa ?site=)
  defaultSlug: 'sekar-bimo'
};
