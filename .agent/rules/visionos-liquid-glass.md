---
trigger: always_on
description: Standar desain VisionOS Translucent Liquid Glass dan prinsip keamanan RLS Supabase untuk Lumbung Data PKK Desa Belikurip
---

# Standar Desain VisionOS Translucent Liquid Glass

Saat membuat atau memodifikasi komponen UI dan utilitas `.glass*` di `app/globals.css`:

1. **Jangan gunakan opasitas pekat (`> 0.65`) pada permukaan kaca utama:**
   - `.glass` / `.glass-card` (Light): `linear-gradient(135deg, rgba(255, 255, 255, 0.50) 0%, rgba(255, 255, 255, 0.30) 100%)`
   - `.glass` / `.glass-card` (Dark): `linear-gradient(135deg, rgba(48, 72, 63, 0.46) 0%, rgba(16, 28, 23, 0.32) 100%)`
   - `.glass-panel` / `.glass-strong` (Light): `linear-gradient(135deg, rgba(255, 255, 255, 0.56) 0%, rgba(255, 255, 255, 0.36) 100%)`
   - `.glass-panel` / `.glass-strong` (Dark): `linear-gradient(135deg, rgba(52, 78, 68, 0.52) 0%, rgba(18, 30, 25, 0.38) 100%)`
2. **Gunakan Frosted Diffusion kuat:**
   - Wajib memakai `backdrop-filter: blur(40px) saturate(200%)` (dan `-webkit-backdrop-filter`) pada kartu, serta `blur(44px) saturate(200%+)` pada panel/sidebar agar permukaan kaca berembun halus (*smoky/milky frosted glass*) namun tetap transparan (*see-through*).
3. **Pertahankan 3D Specular Rim & Inner Highlight:**
   - Gunakan border putih semi-transparan (`rgba(255, 255, 255, 0.68–0.76)` di light mode, `0.22–0.25` di dark mode) dan `inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.88)` agar tepi kaca tampak menangkap cahaya.
4. **Pastikan `.glass-ambient` memiliki sebaran warna di seluruh viewport:**
   - Jangan menaruh semua radial gradient hanya di luar sudut layar (`-8%` / `110%`). Sebarkan orb warna lembut di area tengah dan tepi layar agar kartu kaca memiliki variasi warna latar untuk dibiaskan.
