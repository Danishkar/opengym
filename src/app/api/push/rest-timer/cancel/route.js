import { NextResponse } from 'next/server';
import { readSessionFromReq, cancelRestTimer } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  cancelRestTimer(user.id);
  return NextResponse.json({ ok: true });
}
