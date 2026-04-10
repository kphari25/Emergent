import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Calendar as CalendarIcon, Clock, User, Check, X, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { openWhatsApp, appointmentReminderMsg, formatPhoneForWhatsApp } from '@/utils/whatsapp';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const treatmentTypes = [
  'Panchakarma',
  'Abhyanga (Oil Massage)',
  'Shirodhara',
  'Basti (Enema Therapy)',
  'Nasya (Nasal Treatment)',
  'Consultation',
  'Follow-up',
  'Herbal Treatment',
  'Yoga Therapy',
  'Diet Consultation'
];

export default function Appointments() {
  const { getAuthHeaders } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [newAppointment, setNewAppointment] = useState({
    patient_id: '', doctor_id: '', date: '', time: '', treatment_type: '', notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const [appointmentsRes, patientsRes, doctorsRes] = await Promise.all([
        axios.get(`${API_URL}/appointments?date=${dateStr}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/patients`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/doctors`, { headers: getAuthHeaders() })
      ]);
      setAppointments(appointmentsRes.data);
      setPatients(patientsRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAppointment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/appointments`, newAppointment, { headers: getAuthHeaders() });
      toast.success('Appointment scheduled successfully');
      setAddDialogOpen(false);
      setNewAppointment({ patient_id: '', doctor_id: '', date: '', time: '', treatment_type: '', notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to schedule appointment');
    }
  };

  const handleStatusUpdate = async (appointmentId, status) => {
    try {
      await axios.put(`${API_URL}/appointments/${appointmentId}/status?status=${status}`, {}, { headers: getAuthHeaders() });
      toast.success(`Appointment ${status}`);
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const timeSlots = [];
  for (let h = 9; h <= 18; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="appointments-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Schedule and manage patient appointments</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-appointment-btn">
              <Plus className="w-5 h-5 mr-2" />
              New Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Schedule Appointment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddAppointment} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select
                  value={newAppointment.patient_id}
                  onValueChange={(v) => setNewAppointment({ ...newAppointment, patient_id: v })}
                >
                  <SelectTrigger className="rounded-xl" data-testid="appointment-patient-select">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} - {p.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Doctor</Label>
                <Select
                  value={newAppointment.doctor_id}
                  onValueChange={(v) => setNewAppointment({ ...newAppointment, doctor_id: v })}
                >
                  <SelectTrigger className="rounded-xl" data-testid="appointment-doctor-select">
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                    required
                    className="rounded-xl"
                    data-testid="appointment-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={newAppointment.time}
                    onValueChange={(v) => setNewAppointment({ ...newAppointment, time: v })}
                  >
                    <SelectTrigger className="rounded-xl" data-testid="appointment-time-select">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Treatment Type</Label>
                <Select
                  value={newAppointment.treatment_type}
                  onValueChange={(v) => setNewAppointment({ ...newAppointment, treatment_type: v })}
                >
                  <SelectTrigger className="rounded-xl" data-testid="appointment-treatment-select">
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatmentTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                  className="rounded-xl"
                  placeholder="Any additional notes"
                />
              </div>

              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-appointment-btn">
                Schedule Appointment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1" data-testid="calendar-card">
          <CardHeader>
            <CardTitle className="text-lg" style={{ fontFamily: 'Playfair Display' }}>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-xl border-0"
            />
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className="lg:col-span-2" data-testid="appointments-list">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Playfair Display' }}>
              <CalendarIcon className="w-5 h-5 text-[#3A5A40]" />
              Appointments for {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {appointments.length > 0 ? (
              <div className="space-y-4">
                {appointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-4 bg-[#FDFCF8] border border-[#E2E8F0] rounded-xl hover:shadow-md transition-shadow"
                    data-testid={`appointment-card-${apt.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center gap-2 text-[#3A5A40]">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">{apt.time}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            apt.status === 'scheduled' ? 'bg-[#588157]/10 text-[#588157]' :
                            apt.status === 'completed' ? 'bg-[#3A5A40]/10 text-[#3A5A40]' :
                            'bg-[#BC4749]/10 text-[#BC4749]'
                          }`}>
                            {apt.status}
                          </span>
                        </div>
                        <h4 className="font-medium text-[#1A1C18] mb-1">{apt.patient_name}</h4>
                        <p className="text-sm text-[#6B7280]">
                          <span className="font-medium">Doctor:</span> {apt.doctor_name}
                        </p>
                        <p className="text-sm text-[#6B7280]">
                          <span className="font-medium">Treatment:</span> {apt.treatment_type}
                        </p>
                        {apt.notes && (
                          <p className="text-sm text-[#6B7280] mt-1">
                            <span className="font-medium">Notes:</span> {apt.notes}
                          </p>
                        )}
                      </div>
                      {apt.status === 'scheduled' && (
                        <div className="flex items-center gap-2">
                          {apt.patient_phone && formatPhoneForWhatsApp(apt.patient_phone) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-[#25D366] hover:bg-[#25D366]/10"
                              onClick={() => openWhatsApp(
                                apt.patient_phone,
                                appointmentReminderMsg(
                                  apt.patient_name,
                                  format(selectedDate, 'dd/MM/yyyy'),
                                  apt.time,
                                  apt.treatment_type,
                                  apt.doctor_name
                                )
                              )}
                              title="Send WhatsApp reminder"
                              data-testid={`wa-remind-${apt.id}`}
                            >
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#588157] hover:bg-[#588157]/10"
                            onClick={() => handleStatusUpdate(apt.id, 'completed')}
                            data-testid={`complete-btn-${apt.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-[#BC4749] hover:bg-[#BC4749]/10"
                            onClick={() => handleStatusUpdate(apt.id, 'cancelled')}
                            data-testid={`cancel-btn-${apt.id}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <CalendarIcon className="empty-state-icon" />
                <p>No appointments scheduled for this date</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
