import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Package, IndianRupee, AlertTriangle, Leaf, Pill } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = {
  fast: '#588157',
  slow: '#D4A373',
  dead: '#BC4749',
  herbs: '#588157',
  medicines: '#3A5A40',
  equipment: '#A3B18A',
  consumables: '#D4A373'
};

export default function Reports() {
  const { getAuthHeaders } = useAuth();
  const [inventoryAnalytics, setInventoryAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [inventoryRes, revenueRes, dashboardRes] = await Promise.all([
        axios.get(`${API_URL}/reports/inventory-analytics`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/revenue`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/dashboard`, { headers: getAuthHeaders() })
      ]);
      setInventoryAnalytics(inventoryRes.data);
      setRevenueData(revenueRes.data);
      setDashboardStats(dashboardRes.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const categoryChartData = inventoryAnalytics?.category_stats 
    ? Object.entries(inventoryAnalytics.category_stats).map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        items: stats.total_items,
        value: stats.total_value,
        fast: stats.fast,
        slow: stats.slow,
        dead: stats.dead
      }))
    : [];

  const movementPieData = dashboardStats ? [
    { name: 'Fast Moving', value: dashboardStats.inventory_movement.fast, color: COLORS.fast },
    { name: 'Slow Moving', value: dashboardStats.inventory_movement.slow, color: COLORS.slow },
    { name: 'Dead Stock', value: dashboardStats.inventory_movement.dead, color: COLORS.dead }
  ] : [];

  const dailyRevenueData = revenueData?.daily_revenue
    ? Object.entries(revenueData.daily_revenue).map(([date, data]) => ({
        date: date.slice(5), // MM-DD format
        total: data.total,
        collected: data.collected
      })).slice(-14) // Last 14 days
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="reports-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <p className="page-subtitle">Inventory insights and revenue analysis</p>
      </div>

      <Tabs defaultValue="inventory" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory Analytics</TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">Revenue Reports</TabsTrigger>
        </TabsList>

        {/* Inventory Analytics Tab */}
        <TabsContent value="inventory" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="metric-card card-hover" data-testid="total-items-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total Items</p>
                    <p className="metric-value">{inventoryAnalytics?.total_items || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-[#3A5A40]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="total-value-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total Value</p>
                    <p className="metric-value">₹{(inventoryAnalytics?.total_value || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-[#588157]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="fast-moving-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Fast Moving</p>
                    <p className="metric-value text-[#588157]">{dashboardStats?.inventory_movement.fast || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#588157]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="slow-moving-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Slow/Dead Stock</p>
                    <p className="metric-value text-[#D4A373]">
                      {(dashboardStats?.inventory_movement.slow || 0) + (dashboardStats?.inventory_movement.dead || 0)}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-[#D4A373]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Movement Distribution */}
            <Card data-testid="movement-distribution-chart">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Playfair Display' }}>Movement Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {movementPieData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={movementPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {movementPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-[#6B7280]">
                    <p>No movement data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card data-testid="category-distribution-chart">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Playfair Display' }}>Items by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="fast" name="Fast Moving" fill={COLORS.fast} stackId="movement" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="slow" name="Slow Moving" fill={COLORS.slow} stackId="movement" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="dead" name="Dead Stock" fill={COLORS.dead} stackId="movement" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-[#6B7280]">
                    <p>No category data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fast Moving Items */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="fast-moving-list">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display' }}>
                  <TrendingUp className="w-5 h-5 text-[#588157]" />
                  Top Fast Moving Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryAnalytics?.fast_moving_items?.length > 0 ? (
                  <div className="space-y-3">
                    {inventoryAnalytics.fast_moving_items.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-[#588157]/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#588157] text-white text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-[#1A1C18]">{item.name}</p>
                            <p className="text-xs text-[#6B7280] capitalize">{item.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-[#588157]">{item.movement_count} moves</p>
                          <p className="text-xs text-[#6B7280]">{item.quantity} in stock</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No fast moving items yet</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="slow-moving-list">
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display' }}>
                  <AlertTriangle className="w-5 h-5 text-[#D4A373]" />
                  Slow Moving Items (Action Needed)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inventoryAnalytics?.slow_moving_items?.length > 0 ? (
                  <div className="space-y-3">
                    {inventoryAnalytics.slow_moving_items.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-[#D4A373]/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-medium ${
                            item.movement_status === 'dead' ? 'bg-[#BC4749]' : 'bg-[#D4A373]'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium text-[#1A1C18]">{item.name}</p>
                            <p className="text-xs text-[#6B7280] capitalize">{item.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            item.movement_status === 'dead' ? 'badge-dead' : 'badge-slow'
                          }`}>
                            {item.movement_status === 'dead' ? 'Dead Stock' : 'Slow'}
                          </span>
                          <p className="text-xs text-[#6B7280] mt-1">{item.quantity} in stock</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-[#6B7280]">
                    <TrendingDown className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No slow moving items</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="metric-card card-hover" data-testid="total-revenue-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total Billed</p>
                    <p className="metric-value">₹{(revenueData?.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                    <IndianRupee className="w-6 h-6 text-[#3A5A40]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="collected-revenue-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Collected</p>
                    <p className="metric-value text-[#588157]">₹{(revenueData?.collected_amount || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#588157]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="pending-revenue-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Pending</p>
                    <p className="metric-value text-[#BC4749]">
                      ₹{((revenueData?.total_amount || 0) - (revenueData?.collected_amount || 0)).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#BC4749]/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-[#BC4749]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card data-testid="revenue-trend-chart">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Revenue Trend (Last 14 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyRevenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={dailyRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [`₹${value.toLocaleString()}`, '']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="Total Billed"
                      stroke="#3A5A40" 
                      strokeWidth={2}
                      dot={{ fill: '#3A5A40', strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="collected" 
                      name="Collected"
                      stroke="#588157" 
                      strokeWidth={2}
                      dot={{ fill: '#588157', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-[#6B7280]">
                  <p>No revenue data available yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
