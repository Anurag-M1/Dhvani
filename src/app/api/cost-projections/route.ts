import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const projections = await db.costProjection.findMany({ orderBy: { savingsPercent: 'asc' } });
    return NextResponse.json({ projections });
  } catch (error) {
    console.error('Cost API error:', error);
    return NextResponse.json({ error: 'Failed to fetch cost projections' }, { status: 500 });
  }
}
