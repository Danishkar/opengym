import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { db, getEnvConfig, INVITE_ONLY, putChallenge, audit } from '@/lib/server/db';

export async function POST(req) {
  try {
    const body = await req.json();
    const name = String(body.name || '').trim().slice(0, 40);
    if (!name) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }
    const code = String(body.code || '').trim().toUpperCase();
    if (INVITE_ONLY && !db.invites.some(i => i.code === code && !i.usedBy && !i.revoked)) {
      audit(req, 'auth.register.denied', { ok: false, name, msg: 'invite-rejected' });
      return NextResponse.json({ error: 'a valid invite code is required' }, { status: 403 });
    }
    const { rpId, rpName } = getEnvConfig(req);
    const uid = crypto.randomBytes(12).toString('base64url');
    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpId,
      userID: Buffer.from(uid),
      userName: name,
      userDisplayName: name,
      attestationType: 'none',
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      excludeCredentials: []
    });
    const cid = putChallenge({ challenge: options.challenge, name, uid, code });
    return NextResponse.json({ cid, options });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'bad json' }, { status: 400 });
  }
}
