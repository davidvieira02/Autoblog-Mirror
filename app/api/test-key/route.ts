import { NextResponse } from 'next/server';

export async function GET() {
  const key = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  return NextResponse.json({
    type: typeof key,
    length: key?.length,
    firstChar: key?.[0],
    lastChar: key?.[key?.length - 1],
    val: key
  });
}
