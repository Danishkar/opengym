import { NextResponse } from 'next/server';
import { readSessionFromReq, updatePresence } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  try {
    const body = await req.json();
    updatePresence(user.id, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
