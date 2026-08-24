import { NextResponse } from 'next/server';
import { readSessionFromReq, sessionVersion, saveDb, audit, clearCookie } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  user.sv = sessionVersion(user) + 1;
  saveDb();
  audit(req, 'auth.logout.all', { user });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie(req));
  return res;
}
