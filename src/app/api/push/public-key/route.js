import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/lib/server/db';

export async function GET() {
  const vapid = getVapidKeys();
  return NextResponse.json({ key: vapid.publicKey });
}
