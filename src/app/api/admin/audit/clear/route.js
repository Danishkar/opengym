import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin, audit, auditFile } from '@/lib/server/db';

export async function POST(req) {
  const adminUser = readSessionFromReq(req);
  if (!adminUser) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  if (!isAdmin(adminUser)) {
    audit(req, 'admin.denied', { ok: false, user: adminUser });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try { fs.unlinkSync(auditFile); } catch {}
  audit(req, 'admin.audit.clear', { user: adminUser });
  return NextResponse.json({ ok: true });
}
