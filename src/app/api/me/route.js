import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin } from '@/lib/server/db';

export async function GET(req) {
  const user = readSessionFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }
  return NextResponse.json({
    user: { id: user.id, name: user.name, admin: isAdmin(user) }
  });
}
