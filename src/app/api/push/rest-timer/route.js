import { NextResponse } from 'next/server';
import { readSessionFromReq, scheduleRestTimer } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const sec = Math.max(1, Math.min(3600, Math.round(+body.seconds || 0)));
    if (!sec) {
      return NextResponse.json({ error: 'seconds required' }, { status: 400 });
    }
    scheduleRestTimer(user.id, sec);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
