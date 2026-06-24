import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const zone = searchParams.get('zone');
    const status = searchParams.get('status');
    const fabricType = searchParams.get('fabricType');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Record<string, unknown> = {};
    if (zone) where.zone = zone;
    if (status) where.status = status;
    if (fabricType) where.fabricType = fabricType;

    const flags = await db.flag.findMany({
      where,
      take: limit,
      include: {
        sensors: { select: { sensorId: true, sensorType: true, status: true, batteryLevel: true } },
        alerts: { where: { isResolved: false }, take: 3, orderBy: { createdAt: 'desc' }, select: { id: true, alertType: true, severity: true, message: true, createdAt: true } },
      },
      orderBy: { healthScore: 'asc' },
    });

    return NextResponse.json({ flags, total: flags.length });
  } catch (error) {
    console.error('Flags API error:', error);
    return NextResponse.json({ error: 'Failed to fetch flags' }, { status: 500 });
  }
}
