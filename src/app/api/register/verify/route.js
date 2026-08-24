import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { db, getEnvConfig, takeChallenge, saveDb, audit, sessionCookie, isAdmin, INVITE_ONLY } from '@/lib/server/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const c = takeChallenge(body.cid);
    if (!c || !c.uid) {
      audit(req, 'auth.register.fail', { ok: false, msg: 'challenge-expired' });
      return NextResponse.json({ error: 'challenge expired — try again' }, { status: 400 });
    }
    const { origin, rpId } = getEnvConfig(req);
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.credential,
        expectedChallenge: c.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: false
      });
    } catch (e) {
      audit(req, 'auth.register.fail', { ok: false, name: c.name, msg: 'verify-error' });
      return NextResponse.json({ error: 'verification failed: ' + e.message }, { status: 400 });
    }
    if (!verification.verified) {
      audit(req, 'auth.register.fail', { ok: false, name: c.name, msg: 'not-verified' });
      return NextResponse.json({ error: 'not verified' }, { status: 400 });
    }
    const { credential } = verification.registrationInfo;
    if (db.creds.find(x => x.id === credential.id)) {
      audit(req, 'auth.register.fail', { ok: false, name: c.name, msg: 'credential-exists' });
      return NextResponse.json({ error: 'credential already registered' }, { status: 409 });
    }
    let invite = null;
    if (INVITE_ONLY) {
      invite = db.invites.find(i => i.code === c.code && !i.usedBy && !i.revoked);
      if (!invite) {
        audit(req, 'auth.register.fail', { ok: false, name: c.name, msg: 'invite-invalid' });
        return NextResponse.json({ error: 'invite code is no longer valid — ask for a new one' }, { status: 403 });
      }
    }
    const user = { id: c.uid, name: c.name, created: new Date().toISOString() };
    if (invite) {
      user.invitedBy = invite.code;
      invite.usedBy = user.id;
      invite.usedAt = user.created;
    }
    db.users.push(user);
    db.creds.push({
      id: credential.id,
      userId: user.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter || 0,
      transports: body.credential?.response?.transports || []
    });
    saveDb();
    audit(req, 'auth.register.ok', { user, msg: invite ? invite.code : null });

    const res = NextResponse.json({ user: { id: user.id, name: user.name, admin: isAdmin(user) } });
    res.headers.set('Set-Cookie', sessionCookie(user, req));
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 400 });
  }
}
