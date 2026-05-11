/**
 * @file Period workflow API
 * GET  /api/periods?table_name=&tahun=&bulan= — list statuses for a year (atau single period)
 * POST /api/periods — ubah status periode
 *   body: { table_name, tahun, bulan?, action: 'submit'|'approve'|'return'|'lock'|'unlock', notes? }
 *
 * Access matrix:
 *   submit:  role yang punya write access ke tabel (canWrite)
 *   approve: admin atau sekretaris
 *   return:  admin atau sekretaris (submitted → draft)
 *   lock:    admin
 *   unlock:  admin (→ draft)
 */
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuth, canWrite } from '@/lib/auth';
import { writeLog } from '@/lib/audit';

const VALID_TABLES = new Set([
  'data_umum', 'data_pokja1', 'data_pokja2', 'data_pokja3', 'data_pokja4',
  'data_kegiatan_warga', 'data_bumil',
]);

const ACTION_TO_STATUS = {
  submit: 'submitted',
  approve: 'approved',
  return: 'draft',
  lock: 'locked',
  unlock: 'draft',
};

function canPerformAction(user, action, tableName) {
  switch (action) {
    case 'submit':
      return user.role === 'admin' || canWrite(user.role, tableName);
    case 'approve':
    case 'return':
      return user.role === 'admin' || user.role === 'sekretaris';
    case 'lock':
    case 'unlock':
      return user.role === 'admin';
    default:
      return false;
  }
}

export async function GET(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get('table_name');
    const tahun = searchParams.get('tahun');
    const bulan = searchParams.get('bulan');

    let query = supabase.from('report_periods').select('*');
    if (tableName) query = query.eq('table_name', tableName);
    if (tahun) query = query.eq('tahun', Number(tahun));
    if (bulan !== null && bulan !== undefined && bulan !== '') query = query.eq('bulan', Number(bulan));

    const { data, error } = await query.order('tahun', { ascending: false });

    if (error) {
      // Kalau tabel belum dimigrate
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Periods GET error:', error);
    return NextResponse.json({ error: 'Gagal memuat periode' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await requireAuth(request);
    if (!user) return requireAuth.deny();

    const body = await request.json();
    const { table_name, tahun, bulan, action, notes } = body;

    if (!table_name || !tahun || !action) {
      return NextResponse.json({ error: 'table_name, tahun, dan action wajib diisi' }, { status: 400 });
    }
    if (!VALID_TABLES.has(table_name)) {
      return NextResponse.json({ error: 'Nama tabel tidak valid' }, { status: 400 });
    }
    const nextStatus = ACTION_TO_STATUS[action];
    if (!nextStatus) {
      return NextResponse.json({ error: `Action "${action}" tidak dikenal` }, { status: 400 });
    }
    if (!canPerformAction(user, action, table_name)) {
      return NextResponse.json(
        { error: `Role ${user.role} tidak berwenang melakukan aksi "${action}" pada ${table_name}` },
        { status: 403 }
      );
    }

    const bulanValue = bulan === undefined || bulan === null ? null : Number(bulan);
    const now = new Date().toISOString();

    // Fetch existing period (untuk validasi transisi)
    let fetchQuery = supabase.from('report_periods').select('*')
      .eq('table_name', table_name).eq('tahun', tahun);
    fetchQuery = bulanValue === null ? fetchQuery.is('bulan', null) : fetchQuery.eq('bulan', bulanValue);
    const { data: existing } = await fetchQuery.maybeSingle();

    const currentStatus = existing?.status || 'draft';

    // Validasi transisi
    const validTransitions = {
      draft: ['submitted'],
      submitted: ['draft', 'approved'],
      approved: ['locked', 'draft'],
      locked: ['draft'],
    };
    if (!validTransitions[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Tidak bisa pindah dari ${currentStatus} ke ${nextStatus}` },
        { status: 400 }
      );
    }

    // Role-specific guards untuk approve & lock
    if (nextStatus === 'approved' && user.role !== 'admin' && user.role !== 'sekretaris') {
      return NextResponse.json({ error: 'Hanya admin/sekretaris yang boleh approve' }, { status: 403 });
    }
    if (nextStatus === 'locked' && user.role !== 'admin') {
      return NextResponse.json({ error: 'Hanya admin yang boleh lock' }, { status: 403 });
    }

    // Build update payload
    const payload = {
      table_name,
      tahun: Number(tahun),
      bulan: bulanValue,
      status: nextStatus,
      notes: notes || null,
      updated_at: now,
    };

    if (action === 'submit') {
      payload.submitted_by = user.userId;
      payload.submitted_at = now;
    }
    if (action === 'approve') {
      payload.approved_by = user.userId;
      payload.approved_at = now;
    }

    const { error: upsertError } = await supabase
      .from('report_periods')
      .upsert(payload, { onConflict: 'table_name,tahun,bulan' });

    if (upsertError) throw upsertError;

    await writeLog({
      userId: user.userId,
      username: user.username,
      action: `period_${action}`,
      tableName: 'report_periods',
      detail: `${table_name} tahun ${tahun}${bulanValue !== null ? ` bulan ${bulanValue}` : ''}: ${currentStatus} → ${nextStatus}`,
    });

    // Trigger notifications (Fitur #3)
    try {
      const { createPeriodNotifications } = await import('@/lib/notifications');
      await createPeriodNotifications({ table_name, tahun, bulan: bulanValue, action, actor: user });
    } catch {
      // silent — notifications optional
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error('Periods POST error:', error);
    return NextResponse.json({ error: 'Gagal mengubah status periode: ' + error.message }, { status: 500 });
  }
}
