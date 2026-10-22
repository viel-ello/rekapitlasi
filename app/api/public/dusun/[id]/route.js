import { NextResponse } from 'next/server';
import { publicPeriod, readPublicPeriod, serializePublicRow, publicUnitStatus, getPublicTrend, PUBLIC_TABLES } from '@/lib/publicRepository';

export const dynamic = 'force-dynamic';

export async function GET(request, ctx) {
  try {
    const { id } = await ctx.params;
    const dusunId = Number(id);
    if (!Number.isInteger(dusunId) || dusunId < 1) return NextResponse.json({ error: 'ID dusun tidak valid' }, { status: 400 });
    const { tahun, bulan } = publicPeriod(new URL(request.url).searchParams);
    const source = await readPublicPeriod(tahun, bulan);
    const found = source.dusun.find((row) => row.id === dusunId);
    if (!found) return NextResponse.json({ error: 'Dusun tidak ditemukan' }, { status: 404 });
    const dusun = { id: found.id, nama: found.nama, nomor_urut: found.nomor_urut, is_active: found.is_active };
    const tables = Object.fromEntries(PUBLIC_TABLES.map((table) => [table, serializePublicRow(source.rows[table].find((row) => row.dusun_id === dusunId), table)]));
    const availability = Object.fromEntries(PUBLIC_TABLES.map((table) => [table, !!tables[table]]));
    const trend = await getPublicTrend(dusunId, tahun, bulan);
    return NextResponse.json({ dusun, desa: dusun, tahun, bulan, tables, trend, ...publicUnitStatus(source, dusunId), availability, periods: source.periods, hasData: Object.values(tables).some(Boolean) });
  } catch {
    return NextResponse.json({ error: 'Data publik dusun belum dapat dimuat. Silakan coba lagi.' }, { status: 503 });
  }
}
