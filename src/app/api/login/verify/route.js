import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { db, getEnvConfig, takeChallenge, saveDb, audit, sessionCookie, isAdmin, b64uToBuf } from '@/lib/server/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const c = takeChallenge(body.cid);
    if (!c) {
      audit(req, 'auth.login.fail', { ok: false, msg: 'challenge-expired' });
      return NextResponse.json({ error: 'challenge expired — try again' }, { status: 400 });
    }
    const cred = db.creds.find(x => x.id === body.credential?.id);
    if (!cred) {
      audit(req, 'auth.login.fail', { ok: false, msg: 'unknown-credential' });
      return NextResponse.json({ error: 'unknown passkey — create a profile first' }, { status: 404 });
    }
    const { origin, rpId } = getEnvConfig(req);
    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.credential,
        expectedChallenge: c.challenge,
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserVerification: false,
        credential: {
          id: cred.id,
          publicKey: b64uToBuf(cred.publicKey),
          counter: cred.counter,
          transports: cred.transports
        }
      });
    } catch (e) {
      audit(req, 'auth.login.fail', { ok: false, user: db.users.find(u => u.id === cred.userId), uid: cred.userId, msg: 'verify-error' });
      return NextResponse.json({ error: 'verification failed: ' + e.message }, { status: 400 });
    }
    if (!verification.verified) {
      audit(req, 'auth.login.fail', { ok: false, user: db.users.find(u => u.id === cred.userId), uid: cred.userId, msg: 'not-verified' });
      return NextResponse.json({ error: 'not verified' }, { status: 400 });
    }
    cred.counter = verification.authenticationInfo.newCounter;
    saveDb();
    const user = db.users.find(u => u.id === cred.userId);
    if (!user) {
      audit(req, 'auth.login.fail', { ok: false, uid: cred.userId, msg: 'user-missing' });
      return NextResponse.json({ error: 'user missing' }, { status: 500 });
    }
    if (user.disabled) {
      audit(req, 'auth.login.fail', { ok: false, user, msg: 'account-disabled' });
      return NextResponse.json({ error: 'this account has been disabled' }, { status: 403 });
    }
    audit(req, 'auth.login.ok', { user });

    const res = NextResponse.json({ user: { id: user.id, name: user.name, admin: isAdmin(user) } });
    res.headers.set('Set-Cookie', sessionCookie(user, req));
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 400 });
  }
}
