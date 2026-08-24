import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET() {
  return NextResponse.json({ ok: true, users: db.users.length });
}
