import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const { error } = await supabase
    .from('pautas')
    .delete()
    .eq('status', 'aguardando');
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ message: "Cleared" });
}
