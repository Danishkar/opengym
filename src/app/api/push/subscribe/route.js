import { NextResponse } from 'next/server';
import { readSessionFromReq, db, saveDb } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  try {
    const body = await req.json();
    const sub = body.subscription;
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
    }
    db.subs = db.subs.filter(s => s.endpoint !== sub.endpoint);
    db.subs.push({ userId: user.id, endpoint: sub.endpoint, keys: sub.keys, created: new Date().toISOString() });
    saveDb();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
