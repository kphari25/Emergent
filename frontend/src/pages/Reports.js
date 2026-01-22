import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown, Package, IndianRupee, AlertTriangle, Users, Pill, Building2, Plus, Receipt, Wallet } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = {
  fast: '#588157',
  slow: '#D4A373',
  dead: '#BC4749',
  revenue: '#3A5A40',
  expense: '#BC4749',
  profit: '#588157',
  loss: '#BC4749'
};

const expenseCategories = ['utilities', 'maintenance', 'supplies', 'equipment', 'rent', 'other'];

export default function Reports() {
  const { getAuthHeaders } = useAuth();
  const [inventoryAnalytics, setInventoryAnalytics] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [financialReport, setFinancialReport] = useState(null);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);

  const [newExpense, setNewExpense] = useState({
    category: 'other', description: '', amount: '',
    date: new Date().toISOString().slice(0, 10), vendor: '', notes: ''
  });

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [inventoryRes, revenueRes, dashboardRes, financialRes, expensesRes] = await Promise.all([
        axios.get(`${API_URL}/reports/inventory-analytics`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/revenue`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/dashboard`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/financial`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/expenses`, { headers: getAuthHeaders() })
      ]);
      setInventoryAnalytics(inventoryRes.data);
      setRevenueData(revenueRes.data);
      setDashboardStats(dashboardRes.data);
      setFinancialReport(financialRes.data);
      setExpenses(expensesRes.data);
    } catch (error) {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/expenses`, {
        ...newExpense,
        amount: parseFloat(newExpense.amount)
      }, { headers: getAuthHeaders() });
      toast.success('Expense recorded');
      setAddExpenseOpen(false);
      setNewExpense({
        category: 'other', description: '', amount: '',
        date: new Date().toISOString().slice(0, 10), vendor: '', notes: ''
      });
      fetchReports();
    } catch (error) {
      toast.error('Failed to add expense');
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
        date: date.slice(5),
        total: data.total,
        collected: data.collected
      })).slice(-14)
    : [];

  const expenseChartData = financialReport?.expenses?.by_category
    ? Object.entries(financialReport.expenses.by_category).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }))
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
        <p className="page-subtitle">Financial insights, inventory, and revenue analysis</p>
      </div>

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="financial" data-testid="tab-financial">Financial Report</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory Analytics</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
        </TabsList>

        {/* Financial Report Tab */}
        <TabsContent value="financial" className="space-y-6">
          {/* Patient Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="metric-card card-hover" data-testid="total-ip-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total IP Patients</p>
                    <p className="metric-value">{financialReport?.patients?.total_ip_checkins || 0}</p>
                    <p className="text-sm text-[#588157] mt-1">Current: {financialReport?.patients?.current_ip || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#3A5A40]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="total-op-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total OP Patients</p>
                    <p className="metric-value">{financialReport?.patients?.total_op_checkins || 0}</p>
                    <p className="text-sm text-[#D4A373] mt-1">Current: {financialReport?.patients?.current_op || 0}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#D4A373]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="medicine-sales-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Medicine Sales</p>
                    <p className="metric-value">₹{(financialReport?.revenue?.medicine_sales || 0).toLocaleString()}</p>
                    <p className="text-sm text-[#588157] mt-1">
                      Profit: ₹{(financialReport?.revenue?.medicine_profit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                    <Pill className="w-6 h-6 text-[#588157]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover" data-testid="treatment-revenue-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Treatment Revenue</p>
                    <p className="metric-value">₹{(financialReport?.revenue?.treatment_revenue || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-[#3A5A40]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue & Expense Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="metric-card card-hover bg-[#588157]/5 border-[#588157]/20" data-testid="total-revenue-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total Revenue</p>
                    <p className="metric-value text-[#588157]">₹{(financialReport?.revenue?.collected || 0).toLocaleString()}</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Pending: ₹{(financialReport?.revenue?.pending || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#588157]/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-[#588157]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="metric-card card-hover bg-[#BC4749]/5 border-[#BC4749]/20" data-testid="total-expense-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">Total Expenses</p>
                    <p className="metric-value text-[#BC4749]">₹{(financialReport?.expenses?.total || 0).toLocaleString()}</p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Salaries: ₹{(financialReport?.expenses?.salaries || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#BC4749]/20 flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-[#BC4749]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`metric-card card-hover ${financialReport?.profit_loss?.is_profit ? 'bg-[#588157]/5 border-[#588157]/20' : 'bg-[#BC4749]/5 border-[#BC4749]/20'}`} data-testid="profit-loss-card">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="metric-label">{financialReport?.profit_loss?.is_profit ? 'Net Profit' : 'Net Loss'}</p>
                    <p className={`metric-value ${financialReport?.profit_loss?.is_profit ? 'text-[#588157]' : 'text-[#BC4749]'}`}>
                      ₹{Math.abs(financialReport?.profit_loss?.net_profit || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-[#6B7280] mt-1">
                      Gross: ₹{(financialReport?.profit_loss?.gross_profit || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${financialReport?.profit_loss?.is_profit ? 'bg-[#588157]/20' : 'bg-[#BC4749]/20'}`}>
                    {financialReport?.profit_loss?.is_profit 
                      ? <TrendingUp className="w-6 h-6 text-[#588157]" />
                      : <TrendingDown className="w-6 h-6 text-[#BC4749]" />
                    }
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="revenue-breakdown-chart">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Playfair Display' }}>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: 'Medicine Sales', value: financialReport?.revenue?.medicine_sales || 0 },
                    { name: 'Treatment', value: financialReport?.revenue?.treatment_revenue || 0 },
                    { name: 'Room Charges', value: financialReport?.revenue?.room_revenue || 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} />
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    <Bar dataKey="value" fill="#3A5A40" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card data-testid="expense-breakdown-chart">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Playfair Display' }}>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {expenseChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[...expenseChartData, { name: 'Salaries', value: financialReport?.expenses?.salaries || 0 }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                      >
                        {[...expenseChartData, { name: 'Salaries' }].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#BC4749', '#D4A373', '#A3B18A', '#588157', '#3A5A40', '#344E41', '#6B7280'][index % 7]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-[#6B7280]">
                    <p>No expense data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Revenue Trend */}
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
                    <Tooltip formatter={(value) => [`₹${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Total Billed" stroke="#3A5A40" strokeWidth={2} dot={{ fill: '#3A5A40' }} />
                    <Line type="monotone" dataKey="collected" name="Collected" stroke="#588157" strokeWidth={2} dot={{ fill: '#588157' }} />
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
                      <Bar dataKey="fast" name="Fast Moving" fill={COLORS.fast} stackId="movement" />
                      <Bar dataKey="slow" name="Slow Moving" fill={COLORS.slow} stackId="movement" />
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

          {/* Fast/Slow Moving Lists */}
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

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex justify-end mb-4">
            <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-expense-btn">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Record Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddExpense} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newExpense.category} onValueChange={(v) => setNewExpense({ ...newExpense, category: v })}>
                      <SelectTrigger className="rounded-xl" data-testid="expense-category-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map(c => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      required
                      className="rounded-xl"
                      data-testid="expense-description-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        required
                        className="rounded-xl"
                        data-testid="expense-amount-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                        required
                        className="rounded-xl"
                        data-testid="expense-date-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Vendor (Optional)</Label>
                    <Input
                      value={newExpense.vendor}
                      onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-expense-btn">
                    Record Expense
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card data-testid="expenses-table">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {expenses.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Vendor</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => (
                        <tr key={exp.id} className="table-row-hover">
                          <td>{exp.date}</td>
                          <td className="capitalize">{exp.category}</td>
                          <td>{exp.description}</td>
                          <td>{exp.vendor || '-'}</td>
                          <td className="font-medium text-[#BC4749]">₹{exp.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-12">
                  <Wallet className="empty-state-icon" />
                  <p>No expenses recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
