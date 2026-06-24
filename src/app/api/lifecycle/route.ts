import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const records = await db.lifecycleRecord.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { flag: { select: { flagId: true, location: true, zone: true } } },
    });

    const stats = {
      total: await db.lifecycleRecord.count(),
      installed: await db.lifecycleRecord.count({ where: { action: 'Installed' } }),
      washed: await db.lifecycleRecord.count({ where: { action: 'Washed' } }),
      repaired: await db.lifecycleRecord.count({ where: { action: 'Repaired' } }),
      retired: await db.lifecycleRecord.count({ where: { action: 'Retired' } }),
      recycled: await db.lifecycleRecord.count({ where: { action: 'Recycled' } }),
      flagCodeCompliant: await db.lifecycleRecord.count({ where: { flagCodeCompliant: true } }),
      byDisposalMethod: await db.lifecycleRecord.groupBy({ by: ['disposalMethod'], _count: true, where: { disposalMethod: { not: null } } }),
    };

    return NextResponse.json({ records, stats });
  } catch (error) {
    console.error('Lifecycle API error:', error);
    return NextResponse.json({ error: 'Failed to fetch lifecycle data' }, { status: 500 });
  }
}
