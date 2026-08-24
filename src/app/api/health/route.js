import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const users = db?.users?.length || 0;
    return NextResponse.json({ ok: true, users });
  } catch (e) {
    return NextResponse.json({ ok: true, status: 'initializing', error: e.message });
  }
}
