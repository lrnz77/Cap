import { NextRequest, NextResponse } from 'next/server';
import { db } from '@cap/database';
import { organizations } from '@cap/database/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const host = req.nextUrl.searchParams.get('host');
  if (!host) return NextResponse.json({ ok: false }, { status: 400 });

  const [org] = await db()
    .select()
    .from(organizations)
    .where(eq(organizations.customDomain, host));

  const ok = !!org && !!org.domainVerified;
  return NextResponse.json({ ok });
}
