/**
 * @file Tes CRUD tabel data — MENULIS ke database produksi.
 *
 * ================== BACA SEBELUM MENJALANKAN ==================
 *
 * Suite ini satu-satunya bagian review yang menulis data. Semua spec lain
 * read-only. Perlindungan yang dipakai:
 *
 * 1. ISOLASI TAHUN. Semua tulis memakai `tahun` = SANDBOX_YEAR (2099).
 *    Upsert di lib/api-handler.js memakai onConflict `dusun_id,tahun` (atau
 *    `dusun_id,tahun,bulan`), jadi baris tahun 2099 tidak pernah menimpa baris
 *    tahun asli mana pun.
 *
 * 2. GUARD PRA-TULIS. Sebelum menulis apa pun, tes memastikan tahun 2099 benar-
 *    benar kosong. Kalau ada isinya, seluruh suite dibatalkan — data orang lain
 *    tidak boleh ditimpa hanya karena asumsi "tahun itu pasti kosong".
 *
 * 3. OPT-IN EKSPLISIT. Tidak jalan kecuali E2E_ALLOW_WRITES=1.
 *
 * YANG TIDAK BISA DIBERSIHKAN SENDIRI: tabel data tidak punya endpoint DELETE
 * (lib/api-handler.js hanya mengekspor GET + POST). Baris 2099 harus dihapus
 * lewat `node e2e/cleanup-sandbox.mjs` yang memakai service-role key langsung.
 * Entri `audit_logs` bersifat append-only dan akan tetap ada.
 */

import { test, expect } from '@playwright/test';
import { ARTIFACT_DIR, readArtifact, writeShard } from '../lib/helpers.mjs';

export const SANDBOX_YEAR = 2099;

test.use({ storageState: `${ARTIFACT_DIR}/storage-state.json` });

test.describe('CRUD tabel data (menulis ke produksi)', () => {
  // Serial: guard harus lulus sebelum test tulis mana pun berjalan.
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    const targetUrl = process.env.E2E_BASE_URL || '';
    if (/lumbungdatapkk\.vercel\.app|supabase\.co/i.test(targetUrl)) {
      throw new Error(
        '[KEAMANAN DITOLAK] Dilarang keras menjalankan suite CRUD yang menulis data terhadap target produksi: ' + targetUrl
      );
    }
    if (process.env.E2E_ALLOW_WRITES !== '1') {
      throw new Error(
        'Suite CRUD menulis ke database. Set E2E_ALLOW_WRITES=1 untuk mengizinkan pada server lokal/sandbox terisolasi.'
      );
    }
  });

  let dusunId;
  const written = [];

  test('guard: tahun sandbox harus kosong sebelum menulis', async ({ request }) => {
    const { dusunIds = [] } = readArtifact('discovery.json', {});
    expect(dusunIds.length, 'butuh minimal satu dusun dari discovery.json').toBeGreaterThan(0);
    dusunId = dusunIds[0];

    // Tanpa `bulan`, endpoint per-bulan mengembalikan seluruh bulan di tahun itu.
    for (const endpoint of ['/api/pokja1', '/api/data-umum', '/api/bumil', '/api/rekap-dawis']) {
      const res = await request.get(`${endpoint}?tahun=${SANDBOX_YEAR}`);
      expect(res.status(), `GET ${endpoint} tahun sandbox`).toBe(200);

      const rows = await res.json();
      const filled = (Array.isArray(rows) ? rows : []).filter((r) => r.tahun === SANDBOX_YEAR);

      expect(
        filled,
        `BATAL: ${endpoint} sudah punya data di tahun ${SANDBOX_YEAR}. ` +
        `Menulis ke sana berisiko menimpa data asli. Bersihkan dulu atau ganti SANDBOX_YEAR.`
      ).toEqual([]);
    }
  });

  test('CREATE: POST baris baru di tahun sandbox', async ({ request }) => {
    const payload = {
      dusun_id: dusunId,
      tahun: SANDBOX_YEAR,
      kader_pkbn: '11',
      kader_pkdrt: '22',
      gr_kerja_bakti: '33',
      keterangan: 'BARIS UJI E2E — aman dihapus',
    };

    const res = await request.post('/api/pokja1', { data: payload });
    expect(res.status(), await res.text()).toBe(200);
    written.push({ table: 'data_pokja1', tahun: SANDBOX_YEAR, dusun_id: dusunId });

    // Verifikasi lewat GET, bukan percaya respons POST saja.
    const check = await request.get(`/api/pokja1?tahun=${SANDBOX_YEAR}`);
    const rows = await check.json();
    const row = rows.find((r) => r.dusun_id === dusunId);

    expect(row, 'baris yang baru dibuat harus terbaca kembali').toBeTruthy();
    expect(String(row.kader_pkbn)).toBe('11');
    expect(row.keterangan).toContain('BARIS UJI E2E');
  });

  test('UPDATE: POST kedua meng-upsert baris yang sama, bukan menduplikasi', async ({ request }) => {
    const res = await request.post('/api/pokja1', {
      data: {
        dusun_id: dusunId,
        tahun: SANDBOX_YEAR,
        kader_pkbn: '99',
        keterangan: 'BARIS UJI E2E — sudah diubah',
      },
    });
    expect(res.status(), await res.text()).toBe(200);

    const check = await request.get(`/api/pokja1?tahun=${SANDBOX_YEAR}`);
    const rows = await check.json();
    const mine = rows.filter((r) => r.dusun_id === dusunId);

    expect(mine.length, 'upsert onConflict harus menghasilkan tepat satu baris').toBe(1);
    expect(String(mine[0].kader_pkbn)).toBe('99');
    expect(mine[0].keterangan).toContain('sudah diubah');
  });

  test('validasi menolak payload buruk tanpa menulis', async ({ request }) => {
    const cases = [
      { name: 'field tak dikenal', data: { dusun_id: dusunId, tahun: SANDBOX_YEAR, kolom_ngawur: 1 } },
      { name: 'tahun di luar rentang', data: { dusun_id: dusunId, tahun: 1999, kader_pkbn: '1' } },
      { name: 'tanpa kolom data', data: { dusun_id: dusunId, tahun: SANDBOX_YEAR } },
      { name: 'bulan pada tabel non-bulanan', data: { dusun_id: dusunId, tahun: SANDBOX_YEAR, bulan: 3, kader_pkbn: '1' } },
      { name: 'dusun_id nol', data: { dusun_id: 0, tahun: SANDBOX_YEAR, kader_pkbn: '1' } },
    ];

    for (const c of cases) {
      const res = await request.post('/api/pokja1', { data: c.data });
      expect(res.status(), `"${c.name}" seharusnya 400, body: ${await res.text()}`).toBe(400);
    }
  });

  test('otorisasi menolak request tanpa sesi', async ({ playwright, baseURL }) => {
    // storageState harus dikosongkan eksplisit: `test.use` di level file memberi
    // context baru cookie auth yang sama, sehingga request "anonim" tetap login
    // dan tes lolos secara palsu.
    const anon = await playwright.request.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    try {
      const res = await anon.post('/api/pokja1', {
        data: { dusun_id: dusunId, tahun: SANDBOX_YEAR, kader_pkbn: '1' },
      });
      expect(res.status(), 'tulis anonim harus 401').toBe(401);

      const adminRes = await anon.get('/api/admin/users');
      expect([401, 403], 'endpoint admin anonim harus 401/403').toContain(adminRes.status());
    } finally {
      await anon.dispose();
    }
  });

  test.afterAll(() => {
    if (written.length > 0) {
      writeShard('crud-written', { sandboxYear: SANDBOX_YEAR, written });
    }
  });
});
