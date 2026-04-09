import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Stethoscope, CheckCircle, AlertTriangle, Users, RefreshCw, ArrowRight } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  waiting: { label: 'Waiting', color: 'bg-amber-50 border-amber-200', badgeColor: 'bg-amber-100 text-amber-700', icon: Clock },
  in_consultation: { label: 'In Consultation', color: 'bg-blue-50 border-blue-200', badgeColor: 'bg-blue-100 text-blue-700', icon: Stethoscope },
  completed: { label: 'Completed', color: 'bg-green-50 border-green-200', badgeColor: 'bg-green-100 text-green-700', icon: CheckCircle }
};

const PRIORITY_CONFIG = {
  emergency: { label: 'Emergency', color: 'bg-red-500 text-white', dotColor: 'bg-red-500' },
  elderly: { label: 'Elderly', color: 'bg-amber-500 text-white', dotColor: 'bg-amber-500' },
  normal: { label: 'Normal', color: 'bg-slate-200 text-slate-700', dotColor: 'bg-slate-400' }
};

export default function QueueDashboard() {
  const { getAuthHeaders } = useAuth();
  const [queue, setQueue] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const [queueRes, doctorsRes] = await Promise.all([
        axios.get(`${API_URL}/queue`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/doctors`, { headers: getAuthHeaders() })
      ]);
      setQueue(queueRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const updateStatus = async (patientId, newStatus) => {
    try {
      await axios.put(`${API_URL}/queue/${patientId}/status?status=${newStatus}`, {}, { headers: getAuthHeaders() });
      toast.success(`Status updated to ${STATUS_CONFIG[newStatus]?.label}`);
      fetchQueue();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const updatePriority = async (patientId, newPriority) => {
    try {
      await axios.put(`${API_URL}/queue/${patientId}/priority?priority=${newPriority}`, {}, { headers: getAuthHeaders() });
      toast.success(`Priority updated to ${PRIORITY_CONFIG[newPriority]?.label}`);
      fetchQueue();
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const getDoctorName = (doctorId) => {
    const doc = doctors.find(d => d.id === doctorId);
    return doc?.name || '-';
  };

  const waitingQueue = queue.filter(q => q.queue_status === 'waiting');
  const consultingQueue = queue.filter(q => q.queue_status === 'in_consultation');
  const completedQueue = queue.filter(q => q.queue_status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const QueueColumn = ({ title, items, statusKey, icon: Icon }) => {
    const config = STATUS_CONFIG[statusKey];
    return (
      <div className="flex-1 min-w-[320px]">
        <div className={`flex items-center gap-2 mb-4 p-3 rounded-xl ${config.color} border`}>
          <Icon className="w-5 h-5" />
          <h2 className="font-semibold text-sm">{title}</h2>
          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${config.badgeColor}`}>{items.length}</span>
        </div>
        <div className="space-y-3">
          {items.map((item) => {
            const priorityConf = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
            return (
              <Card key={item.checkin_id} className={`border-l-4 ${
                item.priority === 'emergency' ? 'border-l-red-500' :
                item.priority === 'elderly' ? 'border-l-amber-500' : 'border-l-slate-300'
              } hover:shadow-md transition-shadow`} data-testid={`queue-card-${item.patient_id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {item.pid && <span className="font-mono text-xs font-semibold text-[#3A5A40] bg-[#3A5A40]/10 px-1.5 py-0.5 rounded">{item.pid}</span>}
                        <span className="font-semibold text-sm text-[#1A1C18]">{item.patient_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${priorityConf.color}`}>{priorityConf.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          item.patient_type === 'IP' ? 'bg-[#588157]/10 text-[#588157]' : 'bg-[#D4A373]/10 text-[#D4A373]'
                        }`}>{item.patient_type}</span>
                        {item.token_number && <span className="text-[10px] text-[#6B7280]">Token #{item.token_number}</span>}
                      </div>
                    </div>
                    {item.checkin_time && (
                      <span className="text-[10px] text-[#6B7280]">
                        {new Date(item.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {item.reason && <p className="text-xs text-[#6B7280] mb-2 line-clamp-1">{item.reason}</p>}
                  {item.doctor_id && <p className="text-xs text-[#3A5A40] mb-2">Dr. {getDoctorName(item.doctor_id)}</p>}

                  <div className="flex items-center gap-2 mt-3">
                    {statusKey === 'waiting' && (
                      <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-xs h-7 px-3"
                        onClick={() => updateStatus(item.patient_id, 'in_consultation')} data-testid={`to-consultation-${item.patient_id}`}>
                        <Stethoscope className="w-3 h-3 mr-1" /> Start
                      </Button>
                    )}
                    {statusKey === 'in_consultation' && (
                      <Button size="sm" className="rounded-full bg-green-600 hover:bg-green-700 text-xs h-7 px-3"
                        onClick={() => updateStatus(item.patient_id, 'completed')} data-testid={`to-completed-${item.patient_id}`}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Complete
                      </Button>
                    )}
                    {statusKey !== 'completed' && (
                      <Select value={item.priority} onValueChange={(v) => updatePriority(item.patient_id, v)}>
                        <SelectTrigger className="rounded-full h-7 text-xs w-28" data-testid={`priority-select-${item.patient_id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="elderly">Elderly</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {statusKey === 'completed' && item.checkout_time && (
                      <span className="text-[10px] text-green-600">
                        Completed {new Date(item.checkout_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {items.length === 0 && (
            <div className="text-center py-8 text-sm text-[#6B7280]">
              No patients
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in" data-testid="queue-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Live Queue</h1>
          <p className="page-subtitle">Real-time patient queue for today</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-[#6B7280]">Emergency</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-amber-500"></div><span className="text-[#6B7280]">Elderly</span></div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-slate-400"></div><span className="text-[#6B7280]">Normal</span></div>
          </div>
          <Button variant="outline" className="rounded-full" onClick={handleRefresh} disabled={refreshing} data-testid="refresh-queue-btn">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-amber-50 border-amber-200" data-testid="waiting-count">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 uppercase font-semibold">Waiting</p>
              <p className="text-2xl font-bold text-amber-800">{waitingQueue.length}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-400" />
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200" data-testid="consulting-count">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-700 uppercase font-semibold">In Consultation</p>
              <p className="text-2xl font-bold text-blue-800">{consultingQueue.length}</p>
            </div>
            <Stethoscope className="w-8 h-8 text-blue-400" />
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200" data-testid="completed-count">
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-green-700 uppercase font-semibold">Completed</p>
              <p className="text-2xl font-bold text-green-800">{completedQueue.length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </CardContent>
        </Card>
      </div>

      {/* Flow indicator */}
      <div className="hidden md:flex items-center justify-center gap-4 mb-6 text-[#6B7280]">
        <span className="text-sm font-medium">Waiting</span>
        <ArrowRight className="w-4 h-4" />
        <span className="text-sm font-medium">In Consultation</span>
        <ArrowRight className="w-4 h-4" />
        <span className="text-sm font-medium">Completed</span>
      </div>

      {/* Queue Columns */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        <QueueColumn title="Waiting" items={waitingQueue} statusKey="waiting" icon={Clock} />
        <QueueColumn title="In Consultation" items={consultingQueue} statusKey="in_consultation" icon={Stethoscope} />
        <QueueColumn title="Completed" items={completedQueue} statusKey="completed" icon={CheckCircle} />
      </div>
    </div>
  );
}
