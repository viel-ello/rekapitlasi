# Review Project Website Rekapitulasi PKK

Tanggal review: 17 Juni 2026
Reviewer: Codex, berperan sebagai web developer dan reviewer teknis
Project path: `C:\Users\ipw26\OneDrive\Documents\rekapitlasi`

## Ringkasan Eksekutif

Project ini sudah jauh lebih matang daripada catatan backlog lama. Beberapa fitur yang sebelumnya disebut belum ada ternyata sudah dikerjakan sebagian atau penuh, misalnya AI mutation dry-run, period workflow badge, notifikasi dasar, skeleton loading, mobile card, quick jump antar dusun, dan import preview.

Hasil verifikasi lokal:

- `npm test`: lulus, 15 test suite, 161 test.
- `npm run build`: berhasil dengan Next.js 16.2.5.
- Build masih memberi warning konfigurasi Supabase anon key yang perlu ditangani sebelum deployment publik.

Secara umum, fondasi aplikasi sudah layak lanjut, tetapi ada beberapa risiko produksi dan gap UX yang harus diprioritaskan sebelum aplikasi dipakai lebih luas oleh banyak operator.

## Temuan Prioritas Tinggi

### 1. Supabase public client fallback ke service role

Build menghasilkan warning berulang bahwa `NEXT_PUBLIC_SUPABASE_ANON_KEY` belum diset, sehingga `supabaseAnon` fallback ke service role.

Dampak:

- Endpoint publik memakai client yang berpotensi bypass RLS.
- Defense-in-depth public API melemah.
- Kalau ada bug allowlist, dampaknya lebih besar karena client punya hak service role.

Referensi kode:

- `lib/supabase.js:31`
- `lib/supabase.js:42`

Saran:

- Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` di `.env.local` dan environment deployment.
- Ubah `supabaseAnon` agar fail-fast di production jika anon key tidak tersedia.
- Hindari fallback service role untuk public endpoint pada mode production.
- Tambahkan test atau guard config agar warning ini tidak lolos diam-diam saat deploy.

### 2. Risiko duplikasi `report_periods` untuk periode tahunan

Schema memakai unique constraint `UNIQUE(table_name, tahun, bulan)`. Pada PostgreSQL, nilai `NULL` pada kolom unique tidak dianggap sama, sehingga row dengan `bulan = NULL` masih bisa duplikat untuk table dan tahun yang sama.

Dampak:

- `upsert(... onConflict: 'table_name,tahun,bulan')` untuk periode tahunan bisa tidak menjamin satu row.
- Query `maybeSingle()` berisiko gagal jika sudah ada lebih dari satu row status periode non-bulanan.
- Workflow draft, submit, approve, lock bisa menjadi tidak konsisten.

Referensi kode:

- `supabase_schema_updates_v4.sql:21`
- `app/api/periods/route.js:154`

Saran:

- Buat migration non-destructive untuk menjamin uniqueness periode tahunan.
- Opsi aman: tambah partial unique indexes:
  - unique `(table_name, tahun)` where `bulan is null`
  - unique `(table_name, tahun, bulan)` where `bulan is not null`
- Bersihkan duplikat existing secara terukur dalam migration terpisah atau script audit manual.
- Sesuaikan logic upsert jika perlu, karena `onConflict` ke partial unique index tidak selalu sesederhana constraint biasa.
- Tambahkan test untuk transisi status tahunan dan bulanan.

### 3. Notifikasi periode bulanan berpotensi salah query

Di `lib/notifications.js`, query period setelah action approve, return, dan lock memakai:

```js
.is('bulan', bulan === null ? null : undefined)
```

Untuk `bulan` non-null, query ini tidak memfilter `bulan` dengan benar.

Dampak:

- `submitted_by` dan `approved_by` bisa tidak ditemukan untuk periode bulanan.
- Notifikasi approve, return, atau lock untuk `data_umum`, `data_rekap_dawis`, dan `data_bumil` bisa tidak terkirim.
- Admin merasa sudah menjalankan workflow, tetapi operator tidak mendapat sinyal revisi atau persetujuan.

Referensi kode:

- `lib/notifications.js:82`
- `lib/notifications.js:86`

Saran:

- Gunakan helper query periode yang sama dengan `periodLock`, yaitu `.is('bulan', null)` jika null dan `.eq('bulan', bulan)` jika ada nilai.
- Tambahkan unit test untuk `createPeriodNotifications` pada bulan null dan bulan non-null.
- Jangan silent semua error saat development/test; minimal log structured agar mudah dilacak.

### 4. Import Excel belum month-aware secara penuh

`data_umum`, `data_rekap_dawis`, dan `data_bumil` sekarang bulanan, tetapi preview import dan confirm masih belum konsisten.

Temuan:

- Preview hanya memfilter `data_bumil` ke bulan 12.
- `data_umum` dan `data_rekap_dawis` tidak difilter bulan pada preview.
- Confirm import default ke bulan 12 jika row tidak membawa bulan.

Dampak:

- Preview bisa membandingkan data terhadap bulan yang salah.
- User bisa menyimpan data ke Desember tanpa sadar.
- Import bisa menimpa snapshot bulan 12 padahal user bermaksud bulan aktif.

Referensi kode:

- `lib/excel/previewDiff.js:118`
- `lib/excel/previewDiff.js:119`
- `lib/excel/importToSupabase.js:93`
- `lib/excel/importToSupabase.js:96`

Saran:

- Jadikan bulan parameter eksplisit di endpoint preview dan confirm import.
- UI import harus menampilkan pilihan bulan sebelum preview dan sebelum confirm.
- Preview diff harus membandingkan table bulanan dengan `tahun` dan `bulan` target.
- Jangan default diam-diam ke bulan 12 kecuali user memilih mode import tahunan/snapshot Desember.
- Tambahkan test untuk import `data_umum`, `data_rekap_dawis`, dan `data_bumil` pada bulan selain 12.

## Temuan Prioritas Menengah

### 5. Cache `/api/dusun` masih hanya client-side

Sudah ada `getDusunCached()` dengan TTL 60 detik di client. Namun route `/api/dusun` tetap query Supabase setiap request yang sampai ke server.

Dampak:

- Saat banyak user atau banyak tab aktif, request server tetap bisa membebani database.
- Cache client membantu, tetapi tidak melindungi API dari request langsung atau cold page loads.

Referensi kode:

- `app/api/dusun/route.js:12`
- `lib/fetchDusun.js:14`
- `lib/fetchDusun.js:23`

Saran:

- Tambahkan module-level cache di route `/api/dusun` dengan TTL pendek, misalnya 60 detik.
- Invalidate cache setelah admin mengubah dusun.
- Pertimbangkan `Cache-Control` private/max-age rendah jika sesuai auth model.

### 6. Aksesibilitas modal dan dropdown belum konsisten

Beberapa modal sudah lebih baik, misalnya `EditModeModal` punya `role="dialog"` dan `aria-modal`. Namun modal lain dan dropdown utama belum konsisten.

Dampak:

- Keyboard user sulit menutup modal/dropdown dengan Escape.
- Focus bisa berpindah ke belakang modal.
- Screen reader belum mendapat konteks dialog yang lengkap.

Referensi kode:

- `components/ConfirmModal.js:29`
- `components/Sidebar.js:175`
- `components/Topbar.js:130`
- `components/Topbar.js:187`
- `components/DashboardToolbar.jsx:105`

Saran:

- Buat komponen reusable `Dialog` dan `Popover`.
- Tambahkan `aria-modal`, `aria-labelledby`, Escape close, focus restore, dan basic focus trap.
- Terapkan ke ConfirmModal, password modal, template dialog, notifikasi dropdown, dan profile dropdown.

### 7. Dark mode dan tabel masih bercampur inline style

Beberapa tabel nested memakai inline style dengan background putih dan warna hard-coded. Ini membuat dark mode tidak sepenuhnya konsisten meskipun `globals.css` sudah punya override dark mode.

Dampak:

- Tabel bisa terlihat terlalu terang di dark mode.
- Hover/sticky column bisa tidak menyatu dengan tema.
- Maintenance styling makin sulit karena warna tersebar di inline style.

Referensi area:

- `components/NestedDataPage.js` bagian table header/body/footer.
- `components/PokjaDataPage.js` bagian sticky cells dan action column.
- `app/globals.css` bagian `.dark` override.

Saran:

- Pindahkan warna tabel ke CSS class atau token Tailwind.
- Gunakan class dark mode langsung, bukan inline `background: '#fff'`.
- Audit kontras text untuk badge kecil, status, dan input warning/error.

## Temuan UI/UX dan Fitur

### Yang sudah baik

- Dashboard sudah punya KPI, trend card, chart per dusun, dan matrix kelengkapan.
- Data entry mobile sudah memakai card collapsible dan quick jump antar dusun.
- Tabel desktop sudah punya sticky column dan beberapa mode edit.
- AI mutation sudah memakai preview dan confirm, bukan langsung menulis database.
- Import Excel sudah punya preview/diff dan confirm flow.
- Notifikasi dasar sudah aktif di Topbar dan halaman notifikasi.
- Test coverage server cukup baik untuk auth, permission, security, import row-level, public allowlist, dan data quality.

### Saran UI/UX lanjutan

- Tambahkan halaman atau widget "Pekerjaan Saya" untuk operator sesuai role: data belum lengkap, perlu revisi, dan periode menunggu submit.
- Buat Admin Approval Queue agar admin tidak perlu membuka tiap halaman data untuk approve/return/lock.
- Perjelas status periode pada dashboard, bukan hanya pada halaman edit.
- Buat import wizard 3 langkah: pilih file, pilih tahun/bulan, review diff, confirm.
- Tambahkan filter "hanya bermasalah" pada tabel besar agar operator cepat menemukan warning/error.
- Tambahkan command/search palette sederhana untuk lompat ke halaman Pokja, dusun, import, report, dan admin.
- Tambahkan empty/error state yang memberi aksi jelas, misalnya "Unduh template", "Import data", atau "Isi data dusun ini".
- Tambahkan audit trail ringan di halaman data: siapa terakhir mengubah dan kapan.
- Tambahkan onboarding role-based: admin, pokja, kader dusun, user read-only.

## Prioritas Perbaikan yang Disarankan

### Fase 1 - Keamanan dan integritas data

1. Set dan enforce `NEXT_PUBLIC_SUPABASE_ANON_KEY` untuk public endpoint.
2. Perbaiki uniqueness `report_periods` untuk bulan null dan non-null.
3. Perbaiki query notifikasi bulanan.
4. Tambahkan test untuk period workflow dan notifikasi.

### Fase 2 - Import dan workflow operasional

1. Jadikan import preview/confirm month-aware.
2. Ubah UI import menjadi wizard dengan pilihan bulan eksplisit.
3. Tambahkan server-side cache `/api/dusun` dan invalidasi setelah admin update.
4. Tambahkan approval queue untuk admin.

### Fase 3 - UI/UX dan aksesibilitas

1. Buat reusable Dialog/Popover yang accessible.
2. Terapkan focus trap, Escape close, dan focus restore.
3. Rapikan dark mode tabel dan hapus warna hard-coded inline.
4. Tambahkan filter cepat untuk data bermasalah dan pekerjaan saya.

## Prompt untuk Claude Opus 4.8

```markdown
Anda adalah Senior Full-Stack Next.js Developer, UI/UX Engineer, dan Database Safety Reviewer. Anda akan memperbaiki project "Sistem Rekapitulasi Data PKK Kecamatan Baturetno".

Konteks project:
- Path project: `C:\Users\ipw26\OneDrive\Documents\rekapitlasi`
- Stack: Next.js App Router 16.2.5, React 19, Supabase, Tailwind CSS, Jest.
- Unit data utama: dusun.
- Tabel bulanan: `data_umum`, `data_rekap_dawis`, `data_bumil`.
- Test saat review terakhir: `npm test` lulus 15 suites / 161 tests.
- Build saat review terakhir: `npm run build` berhasil, tetapi ada warning Supabase anon key.

Aturan kerja wajib:
- Jangan menjalankan command destruktif seperti `git reset --hard`, `git checkout --`, atau query database destruktif.
- Jangan mengubah data produksi secara langsung.
- Buat perubahan bertahap per fase.
- Pertahankan backward compatibility untuk alias lama seperti `desa`/`data_kegiatan_warga` jika masih dipakai.
- Setelah setiap fase, jalankan `npm test` dan `npm run build`.
- Tambahkan atau update test untuk setiap bug backend yang diperbaiki.
- Jika butuh migration SQL, buat migration non-destructive dan dokumentasikan langkah manual jika perlu deduplikasi data existing.

FASE 1 - Keamanan dan integritas data

1. Perbaiki konfigurasi Supabase anon/public client.
   - Pastikan `NEXT_PUBLIC_SUPABASE_ANON_KEY` wajib ada untuk endpoint publik di production.
   - Hindari fallback `supabaseAnon` ke service role pada production.
   - Pertahankan DX lokal jika perlu, tetapi warning harus jelas dan tidak menutupi risiko deploy.
   - File awal yang perlu dicek: `lib/supabase.js`, `app/api/public/*`, `lib/publicData.js`.

2. Perbaiki uniqueness `report_periods` untuk periode tahunan dan bulanan.
   - Masalah: `UNIQUE(table_name, tahun, bulan)` tidak menjamin unique saat `bulan IS NULL` di PostgreSQL.
   - Buat migration non-destructive, misalnya partial unique index:
     - unique `(table_name, tahun)` where `bulan is null`
     - unique `(table_name, tahun, bulan)` where `bulan is not null`
   - Audit dan tangani kemungkinan duplikasi existing dengan script/report aman, bukan delete otomatis tanpa konfirmasi.
   - Sesuaikan upsert logic di `app/api/periods/route.js` jika diperlukan.
   - Tambahkan test untuk transisi status periode tahunan dan bulanan.

3. Perbaiki bug notifikasi periode bulanan.
   - File: `lib/notifications.js`.
   - Ganti query `.is('bulan', bulan === null ? null : undefined)` menjadi helper yang memakai `.is('bulan', null)` untuk null dan `.eq('bulan', bulan)` untuk non-null.
   - Tambahkan test untuk `createPeriodNotifications` pada `bulan = null` dan `bulan = 1..12`.

FASE 2 - Import Excel dan performa

4. Jadikan import Excel month-aware.
   - File awal: `lib/excel/previewDiff.js`, `lib/excel/importToSupabase.js`, `app/api/import/preview/route.js`, `app/api/import/confirm/route.js`, `components/AiChatBubble.js`, dan area import di admin panel.
   - Preview dan confirm harus menerima `tahun` dan `bulan` eksplisit untuk tabel bulanan.
   - Jangan default diam-diam ke bulan 12 kecuali user memilih mode snapshot Desember.
   - UI import harus menampilkan pilihan bulan sebelum preview dan confirm.
   - Tambahkan test untuk import `data_umum`, `data_rekap_dawis`, dan `data_bumil` pada bulan selain 12.

5. Tambahkan server-side cache untuk `/api/dusun`.
   - File: `app/api/dusun/route.js` dan admin route yang mengubah dusun.
   - Buat module-level TTL cache 60 detik dengan in-flight dedupe jika perlu.
   - Invalidate cache setelah admin membuat/mengubah/nonaktifkan dusun.
   - Pertahankan auth requirement.

FASE 3 - UI/UX dan aksesibilitas

6. Buat reusable accessible `Dialog` dan `Popover`.
   - Terapkan ke `ConfirmModal`, password modal di `Sidebar`, template dialog di `DashboardToolbar`, dropdown notifikasi dan profil di `Topbar`.
   - Wajib ada `role`, `aria-modal` untuk dialog, `aria-labelledby`, Escape close, focus restore, dan basic focus trap.
   - Jangan merusak visual existing.

7. Rapikan dark mode dan tabel besar.
   - Audit inline style hard-coded di `NestedDataPage.js` dan `PokjaDataPage.js`.
   - Pindahkan warna ke class/token Tailwind agar dark mode konsisten.
   - Pastikan sticky column, footer total, warning/error cell, dan hover state tetap terbaca.

8. Tambahkan UX operasional.
   - Buat atau rancang "Pekerjaan Saya" berdasarkan role: data belum lengkap, warning, perlu revisi, dan periode yang menunggu submit.
   - Buat Admin Approval Queue untuk submit/approve/return/lock lintas tabel dan bulan.
   - Tambahkan filter "hanya bermasalah" pada tabel besar.

Urutan eksekusi:
1. Mulai dari FASE 1 saja.
2. Setelah FASE 1 selesai, laporkan file yang diubah, migration/test yang ditambah, hasil `npm test`, dan hasil `npm run build`.
3. Tunggu instruksi sebelum lanjut ke FASE 2.
```
