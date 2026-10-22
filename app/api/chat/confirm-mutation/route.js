/**
 * @file POST /api/chat/confirm-mutation
 * Eksekusi mutasi data yang sudah di-preview AI, SETELAH user konfirmasi.
 *
 * Keamanan (dry-run pattern):
 *   - User & role diambil dari JWT (bukan body).
 *   - Payload preview dari client TIDAK dipercaya — divalidasi ulang penuh
 *     lewat validateAiMutation (whitelist tabel/kolom, row-level, sanitasi).
 *   - Period lock dihormati (kecuali admin).
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAuthUser, ROLE_PERMISSIONS } from '@/lib/auth';
import { writeLog } from '@/lib/audit';
import { parseYear } from '@/lib/requestValidation';
import { validateAiMutation } from '@/lib/aiMutation';
import { checkPeriodLock } from '@/lib/periodLock';

export async function POST(request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Sesi login telah berakhir. Silakan login kembali.' }, { status: 401 });
    }

    const body = await request.json();
    const mutation = body?.mutation;
    if (!mutation || typeof mutation !== 'object') {
      return NextResponse.json({ error: 'Data perubahan tidak valid.' }, { status: 400 });
    }

    const year = parseYear(mutation.tahun || new Date().getFullYear());
    if (year.error) {
      return NextResponse.json({ error: year.error }, { status: 400 });
    }
    const currentYear = year.value;

    const allowedTables = ROLE_PERMISSIONS[user.role] || [];

    // Re-validasi penuh server-side — JANGAN percaya payload preview.
    const v = validateAiMutation({
      user: { role: user.role, dusun_id: user.dusun_id },
      rawTable: mutation.tableName,
      rawUnitId: mutation.dusunId,
      updates: mutation.updates,
      rawBulan: mutation.bulan,
      allowedTables,
    });
    if (v.error) {
      return NextResponse.json({ error: v.error }, { status: 403 });
    }

    // Period lock check (admin boleh bypass).
    const lock = await checkPeriodLock(v.tableName, currentYear, v.isMonthly ? v.bulan : null);
    if (lock.locked && user.role !== 'admin') {
      return NextResponse.json(
        { error: `Periode ${currentYear}${v.isMonthly ? `/${v.bulan}` : ''} untuk tabel ini sudah ${lock.status}. Hubungi admin.` },
        { status: 403 }
      );
    }

    const payload = {
      ...v.sanitizedUpdates,
      dusun_id: v.dusunId,
      tahun: currentYear,
    };
    if (v.isMonthly) {
      payload.bulan = v.bulan;
    }

    const onConflict = v.isMonthly ? 'dusun_id,tahun,bulan' : 'dusun_id,tahun';

    const { data: upsertedRows, error } = await supabase
      .from(v.tableName)
      .upsert(payload, { onConflict })
      .select('id');

    if (error) {
      return NextResponse.json({ error: `Gagal menyimpan ke database: ${error.message}` }, { status: 500 });
    }

    const { data: dusun } = await supabase.from('dusun').select('nama').eq('id', v.dusunId).maybeSingle();
    const dusunNama = dusun?.nama || `dusun ${v.dusunId}`;

    await writeLog({
      userId: user.userId,
      username: user.username,
      action: 'ai_update',
      tableName: v.tableName,
      dusunNama,
      detail: `AI update (dikonfirmasi user) dusun_id ${v.dusunId} tahun ${currentYear}${v.isMonthly ? ` bulan ${v.bulan}` : ''}: ${Object.keys(v.sanitizedUpdates).join(', ')}`,
    });

    return NextResponse.json({
      success: true,
      message: `Data ${dusunNama}${v.isMonthly ? ` bulan ${v.bulan}` : ''} berhasil diperbarui.`,
    });
  } catch (error) {
    console.error('Confirm mutation error:', error);
    return NextResponse.json({ error: 'Gagal menerapkan perubahan: ' + error.message }, { status: 500 });
  }
}
