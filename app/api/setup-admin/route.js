import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    // Generate valid bcrypt hash for 'admin123'
    const newHash = await hashPassword('admin123');
    
    // Update the admin user in Supabase
    const { error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('username', 'admin');

    if (error) {
      return NextResponse.json({ error: 'Gagal update password', detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password admin berhasil direset ke "admin123"! Anda sekarang sudah bisa login.',
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
