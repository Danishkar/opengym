import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { getEnvConfig, putChallenge } from '@/lib/server/db';

export async function POST(req) {
  try {
    const { rpId } = getEnvConfig(req);
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      userVerification: 'preferred',
      allowCredentials: []
    });
    const cid = putChallenge({ challenge: options.challenge });
    return NextResponse.json({ cid, options });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 500 });
  }
}
