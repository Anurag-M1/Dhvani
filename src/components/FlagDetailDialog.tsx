'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Flag, MapPin, Activity, Wind, Droplets, Cpu, Wifi, WifiOff,
  AlertTriangle, ThermometerSun, CheckCircle2, Clock, Gauge,
  Layers, Shield, Eye, Battery
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface FlagDetail {
  id: string;
  flagId: string;
  location: string;
  latitude: number;
  longitude: number;
  zone: string;
  mastHeight: number;
  fabricType: string;
  nanoCoating: string;
  installDate: string;
  lastInspection: string | null;
  status: string;
  healthScore: number;
  windExposure: string;
  pollutionLevel: string;
  replacementCount: number;
  costPerCycle: number;
  sensors: SensorInfo[];
  alerts: AlertInfo[];
}

interface SensorInfo {
  sensorId: string;
  sensorType: string;
  status: string;
  batteryLevel: number;
}

interface AlertInfo {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  isResolved: boolean;
  aiConfidence: number | null;
  createdAt: string;
}

interface FlagDetailDialogProps {
  flagId: string | null;
  onClose: () => void;
}

const SAFFRON = '#FF9933';
const GREEN = '#138808';

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  Accelerometer: <Activity className="w-4 h-4" />,
  StrainGauge: <Gauge className="w-4 h-4" />,
  Humidity: <Droplets className="w-4 h-4" />,
  WindSpeed: <Wind className="w-4 h-4" />,
  Camera: <Eye className="w-4 h-4" />,
};

export default function FlagDetailDialog({ flagId, onClose }: FlagDetailDialogProps) {
  const [flag, setFlag] = useState<FlagDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!flagId) return;
    setLoading(true);
    fetch(`/api/flags?limit=100`)
      .then(res => res.json())
      .then(data => {
        const found = data.flags?.find((f: FlagDetail) => f.id === flagId || f.flagId === flagId);
        setFlag(found || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [flagId]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await fetch('/api/alerts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, resolved: true }),
      });
      if (flag) {
        setFlag({
          ...flag,
          alerts: flag.alerts.map(a => a.id === alertId ? { ...a, isResolved: true } : a),
        });
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (!flagId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex gap-1">
                {[SAFFRON, '#E5E7EB', GREEN].map((c, i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-8 rounded-full"
                    style={{ backgroundColor: c }}
                    animate={{ scaleY: [1, 1.4, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                  />
                ))}
              </div>
            </div>
          ) : flag ? (
            <div>
              {/* Header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: flag.status === 'Active' ? `${GREEN}15` : flag.status === 'Damaged' ? '#EF444415' : '#9CA3AF15' }}>
                    <Flag className="w-5 h-5" style={{ color: flag.status === 'Active' ? GREEN : flag.status === 'Damaged' ? '#EF4444' : '#9CA3AF' }} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{flag.flagId} — {flag.location}</h2>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span>{flag.zone} Zone</span>
                      <span>|</span>
                      <span>{flag.mastHeight}m mast</span>
                      <span>|</span>
                      <span>{flag.fabricType.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </div>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-5">
                {/* Status Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl text-center" style={{ backgroundColor: flag.status === 'Active' ? '#F0FDF4' : flag.status === 'Damaged' ? '#FEF2F2' : '#F9FAFB' }}>
                    <div className="text-2xl font-bold" style={{ color: flag.status === 'Active' ? GREEN : flag.status === 'Damaged' ? '#EF4444' : '#9CA3AF' }}>
                      {flag.healthScore}%
                    </div>
                    <div className="text-[10px] text-gray-400">Health Score</div>
                  </div>
                  <div className="p-3 rounded-xl bg-orange-50 text-center">
                    <div className="text-2xl font-bold" style={{ color: SAFFRON }}>{flag.replacementCount}</div>
                    <div className="text-[10px] text-gray-400">Replacements</div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 text-center">
                    <div className="text-2xl font-bold text-blue-600">{flag.costPerCycle ? `₹${(flag.costPerCycle / 100000).toFixed(1)}L` : 'N/A'}</div>
                    <div className="text-[10px] text-gray-400">Cost/Cycle</div>
                  </div>
                </div>

                {/* Status & Environment */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-gray-100">
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Wind className="w-3 h-3" style={{ color: SAFFRON }} /> Environment</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Wind Exposure</span><Badge variant="outline" className="text-[9px] py-0">{flag.windExposure}</Badge></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Pollution Level</span><Badge variant="outline" className="text-[9px] py-0">{flag.pollutionLevel}</Badge></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Nano Coating</span><Badge variant="outline" className="text-[9px] py-0">{flag.nanoCoating}</Badge></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-gray-100">
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: GREEN }} /> Timeline</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Installed</span><span>{new Date(flag.installDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Last Inspection</span><span>{flag.lastInspection ? new Date(flag.lastInspection).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-gray-400">Status</span><Badge className={`text-[9px] py-0 border-0 ${flag.status === 'Active' ? 'bg-green-100 text-green-700' : flag.status === 'Damaged' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{flag.status}</Badge></div>
                    </div>
                  </div>
                </div>

                {/* Sensors */}
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><Cpu className="w-4 h-4" style={{ color: SAFFRON }} /> Sensors ({flag.sensors.length})</h3>
                  <div className="space-y-1.5">
                    {flag.sensors.map((sensor, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${sensor.status === 'Online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {SENSOR_ICONS[sensor.sensorType] || <Cpu className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{sensor.sensorType.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <Badge className={`text-[8px] py-0 border-0 ${sensor.status === 'Online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{sensor.status}</Badge>
                          </div>
                          <span className="text-[10px] text-gray-400">{sensor.sensorId}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Battery className="w-3 h-3" />
                          {sensor.batteryLevel.toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Alerts */}
                {flag.alerts.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" /> Active Alerts ({flag.alerts.filter(a => !a.isResolved).length})</h3>
                    <div className="space-y-2">
                      {flag.alerts.map((alert, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${alert.isResolved ? 'bg-gray-50 border-gray-100' : alert.severity === 'Critical' ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge className={`text-[9px] border-0 ${alert.severity === 'Critical' ? 'bg-red-100 text-red-700' : alert.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{alert.severity}</Badge>
                              <span className="text-xs font-semibold">{alert.alertType}</span>
                              {alert.aiConfidence && <Badge className="text-[9px] bg-purple-100 text-purple-700 border-0">AI: {Math.round(alert.aiConfidence * 100)}%</Badge>}
                            </div>
                            {!alert.isResolved && (
                              <button
                                onClick={() => handleResolveAlert(alert.id)}
                                className="text-[10px] px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                              >
                                Resolve
                              </button>
                            )}
                            {alert.isResolved && <Badge className="text-[9px] bg-green-100 text-green-700 border-0">Resolved</Badge>}
                          </div>
                          <p className="text-xs text-gray-600">{alert.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health History Simulation */}
                <div>
                  <h3 className="text-sm font-semibold mb-2">Health Score Trend</h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={Array.from({ length: 8 }, (_, i) => ({
                      week: `W${i + 1}`,
                      health: Math.max(20, Math.min(100, flag.healthScore + (Math.random() - 0.5) * 20)),
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis dataKey="week" tick={{ fontSize: 9 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                      <Tooltip />
                      <Bar dataKey="health" radius={[3, 3, 0, 0]}>
                        {Array.from({ length: 8 }, (_, i) => (
                          <Cell key={i} fill={i === 7 ? (flag.healthScore > 70 ? GREEN : flag.healthScore > 40 ? SAFFRON : '#EF4444') : '#E5E7EB'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">Flag not found</div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Need this import for the Bar Chart Cell
import { Cell } from 'recharts';
