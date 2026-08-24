import { NextResponse } from 'next/server';
import { readSessionFromReq, sendPush } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  await sendPush(user.id, { title: 'openGym', body: 'Test notification ✅ — this is what alerts look like.', tag: 'test' });
  return NextResponse.json({ ok: true });
}
