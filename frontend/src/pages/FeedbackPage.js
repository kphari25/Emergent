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
import { Plus, Star, AlertTriangle, CheckCircle, ExternalLink, Trash2, MessageSquare } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const GOOGLE_REVIEW_URL = 'https://g.page/r/YOUR_GOOGLE_PLACE_ID/review';

const StarRating = ({ value, onChange, readOnly = false }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(i => (
      <button key={i} type="button" onClick={() => !readOnly && onChange?.(i)}
        className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}>
        <Star className={`w-5 h-5 ${i <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      </button>
    ))}
  </div>
);

export default function FeedbackPage() {
  const { getAuthHeaders } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [summary, setSummary] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [showEscalationsOnly, setShowEscalationsOnly] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [selectedFb, setSelectedFb] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const [newFeedback, setNewFeedback] = useState({ patient_id: '', patient_name: '', rating: 5, feedback_text: '', source: 'in_person' });

  useEffect(() => { fetchData(); }, [showEscalationsOnly]);

  const fetchData = async () => {
    try {
      const url = showEscalationsOnly ? `${API_URL}/feedback?escalation_only=true` : `${API_URL}/feedback`;
      const [fbRes, sumRes, pRes] = await Promise.all([
        axios.get(url, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/feedback/summary`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/patients`, { headers: getAuthHeaders() })
      ]);
      setFeedback(fbRes.data);
      setSummary(sumRes.data);
      setPatients(pRes.data);
    } catch { toast.error('Failed to load feedback'); }
    finally { setLoading(false); }
  };

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/feedback`, newFeedback, { headers: getAuthHeaders() });
      toast.success(newFeedback.rating >= 4 ? 'Great feedback recorded!' : newFeedback.rating <= 2 ? 'Feedback recorded - Escalation created' : 'Feedback recorded');
      setAddOpen(false);
      setNewFeedback({ patient_id: '', patient_name: '', rating: 5, feedback_text: '', source: 'in_person' });
      fetchData();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to add feedback'); }
  };

  const handleResolve = async () => {
    try {
      await axios.put(`${API_URL}/feedback/${selectedFb.id}/resolve?notes=${encodeURIComponent(resolveNotes)}`, {}, { headers: getAuthHeaders() });
      toast.success('Escalation resolved');
      setResolveOpen(false);
      setResolveNotes('');
      fetchData();
    } catch { toast.error('Failed to resolve'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await axios.delete(`${API_URL}/feedback/${id}`, { headers: getAuthHeaders() });
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;

  return (
    <div className="animate-fade-in" data-testid="feedback-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Feedback & Reviews</h1>
          <p className="page-subtitle">Collect feedback, manage escalations, drive Google reviews</p>
        </div>
        <div className="flex gap-2">
          <Button variant={showEscalationsOnly ? 'default' : 'outline'}
            className={`rounded-full ${showEscalationsOnly ? 'bg-red-500 hover:bg-red-600' : 'border-red-300 text-red-500 hover:bg-red-50'}`}
            onClick={() => setShowEscalationsOnly(!showEscalationsOnly)} data-testid="escalations-filter-btn">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Escalations {summary?.unresolved > 0 && `(${summary.unresolved})`}
          </Button>
          <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" onClick={() => setAddOpen(true)} data-testid="add-feedback-btn">
            <Plus className="w-5 h-5 mr-2" /> Add Feedback
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="metric-card" data-testid="total-feedback-card">
          <CardContent className="pt-6">
            <p className="metric-label">Total Feedback</p>
            <p className="metric-value">{summary?.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="metric-card" data-testid="avg-rating-card">
          <CardContent className="pt-6">
            <p className="metric-label">Average Rating</p>
            <div className="flex items-center gap-2">
              <p className="metric-value">{summary?.average_rating || 0}</p>
              <StarRating value={Math.round(summary?.average_rating || 0)} readOnly />
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card" data-testid="escalations-card">
          <CardContent className="pt-6">
            <p className="metric-label">Total Escalations</p>
            <p className="metric-value text-red-500">{summary?.escalations || 0}</p>
          </CardContent>
        </Card>
        <Card className="metric-card" data-testid="unresolved-card">
          <CardContent className="pt-6">
            <p className="metric-label">Unresolved</p>
            <p className="metric-value text-amber-500">{summary?.unresolved || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Google Review CTA */}
      <Card className="mb-6 bg-gradient-to-r from-[#3A5A40]/5 to-[#588157]/5 border-[#3A5A40]/20" data-testid="google-review-cta">
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-[#3A5A40]">Share Google Review Link with Happy Patients</p>
            <p className="text-xs text-[#6B7280]">Patients who rate 4-5 stars can be invited to leave a Google Review</p>
          </div>
          <Button variant="outline" className="rounded-full border-[#3A5A40] text-[#3A5A40]" onClick={() => { navigator.clipboard.writeText(GOOGLE_REVIEW_URL); toast.success('Google Review link copied!'); }}>
            <ExternalLink className="w-4 h-4 mr-2" /> Copy Link
          </Button>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card data-testid="feedback-list">
        <CardContent className="p-0">
          {feedback.length > 0 ? (
            <div className="divide-y divide-[#E2E8F0]">
              {feedback.map(fb => (
                <div key={fb.id} className={`p-4 ${fb.escalation && !fb.escalation_resolved ? 'bg-red-50/50' : ''}`} data-testid={`feedback-${fb.id}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-medium text-sm">{fb.patient_name || 'Anonymous'}</span>
                        <StarRating value={fb.rating} readOnly />
                        <span className="text-xs text-[#6B7280] capitalize">{fb.source.replace('_', ' ')}</span>
                        {fb.escalation && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${fb.escalation_resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {fb.escalation_resolved ? 'Resolved' : 'Escalated'}
                          </span>
                        )}
                      </div>
                      {fb.feedback_text && <p className="text-sm text-[#6B7280] mb-1">{fb.feedback_text}</p>}
                      {fb.escalation_notes && <p className="text-xs text-green-600">Resolution: {fb.escalation_notes}</p>}
                      <span className="text-[10px] text-[#6B7280]">{new Date(fb.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      {fb.escalation && !fb.escalation_resolved && (
                        <Button size="sm" variant="outline" className="rounded-full text-xs border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => { setSelectedFb(fb); setResolveOpen(true); }} data-testid={`resolve-${fb.id}`}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-500 h-7 px-2" onClick={() => handleDelete(fb.id)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-12">
              <MessageSquare className="empty-state-icon" />
              <p>No feedback recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Feedback Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Record Feedback</DialogTitle></DialogHeader>
          <form onSubmit={handleAddFeedback} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Patient (Optional)</Label>
              <Select value={newFeedback.patient_id} onValueChange={v => {
                const p = patients.find(pt => pt.id === v);
                setNewFeedback({ ...newFeedback, patient_id: v, patient_name: p?.name || '' });
              }}>
                <SelectTrigger className="rounded-xl" data-testid="feedback-patient-select"><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Anonymous</SelectItem>
                  {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.pid ? `${p.pid} - ` : ''}{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-3">
                <StarRating value={newFeedback.rating} onChange={r => setNewFeedback({ ...newFeedback, rating: r })} />
                <span className="text-sm text-[#6B7280]">
                  {newFeedback.rating <= 2 ? 'Poor - Will create escalation' : newFeedback.rating === 3 ? 'Average' : newFeedback.rating === 4 ? 'Good' : 'Excellent'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={newFeedback.source} onValueChange={v => setNewFeedback({ ...newFeedback, source: v })}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_person">In Person</SelectItem>
                  <SelectItem value="google">Google Review</SelectItem>
                  <SelectItem value="form">Feedback Form</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Feedback</Label>
              <Textarea value={newFeedback.feedback_text} onChange={e => setNewFeedback({ ...newFeedback, feedback_text: e.target.value })} className="rounded-xl" placeholder="Patient's feedback..." data-testid="feedback-text-input" />
            </div>
            {newFeedback.rating <= 2 && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-red-700">This will create an escalation tag</span>
                </div>
              </div>
            )}
            {newFeedback.rating >= 4 && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-green-600 fill-green-600" />
                  <span className="text-sm font-medium text-green-700">Consider sharing Google Review link with this patient!</span>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-feedback-btn">
              Record Feedback
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Resolve Escalation</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <p className="text-sm font-medium">{selectedFb?.patient_name}</p>
              <p className="text-xs text-[#6B7280]">Rating: {selectedFb?.rating}/5</p>
              <p className="text-xs text-[#6B7280]">{selectedFb?.feedback_text}</p>
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} className="rounded-xl" placeholder="How was this resolved?" data-testid="resolve-notes-input" />
            </div>
            <Button onClick={handleResolve} className="w-full bg-green-600 hover:bg-green-700 rounded-full" data-testid="confirm-resolve-btn">
              <CheckCircle className="w-4 h-4 mr-2" /> Mark Resolved
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
