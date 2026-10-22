import { NextResponse } from 'next/server';
import { getPublicYears } from '@/lib/publicRepository';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return NextResponse.json(await getPublicYears());
  } catch {
    return NextResponse.json({ error: 'Daftar tahun publik belum dapat dimuat.' }, { status: 503 });
  }
}
