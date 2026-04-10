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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Stethoscope, Clock, CheckCircle, XCircle, Calendar, User, Trash2, Play, AlertTriangle, MessageCircle } from 'lucide-react';
import { openWhatsApp, therapyReminderMsg, formatPhoneForWhatsApp } from '@/utils/whatsapp';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const THERAPY_CATEGORIES = [
  { value: 'panchakarma', label: 'Panchakarma' },
  { value: 'massage', label: 'Massage Therapy' },
  { value: 'yoga', label: 'Yoga & Meditation' },
  { value: 'general', label: 'General Treatment' },
  { value: 'detox', label: 'Detox Therapy' },
];

export default function TherapyScheduling() {
  const { getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('schedules');
  const [therapyTypes, setTherapyTypes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [patients, setPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterStatus, setFilterStatus] = useState('all');

  const [newType, setNewType] = useState({
    name: '', category: 'general', duration_minutes: 60, base_cost: '',
    requires_room: true, gender_specific: '', description: ''
  });

  const [newSchedule, setNewSchedule] = useState({
    patient_id: '', therapy_type_id: '', therapist_id: '', room_id: '',
    scheduled_date: new Date().toISOString().split('T')[0], scheduled_time: '09:00', notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterDate, filterStatus]);

  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const [typesRes, schedulesRes, patientsRes, roomsRes] = await Promise.all([
        axios.get(`${API_URL}/therapy-types`, { headers }),
        axios.get(`${API_URL}/therapy-schedules?date=${filterDate}${filterStatus !== 'all' ? `&status=${filterStatus}` : ''}`, { headers }),
        axios.get(`${API_URL}/patients`, { headers }),
        axios.get(`${API_URL}/rooms`, { headers }),
      ]);
      setTherapyTypes(typesRes.data);
      setSchedules(schedulesRes.data);
      setPatients(patientsRes.data);
      setRooms(roomsRes.data);
      // Try to load staff
      try {
        const staffRes = await axios.get(`${API_URL}/staff`, { headers });
        setStaff(staffRes.data);
      } catch { setStaff([]); }
    } catch (error) {
      toast.error('Failed to load therapy data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateType = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/therapy-types`, {
        ...newType,
        base_cost: parseFloat(newType.base_cost) || 0,
        duration_minutes: parseInt(newType.duration_minutes) || 60,
        gender_specific: newType.gender_specific || null,
      }, { headers: getAuthHeaders() });
      toast.success('Therapy type created');
      setTypeDialogOpen(false);
      setNewType({ name: '', category: 'general', duration_minutes: 60, base_cost: '', requires_room: true, gender_specific: '', description: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create therapy type');
    }
  };

  const handleScheduleTherapy = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/therapy-schedules`, newSchedule, { headers: getAuthHeaders() });
      toast.success('Therapy scheduled successfully');
      setScheduleDialogOpen(false);
      setNewSchedule({ patient_id: '', therapy_type_id: '', therapist_id: '', room_id: '', scheduled_date: filterDate, scheduled_time: '09:00', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule therapy');
    }
  };

  const updateScheduleStatus = async (scheduleId, status) => {
    try {
      await axios.put(`${API_URL}/therapy-schedules/${scheduleId}/status?status=${status}`, {}, { headers: getAuthHeaders() });
      toast.success(`Status updated to ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deleteSchedule = async (scheduleId) => {
    try {
      await axios.delete(`${API_URL}/therapy-schedules/${scheduleId}`, { headers: getAuthHeaders() });
      toast.success('Schedule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete schedule');
    }
  };

  const deleteType = async (typeId) => {
    try {
      await axios.delete(`${API_URL}/therapy-types/${typeId}`, { headers: getAuthHeaders() });
      toast.success('Therapy type deactivated');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete therapy type');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-amber-100 text-amber-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const selectedTherapyType = therapyTypes.find(t => t.id === newSchedule.therapy_type_id);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
  }

  return (
    <div className="animate-fade-in" data-testid="therapy-scheduling-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Therapy Scheduling</h1>
          <p className="page-subtitle">Schedule and manage Ayurvedic therapy sessions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full" data-testid="add-therapy-type-btn">
                <Plus className="w-4 h-4 mr-2" /> Add Therapy Type
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Therapy Type</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateType} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Therapy Name</Label>
                  <Input value={newType.name} onChange={(e) => setNewType({...newType, name: e.target.value})} required className="rounded-xl" placeholder="e.g., Abhyanga Massage" data-testid="therapy-type-name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={newType.category} onValueChange={(v) => setNewType({...newType, category: v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {THERAPY_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input type="number" value={newType.duration_minutes} onChange={(e) => setNewType({...newType, duration_minutes: e.target.value})} className="rounded-xl" data-testid="therapy-type-duration" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Base Cost (INR)</Label>
                    <Input type="number" value={newType.base_cost} onChange={(e) => setNewType({...newType, base_cost: e.target.value})} className="rounded-xl" placeholder="0" data-testid="therapy-type-cost" />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender Restriction</Label>
                    <Select value={newType.gender_specific || 'any'} onValueChange={(v) => setNewType({...newType, gender_specific: v === 'any' ? '' : v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any Gender</SelectItem>
                        <SelectItem value="male">Male Only</SelectItem>
                        <SelectItem value="female">Female Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newType.description} onChange={(e) => setNewType({...newType, description: e.target.value})} className="rounded-xl" placeholder="Brief description of the therapy" />
                </div>
                <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-therapy-type">Create Therapy Type</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="schedule-therapy-btn">
                <Calendar className="w-4 h-4 mr-2" /> Schedule Therapy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Schedule Therapy Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleScheduleTherapy} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={newSchedule.patient_id} onValueChange={(v) => setNewSchedule({...newSchedule, patient_id: v})} required>
                    <SelectTrigger className="rounded-xl" data-testid="schedule-patient"><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.phone || p.pid}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Therapy Type</Label>
                  <Select value={newSchedule.therapy_type_id} onValueChange={(v) => setNewSchedule({...newSchedule, therapy_type_id: v})} required>
                    <SelectTrigger className="rounded-xl" data-testid="schedule-therapy-type"><SelectValue placeholder="Select therapy" /></SelectTrigger>
                    <SelectContent>
                      {therapyTypes.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} ({t.duration_minutes}min) - INR {t.base_cost}
                          {t.gender_specific ? ` [${t.gender_specific} only]` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTherapyType && (
                  <div className="p-3 bg-[#3A5A40]/5 rounded-xl text-sm">
                    <p><strong>{selectedTherapyType.name}</strong> - {selectedTherapyType.category}</p>
                    <p className="text-xs text-gray-500">{selectedTherapyType.duration_minutes} min | INR {selectedTherapyType.base_cost} | {selectedTherapyType.gender_specific ? `${selectedTherapyType.gender_specific} only` : 'Any gender'}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={newSchedule.scheduled_date} onChange={(e) => setNewSchedule({...newSchedule, scheduled_date: e.target.value})} className="rounded-xl" required data-testid="schedule-date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input type="time" value={newSchedule.scheduled_time} onChange={(e) => setNewSchedule({...newSchedule, scheduled_time: e.target.value})} className="rounded-xl" required data-testid="schedule-time" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Therapist (Optional)</Label>
                    <Select value={newSchedule.therapist_id || 'none'} onValueChange={(v) => setNewSchedule({...newSchedule, therapist_id: v === 'none' ? '' : v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Assign therapist" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not Assigned</SelectItem>
                        {staff.filter(s => s.role === 'Therapist' || s.department === 'Therapy').map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Room (Optional)</Label>
                    <Select value={newSchedule.room_id || 'none'} onValueChange={(v) => setNewSchedule({...newSchedule, room_id: v === 'none' ? '' : v})}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Assign room" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Room</SelectItem>
                        {rooms.filter(r => !r.is_occupied).map(r => (
                          <SelectItem key={r.id} value={r.id}>Room {r.room_number} ({r.room_type})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={newSchedule.notes} onChange={(e) => setNewSchedule({...newSchedule, notes: e.target.value})} className="rounded-xl" placeholder="Additional notes" />
                </div>
                <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-schedule">Schedule Session</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="schedules" data-testid="tab-schedules">Today's Schedule</TabsTrigger>
          <TabsTrigger value="types" data-testid="tab-types">Therapy Types</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules">
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-44 rounded-xl" data-testid="filter-date" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Schedule Cards */}
          <div className="grid gap-4" data-testid="schedules-list">
            {schedules.length > 0 ? schedules.map((s) => (
              <Card key={s.id} className="card-hover" data-testid={`schedule-card-${s.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      <div className="w-16 h-16 rounded-xl bg-[#3A5A40]/10 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold text-[#3A5A40]">{s.scheduled_time}</span>
                        <span className="text-[10px] text-gray-500">{s.duration_minutes}min</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-[#1A1C18]">{s.therapy_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${getStatusColor(s.status)}`}>
                            {getStatusIcon(s.status)}
                            {s.status.replace('_', ' ')}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{s.therapy_category}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 mt-2">
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {s.patient_name}</span>
                          {s.therapist_name && <span>Therapist: {s.therapist_name}</span>}
                          {s.room_id && <span>Room assigned</span>}
                          <span className="font-medium text-[#3A5A40]">INR {s.cost}</span>
                        </div>
                        {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-4">
                      {s.patient_phone && formatPhoneForWhatsApp(s.patient_phone) && s.status === 'scheduled' && (
                        <Button size="sm" variant="outline" className="rounded-full text-[#25D366] border-[#25D366]/40 hover:bg-[#25D366]/10"
                          onClick={() => openWhatsApp(s.patient_phone, therapyReminderMsg(s.patient_name, s.therapy_name, s.scheduled_date, s.scheduled_time, s.duration_minutes))}
                          title="Send WhatsApp reminder" data-testid={`wa-therapy-${s.id}`}>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {s.status === 'scheduled' && (
                        <>
                          <Button size="sm" variant="outline" className="rounded-full text-amber-600 border-amber-300 hover:bg-amber-50" onClick={() => updateScheduleStatus(s.id, 'in_progress')} data-testid={`start-${s.id}`}>
                            <Play className="w-3.5 h-3.5 mr-1" /> Start
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full text-red-600 border-red-300 hover:bg-red-50" onClick={() => updateScheduleStatus(s.id, 'cancelled')} data-testid={`cancel-${s.id}`}>
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      {s.status === 'in_progress' && (
                        <Button size="sm" className="rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={() => updateScheduleStatus(s.id, 'completed')} data-testid={`complete-${s.id}`}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Complete
                        </Button>
                      )}
                      {(s.status === 'cancelled' || s.status === 'completed') && (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => deleteSchedule(s.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="empty-state py-12">
                <Stethoscope className="empty-state-icon" />
                <p>No therapy sessions scheduled for this date</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="types">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="therapy-types-list">
            {therapyTypes.length > 0 ? therapyTypes.map((t) => (
              <Card key={t.id} className="card-hover" data-testid={`type-card-${t.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#1A1C18]">{t.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#3A5A40]/10 text-[#3A5A40]">{t.category}</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteType(t.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between"><span>Duration:</span><span className="font-medium">{t.duration_minutes} min</span></div>
                    <div className="flex justify-between"><span>Base Cost:</span><span className="font-medium text-[#3A5A40]">INR {t.base_cost}</span></div>
                    {t.gender_specific && (
                      <div className="flex items-center gap-1 text-amber-600 mt-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span className="text-xs capitalize">{t.gender_specific} patients only</span>
                      </div>
                    )}
                  </div>
                  {t.description && <p className="text-xs text-gray-400 mt-2 border-t pt-2">{t.description}</p>}
                </CardContent>
              </Card>
            )) : (
              <div className="col-span-full empty-state py-12">
                <Stethoscope className="empty-state-icon" />
                <p>No therapy types configured. Add one to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
