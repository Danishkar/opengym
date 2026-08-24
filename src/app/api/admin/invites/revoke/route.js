import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin, audit, db, saveDb } from '@/lib/server/db';

export async function POST(req) {
  const adminUser = readSessionFromReq(req);
  if (!adminUser) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  if (!isAdmin(adminUser)) {
    audit(req, 'admin.denied', { ok: false, user: adminUser });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const inv = db.invites.find(i => i.code === String(body.code || '').toUpperCase());
    if (!inv) return NextResponse.json({ error: 'no such code' }, { status: 404 });
    if (inv.usedBy) return NextResponse.json({ error: 'already used — cannot revoke' }, { status: 400 });

    db.invites = db.invites.filter(i => i.code !== inv.code);
    saveDb();
    audit(req, 'admin.invite.revoke', { user: adminUser, msg: inv.code });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
