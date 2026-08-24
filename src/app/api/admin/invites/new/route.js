import crypto from 'node:crypto';
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
    let code;
    do {
      code = crypto.randomBytes(8).toString('hex').toUpperCase();
    } while (db.invites.some(i => i.code === code));

    const invite = {
      code,
      note: String(body.note || '').slice(0, 60),
      createdBy: adminUser.id,
      created: new Date().toISOString()
    };
    db.invites.push(invite);
    saveDb();
    audit(req, 'admin.invite.create', { user: adminUser, msg: code });
    return NextResponse.json({ invite });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
