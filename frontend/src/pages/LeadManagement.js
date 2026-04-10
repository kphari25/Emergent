import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Phone, UserPlus, MessageCircle, Star, AlertTriangle, CheckCircle, Clock, Trash2, Pencil, ArrowRightCircle } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const leadSources = ['whatsapp', 'phone_call', 'website', 'walkin', 'social_media', 'google', 'referral'];
const inquiryTypes = ['general', 'panchakarma', 'consultation', 'treatment', 'package', 'other'];

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700', icon: Plus },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700', icon: Phone },
  follow_up: { label: 'Follow Up', color: 'bg-purple-100 text-purple-700', icon: Clock },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  lost: { label: 'Lost', color: 'bg-red-100 text-red-700', icon: AlertTriangle }
};

export default function LeadManagement() {
  const { getAuthHeaders } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const emptyLead = { name: '', phone: '', email: '', source: 'whatsapp', inquiry_type: 'general', notes: '', follow_up_date: '' };
  const [newLead, setNewLead] = useState({ ...emptyLead });
  const [editLead, setEditLead] = useState({ ...emptyLead });

  useEffect(() => { fetchLeads(); }, [filterStatus]);

  const fetchLeads = async () => {
    try {
      const url = filterStatus === 'all' ? `${API_URL}/leads` : `${API_URL}/leads?status=${filterStatus}`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      setLeads(res.data);
    } catch { toast.error('Failed to load leads'); }
    finally { setLoading(false); }
  };

  const handleAddLead = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/leads`, newLead, { headers: getAuthHeaders() });
      toast.success('Lead added');
      setAddOpen(false);
      setNewLead({ ...emptyLead });
      fetchLeads();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to add lead'); }
  };

  const handleEditLead = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/leads/${selectedLead.id}`, editLead, { headers: getAuthHeaders() });
      toast.success('Lead updated');
      setEditOpen(false);
      fetchLeads();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to update'); }
  };

  const handleStatusChange = async (leadId, status) => {
    try {
      await axios.put(`${API_URL}/leads/${leadId}/status?status=${status}`, {}, { headers: getAuthHeaders() });
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label}`);
      fetchLeads();
    } catch { toast.error('Failed to update status'); }
  };

  const handleConvert = async (leadId) => {
    if (!window.confirm('Convert this lead to a patient? A new patient profile will be created.')) return;
    try {
      const res = await axios.post(`${API_URL}/leads/${leadId}/convert`, {}, { headers: getAuthHeaders() });
      toast.success(res.data.message);
      fetchLeads();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to convert'); }
  };

  const handleDelete = async (leadId) => {
    if (!window.confirm('Delete this lead?')) return;
    try {
      await axios.delete(`${API_URL}/leads/${leadId}`, { headers: getAuthHeaders() });
      toast.success('Lead deleted');
      fetchLeads();
    } catch { toast.error('Failed to delete'); }
  };

  const openEdit = (lead) => {
    setSelectedLead(lead);
    setEditLead({ name: lead.name, phone: lead.phone, email: lead.email || '', source: lead.source, inquiry_type: lead.inquiry_type, notes: lead.notes || '', follow_up_date: lead.follow_up_date || '' });
    setEditOpen(true);
  };

  const filteredLeads = leads.filter(l => l.name?.toLowerCase().includes(searchTerm.toLowerCase()) || l.phone?.includes(searchTerm));

  const statusCounts = leads.reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {});

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;

  const LeadForm = ({ data, setData, onSubmit, label }) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} required className="rounded-xl" data-testid="lead-name-input" />
        </div>
        <div className="space-y-2">
          <Label>Phone *</Label>
          <Input value={data.phone} onChange={e => setData({ ...data, phone: e.target.value })} required className="rounded-xl" data-testid="lead-phone-input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>Source</Label>
          <Select value={data.source} onValueChange={v => setData({ ...data, source: v })}>
            <SelectTrigger className="rounded-xl" data-testid="lead-source-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {leadSources.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Inquiry Type</Label>
          <Select value={data.inquiry_type} onValueChange={v => setData({ ...data, inquiry_type: v })}>
            <SelectTrigger className="rounded-xl" data-testid="lead-inquiry-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {inquiryTypes.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Follow-up Date</Label>
          <Input type="date" value={data.follow_up_date} onChange={e => setData({ ...data, follow_up_date: e.target.value })} className="rounded-xl" data-testid="lead-followup-input" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={data.notes} onChange={e => setData({ ...data, notes: e.target.value })} className="rounded-xl" placeholder="Inquiry details, special requests..." />
      </div>
      <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-lead-btn">{label}</Button>
    </form>
  );

  return (
    <div className="animate-fade-in" data-testid="leads-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Lead Management</h1>
          <p className="page-subtitle">Track inquiries and convert leads to patients</p>
        </div>
        <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" onClick={() => { setNewLead({ ...emptyLead }); setAddOpen(true); }} data-testid="add-lead-btn">
          <Plus className="w-5 h-5 mr-2" /> New Lead
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${filterStatus === key ? 'border-[#3A5A40] bg-[#3A5A40]/5' : 'border-[#E2E8F0] hover:border-[#DAD7CD]'}`}
              data-testid={`filter-${key}`}>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                <Icon className="w-4 h-4 text-[#6B7280]" />
              </div>
              <p className="text-xl font-bold mt-1">{statusCounts[key] || 0}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
          <Input placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 rounded-xl" data-testid="search-leads" />
        </div>
      </div>

      <Card data-testid="leads-table">
        <CardContent className="p-0">
          {filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Source</th>
                    <th>Inquiry</th>
                    <th>Status</th>
                    <th>Follow-up</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map(lead => {
                    const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
                    return (
                      <tr key={lead.id} className="table-row-hover">
                        <td>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-xs text-[#6B7280]">{lead.phone}{lead.email ? ` | ${lead.email}` : ''}</p>
                          </div>
                        </td>
                        <td>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[#DAD7CD]/30 capitalize">
                            {lead.source === 'whatsapp' && <MessageCircle className="w-3 h-3" />}
                            {lead.source === 'phone_call' && <Phone className="w-3 h-3" />}
                            {lead.source.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="capitalize text-sm">{lead.inquiry_type}</td>
                        <td><span className={`px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                        <td className="text-sm">{lead.follow_up_date || '-'}</td>
                        <td className="text-sm text-[#6B7280] max-w-[150px] truncate">{lead.notes || '-'}</td>
                        <td>
                          <div className="flex items-center gap-1">
                            {lead.status !== 'converted' && lead.status !== 'lost' && (
                              <Select value={lead.status} onValueChange={v => handleStatusChange(lead.id, v)}>
                                <SelectTrigger className="rounded-full h-7 text-xs w-28" data-testid={`status-${lead.id}`}><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )}
                            {lead.status !== 'converted' && (
                              <Button size="sm" variant="ghost" className="text-[#588157] h-7 px-2" onClick={() => handleConvert(lead.id)} data-testid={`convert-${lead.id}`}>
                                <ArrowRightCircle className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEdit(lead)}><Pencil className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" onClick={() => handleDelete(lead.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state py-12">
              <UserPlus className="empty-state-icon" />
              <p>No leads found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Add New Lead</DialogTitle></DialogHeader>
          <LeadForm data={newLead} setData={setNewLead} onSubmit={handleAddLead} label="Add Lead" />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Edit Lead</DialogTitle></DialogHeader>
          <LeadForm data={editLead} setData={setEditLead} onSubmit={handleEditLead} label="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
