import { NextResponse } from 'next/server';
import { INVITE_ONLY, ALLOW_GUEST } from '@/lib/server/db';

export async function GET() {
  return NextResponse.json({ invite_only: INVITE_ONLY, allow_guest: ALLOW_GUEST });
}
