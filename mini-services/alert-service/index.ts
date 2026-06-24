import { Server } from 'socket.io';

const io = new Server(3003, {
  cors: { origin: '*' },
  path: '/',
});

const alertTypes = ['Tear', 'Dirt', 'Wind', 'Pollution', 'SensorOffline'];
const locations = [
  'India Gate', 'Rashtrapati Bhavan', 'Connaught Place', 'Saket District Centre',
  'Nehru Place', 'Civil Lines', 'Kashmere Gate', 'Laxmi Nagar',
  'Rajouri Garden', 'Chanakyapuri', 'Rohini Sector 3', 'Dhaula Kuan',
  'Hauz Khas', 'Dwarka Sector 1', 'Pitampura', 'RK Puram',
];
const severities = ['Critical', 'High', 'Medium', 'Low'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateAlert() {
  const alertType = randomFrom(alertTypes);
  const location = randomFrom(locations);
  const flagId = `DM-${String(Math.floor(Math.random() * 50) + 1).padStart(3, '0')}`;
  const severity = alertType === 'Tear' ? 'Critical' : randomFrom(severities);
  const confidence = (alertType === 'Tear' || alertType === 'Dirt') ? (0.75 + Math.random() * 0.24).toFixed(2) : null;

  const messages: Record<string, string> = {
    Tear: `Critical tear detected at ${location} — AI confidence ${Math.round(parseFloat(confidence!) * 100)}%. Strain gauge reading exceeds threshold.`,
    Dirt: `Dust accumulation at ${location} exceeds threshold. Opacity score: ${Math.floor(60 + Math.random() * 30)}%. Washing recommended.`,
    Wind: `Wind speed at ${location} exceeds ${Math.floor(60 + Math.random() * 30)} km/h. Auto-retract mechanism triggered.`,
    Pollution: `AQI at ${location} exceeds ${Math.floor(250 + Math.random() * 150)}. Fabric degradation rate increasing.`,
    SensorOffline: `Sensor at ${location} has been offline for ${Math.floor(2 + Math.random() * 6)} hours. Manual inspection needed.`,
  };

  return {
    id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    flagId,
    alertType,
    severity,
    message: messages[alertType],
    aiConfidence: confidence ? parseFloat(confidence) : null,
    location,
    timestamp: new Date().toISOString(),
  };
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Simulate real-time alerts every 8-15 seconds
setInterval(() => {
  const alert = generateAlert();
  io.emit('flag-alert', alert);
  console.log(`Alert emitted: ${alert.alertType} at ${alert.location} [${alert.severity}]`);
}, 8000 + Math.random() * 7000);

// Send wind updates every 5 seconds
setInterval(() => {
  const location = randomFrom(locations);
  const windSpeed = Math.floor(10 + Math.random() * 75);
  io.emit('wind-update', { location, windSpeed, unit: 'km/h', timestamp: new Date().toISOString() });
}, 5000);

console.log('Dhvani Alert Service running on port 3003');
