import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin, audit, db, readState, INVITE_ONLY, livePresence } from '@/lib/server/db';

export async function GET(req) {
  const user = readSessionFromReq(req);
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  if (!isAdmin(user)) {
    audit(req, 'admin.denied', { ok: false, user });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const users = db.users.map(u => {
    const S = readState(u.id) || {};
    const workouts = S.workouts || [];
    const last = workouts[workouts.length - 1];
    return {
      id: u.id, name: u.name, created: u.created || null,
      disabled: !!u.disabled, admin: isAdmin(u), invitedBy: u.invitedBy || null,
      workouts: workouts.length,
      lastWorkout: last ? last.d : null,
      lastSync: S._ts || null,
      hasPush: db.subs.some(s => s.userId === u.id),
      live: livePresence(u.id)
    };
  });
  return NextResponse.json({ users, invite_only: INVITE_ONLY, now: Date.now() });
}
