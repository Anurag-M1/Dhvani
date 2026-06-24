import { db } from '../src/lib/db';

const DELHI_LOCATIONS = [
  { name: 'India Gate', lat: 28.6129, lng: 77.2295, zone: 'Central' },
  { name: 'Rashtrapati Bhavan', lat: 28.6144, lng: 77.1996, zone: 'Central' },
  { name: 'Parliament House', lat: 28.6172, lng: 77.2078, zone: 'Central' },
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167, zone: 'Central' },
  { name: 'Rajpath', lat: 28.6115, lng: 77.2130, zone: 'Central' },
  { name: 'ITO Crossing', lat: 28.6289, lng: 77.2411, zone: 'Central' },
  { name: 'Saket District Centre', lat: 28.5244, lng: 77.2066, zone: 'South' },
  { name: 'Nehru Place', lat: 28.5504, lng: 77.2508, zone: 'South' },
  { name: 'Hauz Khas', lat: 28.5494, lng: 77.2009, zone: 'South' },
  { name: 'Vasant Kunj', lat: 28.5244, lng: 77.1545, zone: 'South' },
  { name: 'Greater Kailash', lat: 28.5630, lng: 77.2450, zone: 'South' },
  { name: 'Civil Lines', lat: 28.6862, lng: 77.2218, zone: 'North' },
  { name: 'Kashmere Gate', lat: 28.6676, lng: 77.2284, zone: 'North' },
  { name: 'Model Town', lat: 28.6953, lng: 77.2134, zone: 'North' },
  { name: 'GTB Nagar', lat: 28.7041, lng: 77.2067, zone: 'North' },
  { name: 'Laxmi Nagar', lat: 28.6304, lng: 77.2773, zone: 'East' },
  { name: 'Preet Vihar', lat: 28.6380, lng: 77.2940, zone: 'East' },
  { name: 'Shahdara', lat: 28.6300, lng: 77.2830, zone: 'East' },
  { name: 'Mayur Vihar', lat: 28.6080, lng: 77.2950, zone: 'East' },
  { name: 'Rajouri Garden', lat: 28.6446, lng: 77.1193, zone: 'West' },
  { name: 'Janakpuri', lat: 28.6213, lng: 77.0794, zone: 'West' },
  { name: 'Dwarka Sector 1', lat: 28.5990, lng: 77.0550, zone: 'West' },
  { name: 'Kirti Nagar', lat: 28.6490, lng: 77.1350, zone: 'West' },
  { name: 'Chanakyapuri', lat: 28.5867, lng: 77.1894, zone: 'New Delhi' },
  { name: 'Sardar Patel Marg', lat: 28.5980, lng: 77.1860, zone: 'New Delhi' },
  { name: 'Teen Murti Marg', lat: 28.6010, lng: 77.1990, zone: 'New Delhi' },
  { name: 'Safdarjung Road', lat: 28.5830, lng: 77.2060, zone: 'New Delhi' },
  { name: 'Rohini Sector 3', lat: 28.7168, lng: 77.1190, zone: 'North West' },
  { name: 'Pitampura', lat: 28.6950, lng: 77.1200, zone: 'North West' },
  { name: 'Shalimar Bagh', lat: 28.6880, lng: 77.1350, zone: 'North West' },
  { name: 'Dhaula Kuan', lat: 28.5830, lng: 77.1670, zone: 'South West' },
  { name: 'RK Puram', lat: 28.5670, lng: 77.1860, zone: 'South West' },
  { name: 'Vasant Vihar', lat: 28.5650, lng: 77.1630, zone: 'South West' },
  { name: 'Malviya Nagar', lat: 28.5300, lng: 77.2100, zone: 'South West' },
  { name: 'MG Road', lat: 28.5400, lng: 77.2300, zone: 'South' },
  { name: 'Dwarka Sector 21', lat: 28.5710, lng: 77.0430, zone: 'West' },
  { name: 'Uttam Nagar', lat: 28.6180, lng: 77.0650, zone: 'West' },
  { name: 'Munirka', lat: 28.5540, lng: 77.1780, zone: 'South West' },
  { name: 'Ashok Vihar', lat: 28.6850, lng: 77.1500, zone: 'North West' },
  { name: 'IP Extension', lat: 28.6280, lng: 77.3050, zone: 'East' },
  { name: 'Wazirabad', lat: 28.7100, lng: 77.2200, zone: 'North' },
  { name: 'Shakti Nagar', lat: 28.6850, lng: 77.2000, zone: 'North' },
  { name: 'Patparganj', lat: 28.6230, lng: 77.3000, zone: 'East' },
  { name: 'Tagore Garden', lat: 28.6380, lng: 77.1100, zone: 'West' },
  { name: 'Chhatarpur', lat: 28.5070, lng: 77.1950, zone: 'South' },
  { name: 'Diplomatic Enclave', lat: 28.5910, lng: 77.1850, zone: 'New Delhi' },
  { name: 'Prithvi Raj Road', lat: 28.5850, lng: 77.2080, zone: 'New Delhi' },
  { name: 'Supreme Court', lat: 28.6230, lng: 77.2380, zone: 'Central' },
  { name: 'Minto Road', lat: 28.6270, lng: 77.2220, zone: 'Central' },
];

const SENSOR_TYPES = ['Accelerometer', 'StrainGauge', 'Humidity', 'WindSpeed', 'Camera'];
const FABRIC_TYPES = ['Polyester', 'NanoCoatedPolyester', 'KevlarBlend', 'GrapheneReinforced'];
const NANO_COATINGS = ['None', 'Hydrophobic', 'Oleophobic', 'DualCoat', 'TiO2Photocatalytic'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.round((min + Math.random() * (max - min)) * 100) / 100; }

async function seed() {
  console.log('Seeding...');

  // Materials
  await db.materialType.createMany({ data: [
    { name: 'Standard Polyester', category: 'BaseFabric', tensileStrength: 450, weight: 180, uvResistance: 5, waterRepellency: 3, dustRepellency: 2, windRating: 'Moderate', lifespanMonths: 3, costPerSqMeter: 350, description: 'Current standard polyester fabric. Prone to tearing and dust absorption.', supplier: 'Khadi Gramodyog' },
    { name: 'NanoCoated Polyester v2', category: 'BaseFabric', tensileStrength: 680, weight: 165, uvResistance: 8, waterRepellency: 9, dustRepellency: 8, windRating: 'High', lifespanMonths: 9, costPerSqMeter: 890, description: 'Dual nano-coating (hydrophobic + oleophobic). Reduces water absorption by 92%, dust adhesion by 85%.', supplier: 'Armidale Nanotech India' },
    { name: 'Kevlar-Polyester Blend', category: 'BaseFabric', tensileStrength: 1200, weight: 195, uvResistance: 7, waterRepellency: 6, dustRepellency: 5, windRating: 'Extreme', lifespanMonths: 12, costPerSqMeter: 1450, description: 'Kevlar fiber reinforcement (15% blend). Withstands 150 km/h winds.', supplier: 'DuPont India' },
    { name: 'Graphene-Reinforced Polymer', category: 'BaseFabric', tensileStrength: 1800, weight: 140, uvResistance: 9, waterRepellency: 10, dustRepellency: 9, windRating: 'Extreme', lifespanMonths: 18, costPerSqMeter: 2800, description: 'Graphene nanoplatelet reinforced. Self-cleaning, ultra-lightweight. 18-month lifespan.', supplier: 'Log 9 Materials' },
    { name: 'TiO2 Photocatalytic Coating', category: 'Coating', tensileStrength: 0, weight: 15, uvResistance: 10, waterRepellency: 8, dustRepellency: 10, windRating: 'Moderate', lifespanMonths: 12, costPerSqMeter: 420, description: 'TiO2 nanoparticles for UV-activated self-cleaning. Reduces washing by 70%.', supplier: 'Tata Chemicals' },
    { name: 'Silica Nanosphere Coating', category: 'Coating', tensileStrength: 0, weight: 12, uvResistance: 8, waterRepellency: 10, dustRepellency: 7, windRating: 'Moderate', lifespanMonths: 10, costPerSqMeter: 380, description: 'Superhydrophobic lotus-leaf effect. Water contact angle >150 deg.', supplier: 'Armidale Nanotech India' },
  ]});
  console.log('Materials seeded');

  // Flags
  const flags: { id: string; flagId: string; fabricType: string; location: string; status: string; healthScore: number; replacementCount: number; costPerCycle: number }[] = [];
  for (let i = 0; i < DELHI_LOCATIONS.length; i++) {
    const loc = DELHI_LOCATIONS[i];
    const fabricType = i < 25 ? 'Polyester' : i < 35 ? 'NanoCoatedPolyester' : i < 43 ? 'KevlarBlend' : 'GrapheneReinforced';
    const nanoCoating = fabricType === 'Polyester' ? 'None' : fabricType === 'NanoCoatedPolyester' ? 'DualCoat' : pick(NANO_COATINGS);
    const status = i < 5 ? 'Damaged' : i < 7 ? 'Retired' : 'Active';
    const healthScore = status === 'Damaged' ? rand(20, 55) : status === 'Retired' ? rand(5, 15) : rand(65, 100);
    const daysAgo = Math.floor(Math.random() * 365);

    const flag = await db.flag.create({
      data: {
        flagId: `DM-${String(i + 1).padStart(3, '0')}`,
        location: loc.name,
        latitude: loc.lat,
        longitude: loc.lng,
        zone: loc.zone,
        mastHeight: pick([20, 25, 30, 35, 40, 50, 60]),
        fabricType,
        nanoCoating,
        installDate: new Date(Date.now() - daysAgo * 86400000),
        lastInspection: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
        status,
        healthScore,
        windExposure: pick(['Low', 'Medium', 'High', 'Extreme']),
        pollutionLevel: pick(['Low', 'Medium', 'High', 'Severe']),
        replacementCount: Math.floor(Math.random() * 8) + 1,
        costPerCycle: rand(450000, 620000),
      },
    });
    flags.push({ id: flag.id, flagId: flag.flagId, fabricType: flag.fabricType, location: flag.location, status: flag.status, healthScore: flag.healthScore, replacementCount: flag.replacementCount, costPerCycle: flag.costPerCycle });
  }
  console.log(`Flags: ${flags.length}`);

  // Sensors (batch per flag)
  for (const flag of flags) {
    const sensorData = SENSOR_TYPES.map((type, s) => ({
      sensorId: `SEN-${flag.flagId}-${s + 1}`,
      flagId: flag.id,
      sensorType: type,
      status: Math.random() > 0.9 ? 'Offline' : 'Online',
      batteryLevel: rand(15, 100),
      lastReading: JSON.stringify({ value: type === 'WindSpeed' ? rand(5, 85) : type === 'Humidity' ? rand(30, 95) : type === 'Accelerometer' ? rand(0.1, 3.5) : type === 'StrainGauge' ? rand(0, 100) : rand(0, 1), unit: type === 'WindSpeed' ? 'km/h' : type === 'Humidity' ? '%' : type === 'Accelerometer' ? 'g' : type === 'StrainGauge' ? 'microstrain' : 'score', timestamp: new Date().toISOString() }),
      lastReadingAt: new Date(Date.now() - Math.floor(Math.random() * 3600000)),
      firmwareVer: '2.1.3',
    }));
    await db.sensor.createMany({ data: sensorData });
  }
  console.log('Sensors seeded');

  // Alerts
  for (const flag of flags) {
    if (flag.status === 'Damaged' || Math.random() > 0.65) {
      const numAlerts = 1 + Math.floor(Math.random() * 3);
      const alertData = [];
      for (let a = 0; a < numAlerts; a++) {
        const alertType = pick(['Tear', 'Dirt', 'Wind', 'Pollution', 'SensorOffline']);
        alertData.push({
          flagId: flag.id,
          alertType,
          severity: alertType === 'Tear' ? 'Critical' : pick(['High', 'Medium', 'Low']),
          message: `${alertType} alert at ${flag.location} - ${alertType === 'Tear' ? 'AI confidence 94%, immediate replacement needed' : alertType === 'Dirt' ? 'Dust exceeds threshold, washing required' : alertType === 'Wind' ? 'High wind speed detected' : alertType === 'Pollution' ? 'AQI exceeds safe levels' : 'Sensor offline for 4+ hours'}`,
          isResolved: Math.random() > 0.6,
          resolvedAt: Math.random() > 0.6 ? new Date(Date.now() - Math.floor(Math.random() * 86400000)) : null,
          aiConfidence: (alertType === 'Tear' || alertType === 'Dirt') ? rand(0.78, 0.99) : null,
        });
      }
      await db.alert.createMany({ data: alertData });
    }
  }
  console.log('Alerts seeded');

  // Cost Projections
  await db.costProjection.createMany({ data: [
    { scenario: 'Current State (Baseline)', annualReplacement: 4, costPerFlag: 520000, totalFlags: 500, annualCost: 1040000000, savingsPercent: 0, materialCost: 620000000, iotCost: 0, laborCost: 420000000, recyclingRevenue: 0, netCost: 1040000000, notes: 'Standard polyester, 4 replacements/year, manual inspection' },
    { scenario: 'Doubling Without Innovation', annualReplacement: 8, costPerFlag: 520000, totalFlags: 500, annualCost: 2080000000, savingsPercent: -100, materialCost: 1240000000, iotCost: 0, laborCost: 840000000, recyclingRevenue: 0, netCost: 2080000000, notes: '8x/year without innovation - worst case' },
    { scenario: 'NanoCoated Polyester + IoT', annualReplacement: 2, costPerFlag: 380000, totalFlags: 500, annualCost: 380000000, savingsPercent: 63.5, materialCost: 245000000, iotCost: 48000000, laborCost: 150000000, recyclingRevenue: 12000000, netCost: 431000000, notes: 'Nano-coated polyester, IoT monitoring, 2 replacements/year' },
    { scenario: 'Kevlar Blend + Full Smart System', annualReplacement: 1, costPerFlag: 280000, totalFlags: 500, annualCost: 140000000, savingsPercent: 86.5, materialCost: 310000000, iotCost: 65000000, laborCost: 80000000, recyclingRevenue: 25000000, netCost: 430000000, notes: 'Kevlar blend, full IoT+AI, 12-month lifespan' },
    { scenario: 'Graphene Polymer + Autonomous AI', annualReplacement: 1, costPerFlag: 220000, totalFlags: 500, annualCost: 110000000, savingsPercent: 89.4, materialCost: 380000000, iotCost: 85000000, laborCost: 55000000, recyclingRevenue: 35000000, netCost: 485000000, notes: 'Graphene fabric, self-cleaning, autonomous AI, 18-month lifespan' },
  ]});
  console.log('Cost projections seeded');

  // Inspections
  const allFlags = await db.flag.findMany({ select: { id: true, flagId: true, location: true } });
  const inspectors = ['Rajesh Kumar', 'Priya Sharma', 'Amit Verma', 'Sunita Devi', 'Vikram Singh'];
  const conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
  const dirtLevels = ['Clean', 'Light', 'Moderate', 'Heavy'];
  const inspectionTypes = ['Routine', 'Emergency', 'PreStorm', 'PostStorm'];
  const recommendations = ['Continue monitoring', 'Schedule replacement within 2 weeks', 'Immediate replacement required', 'Apply nano-coating treatment', 'Schedule washing within 48 hours'];

  const inspectionData = [];
  for (const flag of allFlags) {
    const numInspections = 2 + Math.floor(Math.random() * 4);
    for (let j = 0; j < numInspections; j++) {
      inspectionData.push({
        flagId: flag.id,
        inspectorName: pick(inspectors),
        type: pick(inspectionTypes),
        condition: pick(conditions),
        notes: `Inspection at ${flag.location} - ${pick(['normal wear observed', 'minor fraying at fly end', 'dust accumulation noted', 'post-storm check completed', 'flag in good condition'])}`,
        tearCount: Math.floor(Math.random() * 4),
        dirtLevel: pick(dirtLevels),
        recommendation: pick(recommendations),
        nextInspection: new Date(Date.now() + Math.floor(Math.random() * 30) * 86400000),
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 90) * 86400000),
      });
    }
  }
  await db.inspection.createMany({ data: inspectionData });
  console.log(`Inspections seeded: ${inspectionData.length}`);

  // Lifecycle records
  const lifecycleData = [];
  const disposalMethods = ['RespectfulBurning', 'Recycling', 'Ceremony'];
  const recycledIntos = ['Commemorative patches', 'Museum display', 'Ceremonial ash', 'Recycled fiber'];
  const actions = ['Installed', 'Washed', 'Repaired', 'Retired', 'Recycled'];

  for (const flag of allFlags) {
    // Every flag has an installation record
    lifecycleData.push({
      flagId: flag.id,
      action: 'Installed',
      fabricWeight: rand(8, 15),
      notes: `Initial installation at ${flag.location}`,
      performedBy: 'Delhi PWD Flag Division',
      createdAt: new Date(Date.now() - Math.floor(Math.random() * 365) * 86400000),
    });

    // Add 1-3 more records
    const numRecords = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numRecords; j++) {
      const action = pick(actions.slice(1));
      lifecycleData.push({
        flagId: flag.id,
        action,
        fabricWeight: rand(7, 14),
        disposalMethod: action === 'Retired' || action === 'Recycled' ? pick(disposalMethods) : null,
        recycledInto: action === 'Recycled' ? pick(recycledIntos) : null,
        flagCodeCompliant: true,
        certificateNo: `FCC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 10000)}`,
        notes: `${action} performed in compliance with Flag Code of India`,
        performedBy: 'Delhi PWD Flag Division',
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 180) * 86400000),
      });
    }
  }
  await db.lifecycleRecord.createMany({ data: lifecycleData });
  console.log(`Lifecycle records seeded: ${lifecycleData.length}`);

  console.log('Done!');
}

seed().catch(console.error);
