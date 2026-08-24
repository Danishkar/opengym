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
    const u = db.users.find(x => x.id === body.id);
    if (!u) return NextResponse.json({ error: 'no such user' }, { status: 404 });
    if (isAdmin(u)) return NextResponse.json({ error: 'cannot disable an admin' }, { status: 400 });

    u.disabled = !!body.disabled;
    saveDb();
    audit(req, u.disabled ? 'admin.user.disable' : 'admin.user.enable', { user: adminUser, target: u });
    return NextResponse.json({ ok: true, id: u.id, disabled: u.disabled });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
