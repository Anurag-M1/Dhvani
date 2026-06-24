'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  Flag, AlertTriangle, Activity, Shield, Recycle, IndianRupee,
  Wind, Droplets, Eye, ThermometerSun, Cpu, Wifi, WifiOff,
  CheckCircle2, XCircle, Clock, MapPin, Zap, TrendingDown,
  BarChart3, Layers, Leaf, ChevronRight, Bell, Search,
  ArrowUpRight, ArrowDownRight, AlertCircle, Gauge, Radio,
  ScanLine, Microscope, CircleDot, Map, Calendar, Rocket,
  Wrench, FileCheck, ExternalLink
} from 'lucide-react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import FlagDetailDialog from '@/components/FlagDetailDialog';

const DelhiMap = dynamic(() => import('@/components/DelhiMap'), { ssr: false });
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';

// ─── Types ───
interface DashboardData {
  flags: { total: number; active: number; damaged: number; retired: number };
  flagsByZone: { zone: string; count: number }[];
  flagsByFabric: { fabricType: string; count: number }[];
  flagsByWind: { windExposure: string; count: number }[];
  flagsByPollution: { pollutionLevel: string; count: number }[];
  sensors: { total: number; online: number; offline: number };
  alerts: { total: number; unresolved: number; critical: number };
  alertsByType: { type: string; count: number }[];
  alertsBySeverity: { severity: string; count: number }[];
  avgHealthScore: number;
  costProjections: CostProjection[];
  recentAlerts: RecentAlert[];
  materials: Material[];
  lifecycle: { total: number; flagCodeCompliant: number };
  inspections: { total: number };
}

interface CostProjection {
  id: string;
  scenario: string;
  annualReplacement: number;
  costPerFlag: number;
  totalFlags: number;
  annualCost: number;
  savingsPercent: number;
  materialCost: number;
  iotCost: number;
  laborCost: number;
  recyclingRevenue: number;
  netCost: number;
  notes: string;
}

interface RecentAlert {
  id: string;
  alertType: string;
  severity: string;
  message: string;
  isResolved: boolean;
  aiConfidence: number | null;
  createdAt: string;
  flag: { flagId: string; location: string; zone: string };
}

interface Material {
  id: string;
  name: string;
  category: string;
  tensileStrength: number;
  weight: number;
  uvResistance: number;
  waterRepellency: number;
  dustRepellency: number;
  windRating: string;
  lifespanMonths: number;
  costPerSqMeter: number;
  description: string;
  supplier: string;
}

// ─── Constants ───
const SAFFRON = '#FF9933';
const WHITE = '#FFFFFF';
const GREEN = '#138808';
const NAVY = '#000080';
const TRICOLOUR = [SAFFRON, WHITE, GREEN];
const CHART_COLORS = [SAFFRON, '#3B82F6', GREEN, '#8B5CF6', '#EC4899', '#14B8A6'];

const ZONE_COLORS: Record<string, string> = {
  Central: '#FF9933',
  South: '#138808',
  North: '#3B82F6',
  East: '#8B5CF6',
  West: '#EC4899',
  'New Delhi': '#14B8A6',
  'North West': '#F59E0B',
  'South West': '#6366F1',
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'bg-red-500',
  High: 'bg-orange-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
};

const ALERT_ICONS: Record<string, React.ReactNode> = {
  Tear: <AlertTriangle className="w-4 h-4" />,
  Dirt: <Droplets className="w-4 h-4" />,
  Wind: <Wind className="w-4 h-4" />,
  Pollution: <ThermometerSun className="w-4 h-4" />,
  SensorOffline: <WifiOff className="w-4 h-4" />,
};

// ─── Live Alert Type ───
interface LiveAlert {
  id: string;
  flagId: string;
  alertType: string;
  severity: string;
  message: string;
  aiConfidence: number | null;
  location: string;
  timestamp: string;
}

// ─── Helper ───
function formatCurrency(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Main Component ───
export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const [selectedFlagId, setSelectedFlagId] = useState<string | null>(null);
  const [mapFlags, setMapFlags] = useState<Array<{ id: string; flagId: string; location: string; latitude: number; longitude: number; zone: string; status: string; healthScore: number; fabricType: string }>>([]);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Fetch flags for map
  useEffect(() => {
    fetch('/api/flags?limit=100')
      .then(res => res.json())
      .then(data => setMapFlags(data.flags || []))
      .catch(console.error);
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // WebSocket for real-time alerts
  useEffect(() => {
    const socket = io('/?XTransformPort=3003', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => { setWsConnected(true); });
    socket.on('disconnect', () => { setWsConnected(false); });

    socket.on('flag-alert', (alert: LiveAlert) => {
      setLiveAlerts(prev => [alert, ...prev].slice(0, 20));
    });

    return () => { socket.disconnect(); };
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-green-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="flex gap-1 justify-center mb-4">
            {[SAFFRON, WHITE, GREEN].map((c, i) => (
              <motion.div
                key={i}
                className="w-3 h-12 rounded-full"
                style={{ backgroundColor: c, border: c === WHITE ? '1px solid #e5e7eb' : 'none' }}
                animate={{ scaleY: [1, 1.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
          <p className="text-lg font-semibold text-gray-700">Loading Dhvani...</p>
          <p className="text-sm text-gray-400 mt-1">Smart & Resilient National Flag System</p>
        </motion.div>
      </div>
    );
  }

  const { flags, sensors, alerts, costProjections, recentAlerts, materials, flagsByZone, flagsByFabric, alertsByType, alertsBySeverity, flagsByWind, avgHealthScore } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/40 via-white to-green-50/40">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-orange-100 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Tricolour bar */}
            <div className="flex flex-col w-1.5 h-10 rounded-full overflow-hidden">
              <div className="flex-1" style={{ backgroundColor: SAFFRON }} />
              <div className="flex-1 bg-white border-x border-gray-200" />
              <div className="flex-1" style={{ backgroundColor: GREEN }} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                <span style={{ color: SAFFRON }}>Dh</span>
                <span className="text-gray-800">va</span>
                <span style={{ color: GREEN }}>ni</span>
              </h1>
              <p className="text-[10px] text-gray-400 -mt-0.5 tracking-wider uppercase">Smart & Resilient National Flag System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-gray-500">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${wsConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} ></span>
                {wsConnected ? 'Live' : 'Connecting'}
              </span>
              <span>Auto-refresh: 30s</span>
            </div>
            <div className="relative">
              <Bell className="w-5 h-5 text-gray-500" />
              {alerts.critical > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {alerts.critical}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs hidden sm:flex">
              <IndianRupee className="w-3 h-3 mr-1" />
              {formatCurrency(1040000000)}/yr Current
            </Badge>
          </div>
        </div>
        {/* Tricolour accent line */}
        <div className="flex h-0.5">
          <div className="flex-1" style={{ backgroundColor: SAFFRON }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ backgroundColor: GREEN }} />
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-[1600px] mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 h-auto gap-1 bg-white/60 backdrop-blur p-1 rounded-xl border">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <Gauge className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <Map className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="iot" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <Cpu className="w-3.5 h-3.5" /> <span className="hidden sm:inline">IoT</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <Microscope className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Materials</span>
            </TabsTrigger>
            <TabsTrigger value="lifecycle" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <Recycle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Lifecycle</span>
            </TabsTrigger>
            <TabsTrigger value="cost" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <IndianRupee className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cost</span>
            </TabsTrigger>
            <TabsTrigger value="roadmap" className="flex items-center gap-1.5 text-xs md:text-sm py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-green-50 data-[state=active]:shadow-sm">
              <Rocket className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Roadmap</span>
            </TabsTrigger>
          </TabsList>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 1: DASHBOARD OVERVIEW                                     */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <KPICard icon={<Flag className="w-5 h-5" />} label="Total Flags" value={flags.total.toString()} color={SAFFRON} />
              <KPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Active" value={flags.active.toString()} color={GREEN} />
              <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="Damaged" value={flags.damaged.toString()} color="#EF4444" />
              <KPICard icon={<Activity className="w-5 h-5" />} label="Avg Health" value={`${avgHealthScore}%`} color={avgHealthScore > 70 ? GREEN : avgHealthScore > 40 ? SAFFRON : '#EF4444'} />
              <KPICard icon={<AlertCircle className="w-5 h-5" />} label="Open Alerts" value={alerts.unresolved.toString()} color="#F97316" />
              <KPICard icon={<Cpu className="w-5 h-5" />} label="Sensors Online" value={`${sensors.online}/${sensors.total}`} color="#3B82F6" />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Zone Distribution */}
              <Card className="lg:col-span-2 border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: SAFFRON }} />
                    Flags by Zone — Delhi NCT
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={flagsByZone} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="zone" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                        {flagsByZone.map((entry, idx) => (
                          <Cell key={idx} fill={ZONE_COLORS[entry.zone] || CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Fabric Distribution */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4" style={{ color: GREEN }} />
                    Fabric Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={flagsByFabric} dataKey="count" nameKey="fabricType" cx="50%" cy="50%" outerRadius={80} innerRadius={50} label={({ fabricType, count }) => `${fabricType.replace(/([A-Z])/g, ' $1')} (${count})`} labelLine={false}>
                        {flagsByFabric.map((_, idx) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {flagsByFabric.map((f, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]" style={{ borderColor: CHART_COLORS[i % CHART_COLORS.length], color: CHART_COLORS[i % CHART_COLORS.length] }}>
                        {f.fabricType.replace(/([A-Z])/g, ' $1')}: {f.count}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alerts + Health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Alerts */}
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-500" />
                    Recent Alerts
                    {alerts.critical > 0 && <Badge variant="destructive" className="text-[10px] ml-1">{alerts.critical} Critical</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {recentAlerts.map((alert) => (
                      <motion.div
                        key={alert.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-start gap-3 p-3 rounded-lg ${alert.severity === 'Critical' ? 'bg-red-50 border border-red-100' : alert.severity === 'High' ? 'bg-orange-50 border border-orange-100' : 'bg-gray-50 border border-gray-100'}`}
                      >
                        <div className="mt-0.5" style={{ color: alert.severity === 'Critical' ? '#EF4444' : alert.severity === 'High' ? '#F97316' : '#6B7280' }}>
                          {ALERT_ICONS[alert.alertType] || <AlertCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className="text-[9px] py-0">{alert.flag.flagId}</Badge>
                            <span className="text-xs font-medium">{alert.flag.location}</span>
                            {alert.aiConfidence && (
                              <Badge className="text-[9px] py-0 bg-purple-100 text-purple-700 border-0">
                                AI: {Math.round(alert.aiConfidence * 100)}%
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 line-clamp-2">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-400">{timeAgo(alert.createdAt)}</span>
                            {alert.isResolved ? (
                              <Badge className="text-[9px] py-0 bg-green-100 text-green-700 border-0">Resolved</Badge>
                            ) : (
                              <Badge className="text-[9px] py-0 bg-red-100 text-red-700 border-0">Open</Badge>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Health Score + Alert Breakdown */}
              <div className="space-y-6">
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="w-4 h-4" style={{ color: SAFFRON }} />
                      Fleet Health Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke={avgHealthScore > 70 ? GREEN : avgHealthScore > 40 ? SAFFRON : '#EF4444'} strokeWidth="3" strokeDasharray={`${avgHealthScore} 100`} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold">{avgHealthScore}%</span>
                        </div>
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Active Flags</span><span className="font-semibold text-green-600">{flags.active}</span></div>
                        <Progress value={(flags.active / flags.total) * 100} className="h-2" />
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Damaged</span><span className="font-semibold text-red-600">{flags.damaged}</span></div>
                        <Progress value={(flags.damaged / flags.total) * 100} className="h-2" />
                        <div className="flex justify-between text-xs"><span className="text-gray-500">Sensors Online</span><span className="font-semibold text-blue-600">{Math.round((sensors.online / sensors.total) * 100)}%</span></div>
                        <Progress value={(sensors.online / sensors.total) * 100} className="h-2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Alert Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={alertsByType} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                        <XAxis dataKey="type" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {alertsByType.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 2: IoT MONITORING                                        */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="iot" className="space-y-6">
            {/* IoT Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <KPICard icon={<Cpu className="w-5 h-5" />} label="Total Sensors" value={sensors.total.toString()} color="#3B82F6" />
              <KPICard icon={<Wifi className="w-5 h-5" />} label="Online" value={sensors.online.toString()} color={GREEN} />
              <KPICard icon={<WifiOff className="w-5 h-5" />} label="Offline" value={sensors.offline.toString()} color="#EF4444" />
              <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="Critical Alerts" value={alerts.critical.toString()} color="#EF4444" />
              <KPICard icon={<Eye className="w-5 h-5" />} label="AI-CV Alerts" value={alertsByType.filter(a => a.type === 'Tear' || a.type === 'Dirt').reduce((s, a) => s + a.count, 0).toString()} color="#8B5CF6" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sensor Architecture */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Radio className="w-4 h-4" style={{ color: SAFFRON }} />
                    IoT Sensor Architecture — Dhvani Edge Network
                  </CardTitle>
                  <CardDescription>5 sensor types per flag mast, connected to Central Control via LoRaWAN + 4G</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { type: 'Accelerometer', icon: <Activity className="w-4 h-4" />, desc: 'Detects vibration patterns, flag flutter frequency, and structural resonance anomalies', color: '#3B82F6' },
                      { type: 'Strain Gauge', icon: <Gauge className="w-4 h-4" />, desc: 'Measures fabric tension at 6 critical stress points (hoist, fly-end, seams) in microstrain', color: '#8B5CF6' },
                      { type: 'Wind Speed', icon: <Wind className="w-4 h-4" />, desc: 'Anemometer at mast top — triggers auto-retract at >80 km/h, storm warning at >60 km/h', color: SAFFRON },
                      { type: 'Humidity', icon: <Droplets className="w-4 h-4" />, desc: 'Monitors moisture absorption — correlates with fabric degradation and coating effectiveness', color: '#14B8A6' },
                      { type: 'Camera (AI-CV)', icon: <ScanLine className="w-4 h-4" />, desc: '360° hemispheric camera with edge AI — YOLOv8 tear detection, dirt opacity scoring', color: '#EC4899' },
                    ].map((sensor, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sensor.color}15`, color: sensor.color }}>
                          {sensor.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{sensor.type}</span>
                            <Badge variant="outline" className="text-[9px] py-0">x{flags.total}</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{sensor.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Communication Stack</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Edge → Gateway', value: 'LoRaWAN 868MHz', icon: <Radio className="w-3 h-3" /> },
                        { label: 'Gateway → Cloud', value: '4G LTE + Fiber', icon: <Wifi className="w-3 h-3" /> },
                        { label: 'AI Inference', value: 'Edge TPU + Cloud', icon: <Cpu className="w-3 h-3" /> },
                        { label: 'Alert Latency', value: '< 3 seconds', icon: <Zap className="w-3 h-3" /> },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-gray-100 text-xs">
                          <span style={{ color: SAFFRON }}>{item.icon}</span>
                          <div>
                            <div className="text-gray-400 text-[10px]">{item.label}</div>
                            <div className="font-medium">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Alert Severity + Wind Exposure */}
              <div className="space-y-6">
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      Alert Severity Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={alertsBySeverity} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={75} innerRadius={45} label={({ severity, count }) => `${severity}: ${count}`} labelLine={false}>
                          {alertsBySeverity.map((entry, idx) => {
                            const colors: Record<string, string> = { Critical: '#EF4444', High: '#F97316', Medium: '#EAB308', Low: '#22C55E' };
                            return <Cell key={idx} fill={colors[entry.severity] || CHART_COLORS[idx]} />;
                          })}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wind className="w-4 h-4" style={{ color: SAFFRON }} />
                      Wind Exposure Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={flagsByWind} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                        <XAxis dataKey="windExposure" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {flagsByWind.map((entry, i) => {
                            const colors: Record<string, string> = { Low: '#22C55E', Medium: SAFFRON, High: '#F97316', Extreme: '#EF4444' };
                            return <Cell key={i} fill={colors[entry.windExposure] || CHART_COLORS[i]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Live Alert Stream */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4" style={{ color: GREEN }} />
                      Live Alert Stream
                      {wsConnected ? <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> : <span className="w-2 h-2 rounded-full bg-yellow-500" />}
                      {liveAlerts.length > 0 && <Badge className="text-[9px] bg-red-100 text-red-700 border-0">{liveAlerts.length} new</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {liveAlerts.length > 0 ? liveAlerts.map((alert) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2 p-2 rounded-lg text-xs border border-gray-100"
                          style={{ backgroundColor: alert.severity === 'Critical' ? '#FEF2F2' : alert.severity === 'High' ? '#FFF7ED' : '#F9FAFB' }}
                        >
                          <span className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[alert.severity] || 'bg-gray-400'}`} />
                          <span className="font-mono text-gray-400">{alert.flagId}</span>
                          <span className="flex-1 truncate font-medium">{alert.alertType} — {alert.location}</span>
                          {alert.aiConfidence && <Badge className="text-[9px] bg-purple-100 text-purple-700 border-0 py-0">AI: {Math.round(alert.aiConfidence * 100)}%</Badge>}
                          <span className="text-gray-400 shrink-0">{timeAgo(alert.timestamp)}</span>
                        </motion.div>
                      )) : recentAlerts.slice(0, 8).map((alert) => (
                        <div key={alert.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-xs">
                          <span className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[alert.severity] || 'bg-gray-400'}`} />
                          <span className="font-mono text-gray-400">{alert.flag.flagId}</span>
                          <span className="flex-1 truncate">{alert.alertType} — {alert.flag.location}</span>
                          <span className="text-gray-400 shrink-0">{timeAgo(alert.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* AI Computer Vision Section */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-purple-50 to-pink-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4 text-purple-600" />
                  AI Computer Vision System — Tear & Dirt Detection Pipeline
                </CardTitle>
                <CardDescription>Real-time YOLOv8 + custom classifier running on Edge TPU at each flag mast</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { step: '1', title: 'Capture', desc: '360° hemispheric camera captures flag image every 30 seconds during daylight, every 2 min with IR at night', color: '#3B82F6' },
                    { step: '2', title: 'Detect', desc: 'YOLOv8-nano model runs on Edge TPU — classifies tears (>5mm), dirt patches, color fading with 94% mAP', color: '#8B5CF6' },
                    { step: '3', title: 'Classify', desc: 'Severity classifier: Minor (<2cm tear), Major (2-10cm), Critical (>10cm or multi-tear). Dirt scored 0-100 opacity', color: SAFFRON },
                    { step: '4', title: 'Alert', desc: 'Push notification to Dhvani Control Room + auto-create work order. AI confidence tag attached for human verification', color: GREEN },
                  ].map((item, i) => (
                    <div key={i} className="relative p-4 rounded-xl bg-white/80 border border-gray-100">
                      <div className="absolute -top-3 -left-1 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: item.color }}>
                        {item.step}
                      </div>
                      <h4 className="font-semibold text-sm mt-2">{item.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                      {i < 3 && <ChevronRight className="w-4 h-4 absolute -right-3 top-1/2 -translate-y-1/2 text-gray-300 hidden md:block" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 3: MATERIALS LAB                                         */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="materials" className="space-y-6">
            <Card className="border-0 shadow-md bg-gradient-to-r from-orange-50 to-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Microscope className="w-5 h-5" style={{ color: SAFFRON }} />
                  Material Innovation Lab
                </CardTitle>
                <CardDescription>
                  Comparative analysis of advanced fabric and coating technologies for extending Tricolour lifespan by 2-3x
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Material Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {materials.map((mat, i) => (
                <motion.div
                  key={mat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className={`border-0 shadow-md h-full ${mat.name.includes('Graphene') ? 'ring-2 ring-purple-200 bg-gradient-to-br from-purple-50 to-white' : mat.name.includes('Kevlar') ? 'ring-2 ring-blue-200' : ''}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{mat.name}</CardTitle>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-[9px]">{mat.category}</Badge>
                          {mat.name.includes('Graphene') && <Badge className="text-[9px] bg-purple-100 text-purple-700 border-0">Next-Gen</Badge>}
                          {mat.name.includes('Kevlar') && <Badge className="text-[9px] bg-blue-100 text-blue-700 border-0">Military-Grade</Badge>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{mat.description}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="text-center p-2 rounded-lg bg-gray-50">
                          <div className="text-lg font-bold" style={{ color: mat.lifespanMonths >= 12 ? GREEN : mat.lifespanMonths >= 6 ? SAFFRON : '#EF4444' }}>
                            {mat.lifespanMonths}mo
                          </div>
                          <div className="text-[10px] text-gray-400">Lifespan</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-gray-50">
                          <div className="text-lg font-bold">{mat.tensileStrength > 0 ? `${mat.tensileStrength}` : 'N/A'}</div>
                          <div className="text-[10px] text-gray-400">Tensile (N/m2)</div>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-gray-50">
                          <div className="text-lg font-bold">{formatCurrency(mat.costPerSqMeter)}/m2</div>
                          <div className="text-[10px] text-gray-400">Cost</div>
                        </div>
                      </div>

                      {/* Performance Bars */}
                      <div className="space-y-2">
                        {[
                          { label: 'UV Resistance', value: mat.uvResistance },
                          { label: 'Water Repellency', value: mat.waterRepellency },
                          { label: 'Dust Repellency', value: mat.dustRepellency },
                        ].map((perf, j) => (
                          <div key={j}>
                            <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                              <span>{perf.label}</span>
                              <span>{perf.value}/10</span>
                            </div>
                            <Progress value={perf.value * 10} className="h-1.5" />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Wind className="w-3 h-3" /> {mat.windRating}
                        </div>
                        <div className="text-[10px] text-gray-400">{mat.weight}g/m2</div>
                        <div className="text-[10px] text-gray-400">{mat.supplier}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Radar Comparison Chart */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Material Performance Comparison (Radar)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={[
                    { metric: 'Tensile Strength', 'Standard Polyester': 25, 'NanoCoated v2': 38, 'Kevlar Blend': 67, 'Graphene Polymer': 100 },
                    { metric: 'UV Resistance', 'Standard Polyester': 50, 'NanoCoated v2': 80, 'Kevlar Blend': 70, 'Graphene Polymer': 90 },
                    { metric: 'Water Repellency', 'Standard Polyester': 30, 'NanoCoated v2': 90, 'Kevlar Blend': 60, 'Graphene Polymer': 100 },
                    { metric: 'Dust Repellency', 'Standard Polyester': 20, 'NanoCoated v2': 80, 'Kevlar Blend': 50, 'Graphene Polymer': 90 },
                    { metric: 'Lifespan', 'Standard Polyester': 17, 'NanoCoated v2': 50, 'Kevlar Blend': 67, 'Graphene Polymer': 100 },
                    { metric: 'Weight (inverse)', 'Standard Polyester': 51, 'NanoCoated v2': 61, 'Kevlar Blend': 46, 'Graphene Polymer': 78 },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="Standard Polyester" dataKey="Standard Polyester" stroke="#9CA3AF" fill="#9CA3AF" fillOpacity={0.15} />
                    <Radar name="NanoCoated v2" dataKey="NanoCoated v2" stroke={SAFFRON} fill={SAFFRON} fillOpacity={0.15} />
                    <Radar name="Kevlar Blend" dataKey="Kevlar Blend" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} />
                    <Radar name="Graphene Polymer" dataKey="Graphene Polymer" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.15} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 4: LIFECYCLE MANAGEMENT                                   */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="lifecycle" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard icon={<Flag className="w-5 h-5" />} label="Total Records" value={data.lifecycle.total.toString()} color="#3B82F6" />
              <KPICard icon={<Recycle className="w-5 h-5" />} label="Flag Code Compliant" value={data.lifecycle.total > 0 ? `${Math.round((data.lifecycle.flagCodeCompliant / data.lifecycle.total) * 100)}%` : 'N/A'} color={GREEN} />
              <KPICard icon={<CheckCircle2 className="w-5 h-5" />} label="Inspections" value={data.inspections.total.toString()} color={SAFFRON} />
              <KPICard icon={<Shield className="w-5 h-5" />} label="Compliance Rate" value="100%" color={GREEN} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Flag Code of India Compliance */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-5 h-5" style={{ color: SAFFRON }} />
                    Flag Code of India — Compliance Framework
                  </CardTitle>
                  <CardDescription>
                    Section XI of the Flag Code of India mandates respectful disposal of the National Flag
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { step: '1', title: 'Damage Detection', desc: 'IoT sensors detect tear/dirt exceeding threshold. AI-CV confirms with photographic evidence and severity classification.', icon: <Eye className="w-4 h-4" />, color: '#3B82F6' },
                      { step: '2', title: 'Dignified Removal', desc: 'Flag is lowered with full protocol by trained PWD personnel. Never touches the ground. Folded in the prescribed triangular fold.', icon: <Flag className="w-4 h-4" />, color: SAFFRON },
                      { step: '3', title: 'Inspection & Certification', desc: 'Retired flag is inspected and a Flag Code Compliance Certificate (FCC) is issued with unique tracking number.', icon: <CheckCircle2 className="w-4 h-4" />, color: GREEN },
                      { step: '4', title: 'Respectful Disposal', desc: 'Primary: Respectful burning in private with dignity. Alternative: Recycling into commemorative items with honor ceremony.', icon: <Leaf className="w-4 h-4" />, color: '#14B8A6' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: item.color }}>
                          {item.step}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{item.title}</span>
                            <span style={{ color: item.color }}>{item.icon}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recycling Pathways */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Recycle className="w-5 h-5" style={{ color: GREEN }} />
                    Sustainable Recycling Pathways
                  </CardTitle>
                  <CardDescription>
                    Converting retired flags into dignified, valuable outcomes while maintaining full Flag Code compliance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { title: 'Commemorative Patches', pct: 35, desc: 'Retired flag fabric is cut into small commemorative patches and distributed to schools, government offices, and freedom fighter families with certificates of authenticity.', revenue: '₹15L/year' },
                      { title: 'Museum & Archives', pct: 20, desc: 'Historically significant flags (e.g., Republic Day, Independence Day) are preserved in the National Flag Museum with proper archival treatment and documentation.', revenue: '₹5L/year' },
                      { title: 'Ceremonial Ash (Asthi)', pct: 30, desc: 'As per Flag Code, flags are respectfully burned in private. Ash is collected and offered at designated water bodies with full ceremonial protocol, as done for sacred objects.', revenue: 'N/A' },
                      { title: 'Fiber Recycling', pct: 15, desc: 'Non-ceremonial fabric is processed through fiber recycling facilities. Recovered polyester is used in non-flag government textile applications (tents, tarps).', revenue: '₹10L/year' },
                    ].map((path, i) => (
                      <div key={i} className="p-3 rounded-xl border border-gray-100 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold">{path.title}</span>
                          <div className="flex items-center gap-2">
                            {path.revenue !== 'N/A' && <Badge className="text-[9px] bg-green-100 text-green-700 border-0">{path.revenue}</Badge>}
                            <Badge variant="outline" className="text-[9px]">{path.pct}%</Badge>
                          </div>
                        </div>
                        <Progress value={path.pct} className="h-1.5 mb-1.5" />
                        <p className="text-xs text-gray-500">{path.desc}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Leaf className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Total Recycling Revenue Potential</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">₹30 Lakhs/year</p>
                    <p className="text-xs text-green-600 mt-1">Offset against operational costs. Revenue increases with nano-coated fabrics yielding higher-quality recyclable material.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB 5: COST & ROI ANALYSIS                                   */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="cost" className="space-y-6">
            {/* The ₹104 Crore Problem */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-red-50 to-orange-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <IndianRupee className="w-5 h-5 text-red-600" />
                  The ₹104 Crore Problem
                </CardTitle>
                <CardDescription>
                  Current annual cost of maintaining Delhi's 500 high-mast national flags with standard polyester and manual processes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl bg-white/80">
                    <div className="text-2xl font-bold text-red-600">₹104 Cr</div>
                    <div className="text-xs text-gray-500">Annual Cost (Current)</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/80">
                    <div className="text-2xl font-bold text-red-700">₹208 Cr</div>
                    <div className="text-xs text-gray-500">If Doubled to 8x/year</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/80">
                    <div className="text-2xl font-bold" style={{ color: GREEN }}>₹14 Cr</div>
                    <div className="text-xs text-gray-500">With Smart System</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/80">
                    <div className="text-2xl font-bold" style={{ color: GREEN }}>86.5%</div>
                    <div className="text-xs text-gray-500">Potential Savings</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Scenario Comparison */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Scenario Comparison — Annual Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 font-semibold">Scenario</th>
                        <th className="text-center py-3 px-2 font-semibold">Replacements/yr</th>
                        <th className="text-right py-3 px-2 font-semibold">Material</th>
                        <th className="text-right py-3 px-2 font-semibold">IoT/AI</th>
                        <th className="text-right py-3 px-2 font-semibold">Labor</th>
                        <th className="text-right py-3 px-2 font-semibold">Recycling Rev.</th>
                        <th className="text-right py-3 px-2 font-semibold">Net Cost</th>
                        <th className="text-center py-3 px-2 font-semibold">Savings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costProjections.map((cp, i) => (
                        <tr key={i} className={`border-b border-gray-100 ${cp.savingsPercent > 50 ? 'bg-green-50/50' : cp.savingsPercent < 0 ? 'bg-red-50/50' : ''}`}>
                          <td className="py-3 px-2 font-medium">{cp.scenario}</td>
                          <td className="text-center py-3 px-2">{cp.annualReplacement}x</td>
                          <td className="text-right py-3 px-2">{formatCurrency(cp.materialCost)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(cp.iotCost)}</td>
                          <td className="text-right py-3 px-2">{formatCurrency(cp.laborCost)}</td>
                          <td className="text-right py-3 px-2 text-green-600">+{formatCurrency(cp.recyclingRevenue)}</td>
                          <td className="text-right py-3 px-2 font-bold">{formatCurrency(cp.netCost)}</td>
                          <td className="text-center py-3 px-2">
                            <Badge className={`text-[10px] ${cp.savingsPercent > 50 ? 'bg-green-100 text-green-700' : cp.savingsPercent < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'} border-0`}>
                              {cp.savingsPercent > 0 ? <ArrowDownRight className="w-3 h-3 mr-0.5" /> : cp.savingsPercent < 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : null}
                              {cp.savingsPercent > 0 ? `${cp.savingsPercent}%` : cp.savingsPercent < 0 ? `${cp.savingsPercent}%` : 'Baseline'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Cost Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Annual Net Cost by Scenario</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={costProjections.map(cp => ({
                      scenario: cp.scenario.length > 20 ? cp.scenario.substring(0, 20) + '...' : cp.scenario,
                      netCost: cp.netCost / 10000000,
                      savings: cp.savingsPercent,
                    }))} margin={{ bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="scenario" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fontSize: 10 }} label={{ value: '₹ Crores', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <Tooltip formatter={(v: number) => [`₹${v.toFixed(1)} Cr`, 'Net Cost']} />
                      <Bar dataKey="netCost" radius={[4, 4, 0, 0]}>
                        {costProjections.map((cp, i) => (
                          <Cell key={i} fill={cp.savingsPercent > 50 ? GREEN : cp.savingsPercent < 0 ? '#EF4444' : cp.savingsPercent > 0 ? SAFFRON : '#9CA3AF'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Savings Trajectory Over 5 Years (Kevlar + IoT)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={[
                      { year: 'Year 0', current: 104, smart: 104, cumulativeSaving: 0 },
                      { year: 'Year 1', current: 104, smart: 43, cumulativeSaving: 61 },
                      { year: 'Year 2', current: 104, smart: 43, cumulativeSaving: 122 },
                      { year: 'Year 3', current: 104, smart: 43, cumulativeSaving: 183 },
                      { year: 'Year 4', current: 104, smart: 43, cumulativeSaving: 244 },
                      { year: 'Year 5', current: 104, smart: 43, cumulativeSaving: 305 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} label={{ value: '₹ Crores', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="current" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} name="Current Cost" />
                      <Area type="monotone" dataKey="smart" stroke={GREEN} fill={GREEN} fillOpacity={0.1} name="Smart System" />
                      <Line type="monotone" dataKey="cumulativeSaving" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" name="Cumulative Savings" />
                      <Legend />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* ROI Summary */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-teal-50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-green-600" />
                  Recommended Solution: Kevlar Blend + Full Smart System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Investment Required</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Kevlar fabric (500 flags x 1.45x cost)</span><span className="font-semibold">₹31 Cr</span></div>
                      <div className="flex justify-between"><span>IoT sensors (5 per mast x 500)</span><span className="font-semibold">₹6.5 Cr</span></div>
                      <div className="flex justify-between"><span>AI/CV edge compute + cloud</span><span className="font-semibold">₹3.5 Cr</span></div>
                      <div className="flex justify-between"><span>Control room software + training</span><span className="font-semibold">₹2 Cr</span></div>
                      <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Total Year 1</span><span className="font-bold text-green-700">₹43 Cr</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Annual Savings</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span>Reduced replacements (4x → 1x)</span><span className="font-semibold text-green-600">₹61 Cr saved</span></div>
                      <div className="flex justify-between"><span>Automated inspections (IoT)</span><span className="font-semibold text-green-600">₹34 Cr saved</span></div>
                      <div className="flex justify-between"><span>Reduced washing (nano-coating)</span><span className="font-semibold text-green-600">₹8 Cr saved</span></div>
                      <div className="flex justify-between"><span>Recycling revenue</span><span className="font-semibold text-green-600">+₹2.5 Cr</span></div>
                      <div className="flex justify-between border-t pt-1 mt-1"><span className="font-semibold">Net Annual Saving</span><span className="font-bold text-green-700">₹61 Cr</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">5-Year Impact</h4>
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-white/80">
                        <div className="text-3xl font-bold text-green-700">₹305 Cr</div>
                        <div className="text-xs text-gray-500">Cumulative Savings</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/80">
                        <div className="text-3xl font-bold" style={{ color: SAFFRON }}>7.1x</div>
                        <div className="text-xs text-gray-500">ROI on Investment</div>
                      </div>
                      <div className="p-3 rounded-xl bg-white/80">
                        <div className="text-3xl font-bold text-blue-700">8.5 mo</div>
                        <div className="text-xs text-gray-500">Payback Period</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: DELHI MAP                                               */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="map" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Map className="w-5 h-5" style={{ color: SAFFRON }} />
                  Delhi NCT — Flag Location Map
                </CardTitle>
                <CardDescription>Click on any flag marker to view detailed sensor data, health score, and alerts</CardDescription>
              </CardHeader>
              <CardContent>
                <DelhiMap
                  flags={mapFlags}
                  onFlagClick={(flag) => setSelectedFlagId(flag.id)}
                />
              </CardContent>
            </Card>

            {/* Flag Grid below map */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.flagsByZone.map((zone, i) => (
                <motion.div
                  key={zone.zone}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ZONE_COLORS[zone.zone] || SAFFRON}15` }}>
                            <MapPin className="w-4 h-4" style={{ color: ZONE_COLORS[zone.zone] || SAFFRON }} />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{zone.zone} Zone</div>
                            <div className="text-[10px] text-gray-400">{zone.count} flags</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px]" style={{ borderColor: ZONE_COLORS[zone.zone] || SAFFRON, color: ZONE_COLORS[zone.zone] || SAFFRON }}>
                          {zone.count} flags
                        </Badge>
                      </div>
                      <Progress value={(zone.count / flags.total) * 100} className="h-1.5" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* ════════════════════════════════════════════════════════════ */}
          {/* TAB: SOLUTION ROADMAP                                         */}
          {/* ════════════════════════════════════════════════════════════ */}
          <TabsContent value="roadmap" className="space-y-6">
            {/* System Architecture */}
            <Card className="border-0 shadow-md bg-gradient-to-r from-orange-50 via-white to-green-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Rocket className="w-5 h-5" style={{ color: SAFFRON }} />
                  Dhvani System Architecture — End-to-End Solution
                </CardTitle>
                <CardDescription>From IoT sensors at the flag mast to the Central Command dashboard</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {[
                    { title: 'Edge Layer', desc: '5 sensors per mast (Accel, Strain, Humidity, Wind, Camera) + Edge TPU for AI inference. Solar-powered, LoRaWAN connected.', icon: <Cpu className="w-5 h-5" />, color: '#3B82F6' },
                    { title: 'Gateway Layer', desc: 'LoRaWAN gateways per zone (8 total). Aggregate sensor data, buffer during connectivity loss, forward via 4G/fiber.', icon: <Radio className="w-5 h-5" />, color: '#8B5CF6' },
                    { title: 'Cloud Platform', desc: 'AWS/Azure IoT Core. Time-series DB for sensor data. YOLOv8 + custom classifier for CV. Alerting engine.', icon: <Layers className="w-5 h-5" />, color: SAFFRON },
                    { title: 'AI/ML Pipeline', desc: 'Real-time tear detection (94% mAP), dirt opacity scoring, weather prediction, health score ML model. Retrained monthly.', icon: <Eye className="w-5 h-5" />, color: '#EC4899' },
                    { title: 'Command Center', desc: 'This dashboard. Real-time monitoring, alert management, predictive maintenance, cost optimization, Flag Code compliance.', icon: <Gauge className="w-5 h-5" />, color: GREEN },
                  ].map((layer, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.12 }}
                      className="p-4 rounded-xl bg-white/80 border border-gray-100"
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${layer.color}15`, color: layer.color }}>
                        {layer.icon}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{layer.title}</h4>
                      <p className="text-xs text-gray-500">{layer.desc}</p>
                      {i < 4 && <ChevronRight className="w-4 h-4 text-gray-300 absolute -right-2 top-1/2 hidden md:block" />}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Implementation Timeline */}
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5" style={{ color: GREEN }} />
                  Implementation Roadmap — 18 Months to Full Deployment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      phase: 'Phase 1: Pilot & Validation',
                      months: 'Month 1-3',
                      status: 'recommended-start',
                      items: [
                        'Deploy 25 IoT sensor kits on high-priority flags (India Gate, Rashtrapati Bhavan, Parliament)',
                        'Install 5 AI-CV cameras with Edge TPU at Central zone pilot sites',
                        'Set up LoRaWAN gateway infrastructure for Central zone',
                        'Begin nano-coating trial on 10 flags (NanoCoated Polyester v2)',
                        'Establish baseline data collection for ML model training',
                      ],
                      budget: '₹8.5 Cr',
                      color: SAFFRON,
                    },
                    {
                      phase: 'Phase 2: Zone Rollout',
                      months: 'Month 4-8',
                      status: 'planned',
                      items: [
                        'Expand IoT sensors to all 500 flags across 8 zones',
                        'Install LoRaWAN gateways in remaining 7 zones',
                        'Deploy AI-CV cameras at 100 high-traffic flag locations',
                        'Begin Kevlar-Polyester blend fabric deployment for Extreme wind zones',
                        'Launch Dhvani Command Center dashboard (this software) for live monitoring',
                        'Train PWD personnel on IoT-assisted inspection protocols',
                      ],
                      budget: '₹22 Cr',
                      color: '#3B82F6',
                    },
                    {
                      phase: 'Phase 3: Full Smart System',
                      months: 'Month 9-14',
                      status: 'planned',
                      items: [
                        'Complete Kevlar blend fabric upgrade for all 500 flags',
                        'Deploy auto-retract mechanisms for 150 extreme weather zone flags',
                        'Integrate IMD weather API for predictive storm alerts',
                        'Launch predictive maintenance ML model (trained on 6+ months of data)',
                        'Implement lifecycle management with Flag Code compliance tracking',
                        'Begin recycling program for retired flags (₹30L/yr revenue)',
                      ],
                      budget: '₹15 Cr',
                      color: GREEN,
                    },
                    {
                      phase: 'Phase 4: Optimization & Scale',
                      months: 'Month 15-18',
                      status: 'future',
                      items: [
                        'Deploy Graphene-Reinforced Polymer on 50 VIP-location flags (future-proofing)',
                        'Integrate with Delhi 311 app for citizen flag-damage reporting',
                        'Scale solution to other state capitals (Mumbai, Chennai, Kolkata)',
                        'Publish research paper on Smart Flag System methodology',
                        'Target: ₹61 Cr annual savings confirmed, 86.5% cost reduction achieved',
                      ],
                      budget: '₹5 Cr',
                      color: '#8B5CF6',
                    },
                  ].map((phase, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative pl-8 border-l-2"
                      style={{ borderColor: phase.color }}
                    >
                      <div className="absolute -left-2.5 top-0 w-5 h-5 rounded-full border-2 border-white shadow-md flex items-center justify-center" style={{ backgroundColor: phase.color }}>
                        <span className="text-white text-[9px] font-bold">{i + 1}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-sm">{phase.phase}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">{phase.months}</Badge>
                            <Badge className="text-[10px] border-0" style={{ backgroundColor: `${phase.color}20`, color: phase.color }}>{phase.budget}</Badge>
                          </div>
                        </div>
                        <ul className="space-y-1.5">
                          {phase.items.map((item, j) => (
                            <li key={j} className="flex items-start gap-2 text-xs text-gray-600">
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: phase.color }} />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-teal-50 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-green-800">Total Investment: ₹43 Cr</div>
                      <div className="text-xs text-green-600">Expected annual savings: ₹61 Cr/year | Payback: 8.5 months</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-700">7.1x ROI</div>
                      <div className="text-xs text-green-600">5-year return</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Innovation Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-md bg-gradient-to-br from-orange-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Microscope className="w-4 h-4" style={{ color: SAFFRON }} />
                    Material Science
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: SAFFRON }}></span>Kevlar-Polyester blend withstands 150 km/h winds — 4x stronger than current fabric</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: SAFFRON }}></span>TiO2 photocatalytic coating: self-cleaning via UV light, reduces washing by 70%</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: SAFFRON }}></span>Graphene nanoplatelets (future): 18-month lifespan, 2x lighter than polyester</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    IoT & AI
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500"></span>5 sensors per mast: real-time structural health + environmental monitoring</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500"></span>AI-CV tear detection: YOLOv8 on Edge TPU, 94% confidence, &lt;3s alert latency</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500"></span>Predictive ML: weather-based degradation forecasting, proactive maintenance scheduling</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Leaf className="w-4 h-4" style={{ color: GREEN }} />
                    Sustainability
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: GREEN }}></span>100% Flag Code of India compliant: respectful disposal with FCC certification</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: GREEN }}></span>Recycling revenue: ₹30L/yr from commemorative patches, museum pieces, fiber recovery</li>
                    <li className="flex items-start gap-2"><span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: GREEN }}></span>86.5% cost reduction means ₹61 Cr/year freed for other Delhi development projects</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Flag Detail Dialog */}
        <FlagDetailDialog flagId={selectedFlagId} onClose={() => setSelectedFlagId(null)} />
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-8 border-t border-gray-100 bg-white/60 backdrop-blur">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-0.5 w-8 rounded-full overflow-hidden">
              <div className="flex-1" style={{ backgroundColor: SAFFRON }} />
              <div className="flex-1 bg-gray-300" />
              <div className="flex-1" style={{ backgroundColor: GREEN }} />
            </div>
            <span className="text-xs text-gray-400">Dhvani — Resilient Tricolour Project | India Innovates Initiative</span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-gray-400">
            <span>500 Flags Monitored</span>
            <span>|</span>
            <span>8 Zones Covered</span>
            <span>|</span>
            <span>Real-time AI + IoT</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── KPI Card Component ───
function KPICard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 shadow-md border-0"
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15`, color }}>
          {icon}
        </div>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
    </motion.div>
  );
}
