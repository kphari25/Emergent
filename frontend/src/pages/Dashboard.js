import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Bed, Calendar, IndianRupee, TrendingUp, Clock, Stethoscope, CheckCircle, UserPlus, Star, AlertTriangle, Package, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#3A5A40', '#588157', '#A3B18A', '#D4A373', '#BC4749'];

export default function Dashboard() {
  const { getAuthHeaders, user } = useAuth();
  const navigate = useNavigate();
  const [exec, setExec] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [execRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/reports/executive-dashboard`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/dashboard`, { headers: getAuthHeaders() })
      ]);
      setExec(execRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const patientChartData = exec ? [
    { name: 'In-Patients', count: exec.active.ip_patients },
    { name: 'Out-Patients', count: exec.active.op_patients }
  ] : [];

  const queueChartData = exec ? [
    { name: 'Waiting', value: exec.active.queue_waiting, color: '#D4A373' },
    { name: 'In Consult', value: exec.active.queue_in_consultation, color: '#588157' }
  ] : [];

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
  }

  return (
    <div className="animate-fade-in" data-testid="dashboard-page">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name || 'Admin'} — here's your hospital at a glance</p>
        </div>
      </div>

      {/* Row 1: Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="metric-card card-hover cursor-pointer" onClick={() => navigate('/patients')} data-testid="metric-op-today">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">OP Today</p>
                <p className="text-2xl font-bold text-[#D4A373]">{exec?.today?.op_checkins || 0}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#D4A373]/10 flex items-center justify-center"><Users className="w-4 h-4 text-[#D4A373]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover cursor-pointer" onClick={() => navigate('/rooms')} data-testid="metric-ip-today">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">IP Today</p>
                <p className="text-2xl font-bold text-[#588157]">{exec?.today?.ip_checkins || 0}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#588157]/10 flex items-center justify-center"><Bed className="w-4 h-4 text-[#588157]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="metric-revenue-today">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Today Revenue</p>
                <p className="text-2xl font-bold text-[#3A5A40]">₹{(exec?.today?.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#3A5A40]/10 flex items-center justify-center"><IndianRupee className="w-4 h-4 text-[#3A5A40]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="metric-revenue-month">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Month Revenue</p>
                <p className="text-2xl font-bold text-[#3A5A40]">₹{(exec?.monthly?.revenue || 0).toLocaleString()}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#3A5A40]/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#3A5A40]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover cursor-pointer" onClick={() => navigate('/rooms')} data-testid="metric-occupancy">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Room Occupancy</p>
                <p className="text-2xl font-bold">{exec?.rooms?.occupancy_rate || 0}%</p>
                <p className="text-[10px] text-[#6B7280]">{exec?.rooms?.occupied || 0}/{exec?.rooms?.total || 0} rooms</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#BC4749]/10 flex items-center justify-center"><Bed className="w-4 h-4 text-[#BC4749]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover cursor-pointer" onClick={() => navigate('/leads')} data-testid="metric-leads">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">New Leads</p>
                <p className="text-2xl font-bold text-[#588157]">{exec?.leads?.new || 0}</p>
                <p className="text-[10px] text-[#6B7280]">{exec?.leads?.total || 0} total</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#588157]/10 flex items-center justify-center"><UserPlus className="w-4 h-4 text-[#588157]" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Queue + Appointments + Active Patients */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Live Queue Status */}
        <Card className="card-hover cursor-pointer" onClick={() => navigate('/queue')} data-testid="queue-widget">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Live Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{exec?.active?.queue_waiting || 0}</p>
                  <p className="text-[10px] text-[#6B7280]">Waiting</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{exec?.active?.queue_in_consultation || 0}</p>
                  <p className="text-[10px] text-[#6B7280]">In Consult</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments */}
        <Card className="card-hover cursor-pointer" onClick={() => navigate('/appointments')} data-testid="appointments-widget">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Appointments Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-3xl font-bold text-[#3A5A40]">{exec?.today?.appointments || 0}</p>
                <p className="text-xs text-[#6B7280]">Scheduled</p>
              </div>
              <div className="flex-1 bg-[#DAD7CD]/30 rounded-full h-3">
                <div className="bg-[#588157] h-3 rounded-full" style={{
                  width: `${exec?.today?.appointments > 0 ? (exec.today.completed_appointments / exec.today.appointments * 100) : 0}%`
                }}></div>
              </div>
              <div>
                <p className="text-lg font-bold text-[#588157]">{exec?.today?.completed_appointments || 0}</p>
                <p className="text-xs text-[#6B7280]">Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Patients */}
        <Card className="card-hover cursor-pointer" onClick={() => navigate('/patients')} data-testid="active-patients-widget">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Active Patients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-[#588157]">{exec?.active?.ip_patients || 0}</p>
                <p className="text-[10px] text-[#6B7280]">In-Patient</p>
              </div>
              <div className="w-px h-10 bg-[#E2E8F0]"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-[#D4A373]">{exec?.active?.op_patients || 0}</p>
                <p className="text-[10px] text-[#6B7280]">Out-Patient</p>
              </div>
              <div className="w-px h-10 bg-[#E2E8F0]"></div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats?.patients?.total || 0}</p>
                <p className="text-[10px] text-[#6B7280]">All Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Patient Type Chart */}
        <Card data-testid="patient-chart">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Patient Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={patientChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3A5A40" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Doctor Performance */}
        <Card data-testid="doctor-performance">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Doctor Performance (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {exec?.doctor_performance?.length > 0 ? (
              <div className="space-y-3">
                {exec.doctor_performance.map((doc, i) => (
                  <div key={doc.doctor_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#3A5A40]/10 flex items-center justify-center text-xs font-bold text-[#3A5A40]">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{doc.name}</p>
                      <div className="bg-[#DAD7CD]/30 rounded-full h-2 mt-1">
                        <div className="bg-[#588157] h-2 rounded-full" style={{
                          width: `${Math.min(100, (doc.consultations / (exec.doctor_performance[0]?.consultations || 1)) * 100)}%`
                        }}></div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-[#3A5A40]">{doc.consultations}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-[#6B7280]">
                No consultations recorded today
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Revenue & Inventory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="revenue-summary">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#3A5A40]/5 rounded-xl">
                <span className="text-sm">Total Billed (All Time)</span>
                <span className="font-bold text-[#3A5A40]">₹{(stats?.revenue?.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#588157]/5 rounded-xl">
                <span className="text-sm">Collected (All Time)</span>
                <span className="font-bold text-[#588157]">₹{(stats?.revenue?.collected || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#D4A373]/5 rounded-xl">
                <span className="text-sm">Pending</span>
                <span className="font-bold text-[#D4A373]">₹{(stats?.revenue?.pending || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#588157]/5 rounded-xl">
                <span className="text-sm">This Month Collected</span>
                <span className="font-bold text-[#588157]">₹{(exec?.monthly?.collected || 0).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="inventory-alerts">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#6B7280] uppercase">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#BC4749]/5 rounded-xl cursor-pointer" onClick={() => navigate('/inventory')}>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#BC4749]" />
                  <span className="text-sm">Low Stock Items</span>
                </div>
                <span className="font-bold text-[#BC4749]">{stats?.inventory?.low_stock || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#3A5A40]/5 rounded-xl cursor-pointer" onClick={() => navigate('/inventory')}>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#3A5A40]" />
                  <span className="text-sm">Total Inventory Items</span>
                </div>
                <span className="font-bold text-[#3A5A40]">{stats?.inventory?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#588157]/5 rounded-xl cursor-pointer" onClick={() => navigate('/rooms')}>
                <div className="flex items-center gap-2">
                  <Bed className="w-4 h-4 text-[#588157]" />
                  <span className="text-sm">Available Rooms</span>
                </div>
                <span className="font-bold text-[#588157]">{exec?.rooms?.available || 0} / {exec?.rooms?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#D4A373]/5 rounded-xl cursor-pointer" onClick={() => navigate('/appointments')}>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#D4A373]" />
                  <span className="text-sm">Today's Appointments</span>
                </div>
                <span className="font-bold text-[#D4A373]">{exec?.today?.appointments || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
