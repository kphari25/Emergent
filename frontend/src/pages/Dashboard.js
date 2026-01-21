import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Package, Calendar, IndianRupee, TrendingUp, TrendingDown, AlertTriangle, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
  const { getAuthHeaders } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentAppointments, setRecentAppointments] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, appointmentsRes] = await Promise.all([
        axios.get(`${API_URL}/reports/dashboard`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/appointments`, { headers: getAuthHeaders() })
      ]);
      setStats(statsRes.data);
      setRecentAppointments(appointmentsRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const inventoryChartData = stats ? [
    { name: 'Fast Moving', value: stats.inventory_movement.fast, color: '#588157' },
    { name: 'Slow Moving', value: stats.inventory_movement.slow, color: '#D4A373' },
    { name: 'Dead Stock', value: stats.inventory_movement.dead, color: '#BC4749' }
  ] : [];

  const patientChartData = stats ? [
    { name: 'In-Patients', count: stats.patients.ip },
    { name: 'Out-Patients', count: stats.patients.op }
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome to Tatva Ayurved Hospital Management</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="metric-card card-hover animate-fade-in stagger-1" data-testid="metric-patients">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Total Patients</p>
                <p className="metric-value">{stats?.patients.total || 0}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-[#588157]">IP: {stats?.patients.ip || 0}</span>
                  <span className="text-[#D4A373]">OP: {stats?.patients.op || 0}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#3A5A40]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover animate-fade-in stagger-2" data-testid="metric-appointments">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Today's Appointments</p>
                <p className="metric-value">{stats?.appointments.today || 0}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-[#588157]">
                  <Calendar className="w-4 h-4" />
                  <span>Scheduled</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-[#588157]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover animate-fade-in stagger-3" data-testid="metric-revenue">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Total Revenue</p>
                <p className="metric-value">₹{(stats?.revenue.total || 0).toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2 text-sm text-[#D4A373]">
                  <span>Pending: ₹{(stats?.revenue.pending || 0).toLocaleString()}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-[#D4A373]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover animate-fade-in stagger-4" data-testid="metric-inventory">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Inventory Items</p>
                <p className="metric-value">{stats?.inventory.total || 0}</p>
                {stats?.inventory.low_stock > 0 && (
                  <div className="flex items-center gap-1 mt-2 text-sm text-[#BC4749]">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{stats.inventory.low_stock} low stock</span>
                  </div>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#BC4749]/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-[#BC4749]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Inventory Movement Chart */}
        <Card className="chart-container animate-fade-in stagger-3" data-testid="inventory-chart">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#1A1C18]" style={{ fontFamily: 'Playfair Display' }}>
              Inventory Movement Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryChartData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={inventoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {inventoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-[#6B7280]">
                <Package className="w-12 h-12 mb-2 opacity-50" />
                <p>No inventory data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Patient Distribution */}
        <Card className="chart-container animate-fade-in stagger-4" data-testid="patient-chart">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#1A1C18]" style={{ fontFamily: 'Playfair Display' }}>
              Patient Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {patientChartData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={patientChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3A5A40" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-[#6B7280]">
                <Users className="w-12 h-12 mb-2 opacity-50" />
                <p>No patient data yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Appointments */}
      <Card className="animate-fade-in stagger-5" data-testid="recent-appointments">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-[#1A1C18]" style={{ fontFamily: 'Playfair Display' }}>
            Recent Appointments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Treatment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAppointments.map((apt) => (
                    <tr key={apt.id} className="table-row-hover">
                      <td className="font-medium">{apt.patient_name}</td>
                      <td>{apt.doctor_name}</td>
                      <td>{apt.date}</td>
                      <td>{apt.time}</td>
                      <td>{apt.treatment_type}</td>
                      <td>
                        <span className={`status-indicator ${
                          apt.status === 'scheduled' ? 'status-active' :
                          apt.status === 'completed' ? 'status-active' : 'status-pending'
                        }`}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Calendar className="empty-state-icon" />
              <p>No appointments scheduled yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
