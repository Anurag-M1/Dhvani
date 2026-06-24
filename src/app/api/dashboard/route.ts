import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Flag stats
    const totalFlags = await db.flag.count();
    const activeFlags = await db.flag.count({ where: { status: 'Active' } });
    const damagedFlags = await db.flag.count({ where: { status: 'Damaged' } });
    const retiredFlags = await db.flag.count({ where: { status: 'Retired' } });

    // Zone distribution
    const flagsByZone = await db.flag.groupBy({ by: ['zone'], _count: true });
    
    // Fabric type distribution
    const flagsByFabric = await db.flag.groupBy({ by: ['fabricType'], _count: true });

    // Sensor stats
    const totalSensors = await db.sensor.count();
    const onlineSensors = await db.sensor.count({ where: { status: 'Online' } });
    const offlineSensors = await db.sensor.count({ where: { status: 'Offline' } });

    // Alert stats
    const totalAlerts = await db.alert.count();
    const unresolvedAlerts = await db.alert.count({ where: { isResolved: false } });
    const criticalAlerts = await db.alert.count({ where: { severity: 'Critical', isResolved: false } });
    const alertsByType = await db.alert.groupBy({ by: ['alertType'], _count: true });
    const alertsBySeverity = await db.alert.groupBy({ by: ['severity'], _count: true });

    // Health score average
    const flags = await db.flag.findMany({ select: { healthScore: true, fabricType: true, windExposure: true, pollutionLevel: true } });
    const avgHealth = flags.length > 0 ? Math.round(flags.reduce((sum, f) => sum + f.healthScore, 0) / flags.length) : 0;

    // Cost projections
    const costProjections = await db.costProjection.findMany({ orderBy: { savingsPercent: 'asc' } });

    // Recent alerts
    const recentAlerts = await db.alert.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { flag: { select: { flagId: true, location: true, zone: true } } },
    });

    // Wind exposure distribution
    const flagsByWind = await db.flag.groupBy({ by: ['windExposure'], _count: true });
    
    // Pollution distribution
    const flagsByPollution = await db.flag.groupBy({ by: ['pollutionLevel'], _count: true });

    // Material types
    const materials = await db.materialType.findMany({ where: { isActive: true } });

    // Lifecycle records count
    const lifecycleRecords = await db.lifecycleRecord.count();
    const retiredViaFlagCode = await db.lifecycleRecord.count({ where: { flagCodeCompliant: true } });

    // Inspections
    const totalInspections = await db.inspection.count();

    return NextResponse.json({
      flags: { total: totalFlags, active: activeFlags, damaged: damagedFlags, retired: retiredFlags },
      flagsByZone: flagsByZone.map(z => ({ zone: z.zone, count: z._count })),
      flagsByFabric: flagsByFabric.map(f => ({ fabricType: f.fabricType, count: f._count })),
      flagsByWind: flagsByWind.map(w => ({ windExposure: w.windExposure, count: w._count })),
      flagsByPollution: flagsByPollution.map(p => ({ pollutionLevel: p.pollutionLevel, count: p._count })),
      sensors: { total: totalSensors, online: onlineSensors, offline: offlineSensors },
      alerts: { total: totalAlerts, unresolved: unresolvedAlerts, critical: criticalAlerts },
      alertsByType: alertsByType.map(a => ({ type: a.alertType, count: a._count })),
      alertsBySeverity: alertsBySeverity.map(a => ({ severity: a.severity, count: a._count })),
      avgHealthScore: avgHealth,
      costProjections,
      recentAlerts,
      materials,
      lifecycle: { total: lifecycleRecords, flagCodeCompliant: retiredViaFlagCode },
      inspections: { total: totalInspections },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
