import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { UtensilsCrossed, Settings, Users, IndianRupee, Coffee, Search, Trash2 } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MEAL_LABELS = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snacks: 'Snacks',
  tea_coffee: 'Tea/Coffee'
};

const MEAL_ICONS = {
  breakfast: '🌅',
  lunch: '🍛',
  dinner: '🍽',
  snacks: '🍪',
  tea_coffee: '☕'
};

export default function Mess() {
  const { getAuthHeaders } = useAuth();
  const [prices, setPrices] = useState({ breakfast: 0, lunch: 0, dinner: 0, snacks: 0, tea_coffee: 0 });
  const [editPrices, setEditPrices] = useState({ breakfast: 0, lunch: 0, dinner: 0, snacks: 0, tea_coffee: 0 });
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [meals, setMeals] = useState([]);
  const [patients, setPatients] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [mealSelection, setMealSelection] = useState({
    breakfast: false, lunch: false, dinner: false, snacks: false, tea_coffee: false
  });
  const [mealNotes, setMealNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const [pricesRes, mealsRes, patientsRes, summaryRes] = await Promise.all([
        axios.get(`${API_URL}/mess/settings`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/mess/meals?date=${selectedDate}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/patients`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/mess/summary?date=${selectedDate}`, { headers: getAuthHeaders() })
      ]);
      setPrices(pricesRes.data);
      setEditPrices({
        breakfast: pricesRes.data.breakfast,
        lunch: pricesRes.data.lunch,
        dinner: pricesRes.data.dinner,
        snacks: pricesRes.data.snacks,
        tea_coffee: pricesRes.data.tea_coffee
      });
      setMeals(mealsRes.data);
      setPatients(patientsRes.data.filter(p => p.status === 'active'));
      setSummary(summaryRes.data);
    } catch (error) {
      toast.error('Failed to load mess data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePrices = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/mess/settings`, {
        breakfast: parseFloat(editPrices.breakfast),
        lunch: parseFloat(editPrices.lunch),
        dinner: parseFloat(editPrices.dinner),
        snacks: parseFloat(editPrices.snacks),
        tea_coffee: parseFloat(editPrices.tea_coffee)
      }, { headers: getAuthHeaders() });
      toast.success('Meal prices updated');
      setPriceDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update prices');
    }
  };

  const handleAssignMeal = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    try {
      await axios.post(`${API_URL}/mess/meals`, {
        patient_id: selectedPatient,
        date: selectedDate,
        ...mealSelection,
        notes: mealNotes
      }, { headers: getAuthHeaders() });
      toast.success('Meal assigned successfully');
      setAssignDialogOpen(false);
      resetAssignForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to assign meal');
    }
  };

  const handleDeleteMeal = async (mealId) => {
    if (!window.confirm('Delete this meal record?')) return;
    try {
      await axios.delete(`${API_URL}/mess/meals/${mealId}`, { headers: getAuthHeaders() });
      toast.success('Meal record deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete meal record');
    }
  };

  const resetAssignForm = () => {
    setSelectedPatient('');
    setMealSelection({ breakfast: false, lunch: false, dinner: false, snacks: false, tea_coffee: false });
    setMealNotes('');
  };

  const calculateMealTotal = () => {
    let total = 0;
    Object.keys(MEAL_LABELS).forEach(key => {
      if (mealSelection[key]) total += prices[key] || 0;
    });
    return total;
  };

  const filteredMeals = meals.filter(m =>
    m.patient_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="mess-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Mess Management</h1>
          <p className="page-subtitle">Manage meals and food charges for patients</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10"
            onClick={() => setPriceDialogOpen(true)}
            data-testid="set-prices-btn"
          >
            <Settings className="w-4 h-4 mr-2" />
            Set Prices
          </Button>
          <Button
            className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6"
            onClick={() => { resetAssignForm(); setAssignDialogOpen(true); }}
            data-testid="assign-meal-btn"
          >
            <UtensilsCrossed className="w-5 h-5 mr-2" />
            Assign Meal
          </Button>
        </div>
      </div>

      {/* Date Selector + Summary Cards */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 mb-6">
        <div className="space-y-1">
          <Label className="text-xs text-[#6B7280]">Select Date</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-xl w-48"
            data-testid="mess-date-input"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="metric-card card-hover" data-testid="mess-patients-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Patients Fed</p>
                <p className="metric-value">{summary?.total_patients || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#3A5A40]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="mess-cost-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Day Total</p>
                <p className="metric-value text-lg">₹{(summary?.total_cost || 0).toLocaleString()}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-[#588157]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="mess-breakfast-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Breakfast</p>
                <p className="metric-value">{summary?.breakdown?.breakfast || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-[#D4A373]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="mess-lunch-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Lunch</p>
                <p className="metric-value">{summary?.breakdown?.lunch || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#A3B18A]/10 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-[#A3B18A]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="today" data-testid="tab-today-meals">Today's Meals</TabsTrigger>
          <TabsTrigger value="prices" data-testid="tab-meal-prices">Meal Prices</TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <Input
                placeholder="Search by patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
                data-testid="search-meals"
              />
            </div>
          </div>

          <Card data-testid="meals-table">
            <CardContent className="p-0">
              {filteredMeals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Breakfast</th>
                        <th>Lunch</th>
                        <th>Dinner</th>
                        <th>Snacks</th>
                        <th>Tea/Coffee</th>
                        <th>Total</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMeals.map((m) => (
                        <tr key={m.id} className="table-row-hover">
                          <td className="font-medium">{m.patient_name}</td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${m.breakfast ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {m.breakfast ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${m.lunch ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {m.lunch ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${m.dinner ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {m.dinner ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${m.snacks ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {m.snacks ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${m.tea_coffee ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                              {m.tea_coffee ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="font-semibold text-[#3A5A40]">₹{(m.total_cost || 0).toLocaleString()}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteMeal(m.id)}
                              data-testid={`delete-meal-${m.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-12">
                  <UtensilsCrossed className="empty-state-icon" />
                  <p>No meals assigned for this date</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prices">
          <Card data-testid="prices-card">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Current Meal Prices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.keys(MEAL_LABELS).map(key => (
                  <div key={key} className="p-4 rounded-xl border border-[#E2E8F0] bg-white text-center" data-testid={`price-${key}`}>
                    <div className="text-2xl mb-2">{MEAL_ICONS[key]}</div>
                    <p className="text-sm text-[#6B7280] mb-1">{MEAL_LABELS[key]}</p>
                    <p className="text-xl font-bold text-[#3A5A40]">₹{prices[key] || 0}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10"
                  onClick={() => setPriceDialogOpen(true)}
                  data-testid="edit-prices-btn"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Prices
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Set Prices Dialog */}
      <Dialog open={priceDialogOpen} onOpenChange={setPriceDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Set Meal Prices</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdatePrices} className="space-y-4 mt-4">
            {Object.keys(MEAL_LABELS).map(key => (
              <div key={key} className="flex items-center gap-4">
                <span className="text-xl w-8">{MEAL_ICONS[key]}</span>
                <Label className="w-24">{MEAL_LABELS[key]}</Label>
                <Input
                  type="number"
                  value={editPrices[key]}
                  onChange={(e) => setEditPrices({ ...editPrices, [key]: e.target.value })}
                  className="rounded-xl flex-1"
                  min="0"
                  data-testid={`edit-price-${key}`}
                />
              </div>
            ))}
            <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="save-prices-btn">
              Save Prices
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Meal Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Assign Meal to Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAssignMeal} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                <SelectTrigger className="rounded-xl" data-testid="select-patient-meal">
                  <SelectValue placeholder="Select a patient" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name} {p.patient_type ? `(${p.patient_type})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl"
                data-testid="meal-assign-date"
              />
            </div>

            <div className="space-y-3">
              <Label>Select Meals</Label>
              {Object.keys(MEAL_LABELS).map(key => (
                <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-[#E2E8F0] hover:bg-[#DAD7CD]/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`meal-${key}`}
                      checked={mealSelection[key]}
                      onCheckedChange={(checked) => setMealSelection({ ...mealSelection, [key]: checked })}
                      data-testid={`meal-check-${key}`}
                    />
                    <label htmlFor={`meal-${key}`} className="cursor-pointer flex items-center gap-2">
                      <span>{MEAL_ICONS[key]}</span>
                      <span className="font-medium">{MEAL_LABELS[key]}</span>
                    </label>
                  </div>
                  <span className="text-sm text-[#6B7280]">₹{prices[key] || 0}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#588157]/10 rounded-xl text-center">
              <p className="text-sm text-[#6B7280]">Total Cost</p>
              <p className="text-xl font-bold text-[#588157]">₹{calculateMealTotal().toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={mealNotes}
                onChange={(e) => setMealNotes(e.target.value)}
                placeholder="e.g., Special diet requirements"
                className="rounded-xl"
                data-testid="meal-notes-input"
              />
            </div>

            <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-meal-btn">
              Assign Meal
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
