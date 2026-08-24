import { NextResponse } from 'next/server';
import { readSessionFromReq, audit, clearCookie } from '@/lib/server/db';

export async function POST(req) {
  const user = readSessionFromReq(req);
  if (user) audit(req, 'auth.logout', { user });
  const res = NextResponse.json({ ok: true });
  res.headers.set('Set-Cookie', clearCookie(req));
  return res;
}
