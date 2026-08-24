import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin, audit, db, INVITE_ONLY } from '@/lib/server/db';

export async function GET(req) {
  const adminUser = readSessionFromReq(req);
  if (!adminUser) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  if (!isAdmin(adminUser)) {
    audit(req, 'admin.denied', { ok: false, user: adminUser });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const invites = db.invites.map(i => ({
    ...i,
    usedByName: i.usedBy ? (db.users.find(u => u.id === i.usedBy) || {}).name || null : null
  }));
  return NextResponse.json({ invites, invite_only: INVITE_ONLY });
}
