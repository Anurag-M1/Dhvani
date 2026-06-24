import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get('severity');
    const alertType = searchParams.get('type');
    const resolved = searchParams.get('resolved');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (alertType) where.alertType = alertType;
    if (resolved !== null) where.isResolved = resolved === 'true';

    const alerts = await db.alert.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { flag: { select: { flagId: true, location: true, zone: true, fabricType: true } } },
    });

    return NextResponse.json({ alerts, total: alerts.length });
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, resolved } = body;

    if (!alertId) {
      return NextResponse.json({ error: 'alertId is required' }, { status: 400 });
    }

    const alert = await db.alert.update({
      where: { id: alertId },
      data: {
        isResolved: resolved ?? true,
        resolvedAt: resolved ? new Date() : null,
      },
    });

    return NextResponse.json({ alert });
  } catch (error) {
    console.error('Alert PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
