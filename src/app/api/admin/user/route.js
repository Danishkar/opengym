import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin, audit, db, readState } from '@/lib/server/db';

export async function GET(req) {
  const user = readSessionFromReq(req);
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  if (!isAdmin(user)) {
    audit(req, 'admin.denied', { ok: false, user });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const u = db.users.find(x => x.id === id);
  if (!u) return NextResponse.json({ error: 'no such user' }, { status: 404 });

  const S = readState(u.id) || {};
  return NextResponse.json({
    user: { id: u.id, name: u.name, created: u.created || null, disabled: !!u.disabled, admin: isAdmin(u), invitedBy: u.invitedBy || null },
    unit: S.unit || 'kg',
    lastSync: S._ts || null,
    routines: (S.routines || []).map(r => ({ id: r.id, name: r.name, emoji: r.emoji, count: (r.ex || []).length })),
    bodyweight: S.bodyweight || [],
    workouts: (S.workouts || []).slice().reverse()
  });
}
