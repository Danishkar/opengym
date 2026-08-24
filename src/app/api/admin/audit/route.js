import { NextResponse } from 'next/server';
import { readSessionFromReq, isAdmin, audit, auditKeep, auditLines, AUDIT_ON, AUDIT_IP, AUDIT_MAX, AUDIT_DAYS } from '@/lib/server/db';

export async function GET(req) {
  const adminUser = readSessionFromReq(req);
  if (!adminUser) return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  if (!isAdmin(adminUser)) {
    audit(req, 'admin.denied', { ok: false, user: adminUser });
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(200, +searchParams.get('limit') || 100));
  const before = +searchParams.get('before') || Infinity;
  const cat = searchParams.get('cat') || '';

  let rows = auditKeep(auditLines()).reverse();
  if (cat === 'fail') rows = rows.filter(r => !r.ok);
  else if (cat) rows = rows.filter(r => String(r.ev).startsWith(cat + '.'));

  const page = rows.filter(r => r.id < before).slice(0, limit);
  return NextResponse.json({
    events: page,
    total: rows.length,
    nextBefore: page.length === limit ? page[page.length - 1].id : null,
    enabled: AUDIT_ON,
    ip_mode: AUDIT_IP,
    retention: { max: AUDIT_MAX, days: AUDIT_DAYS },
    now: Date.now()
  });
}
