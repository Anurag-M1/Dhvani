import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const materials = await db.materialType.findMany({ where: { isActive: true }, orderBy: { lifespanMonths: 'asc' } });
    return NextResponse.json({ materials });
  } catch (error) {
    console.error('Materials API error:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}
