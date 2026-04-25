import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  MessageCircle,
  Sparkles,
  BookOpen,
  ClipboardCheck,
  Send,
  Upload,
  Copy,
  Check,
  FileText,
  Brain,
  Activity,
  Link as LinkIcon,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DoshaBars = ({ scores, label }) => {
  if (!scores) return null;
  const entries = [
    ['Vata', scores.vata || 0, '#7c93a8'],
    ['Pitta', scores.pitta || 0, '#c57a4f'],
    ['Kapha', scores.kapha || 0, '#5a7a52'],
  ];
  return (
    <div className="space-y-2" data-testid={`dosha-bars-${label?.toLowerCase()}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{label}</p>
      {entries.map(([name, val, color]) => (
        <div key={name} className="flex items-center gap-3">
          <span className="w-14 text-xs font-medium">{name}</span>
          <div className="flex-1 h-2.5 rounded-full bg-[#F1F2EF] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${val}%`, backgroundColor: color }}></div>
          </div>
          <span className="w-10 text-xs font-mono text-right">{val}%</span>
        </div>
      ))}
    </div>
  );
};

// =============== INTAKE AGENT ===============
const IntakeAgent = () => {
  const { getAuthHeaders } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [shareLinkOpen, setShareLinkOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/intake/sessions`, { headers: getAuthHeaders() });
      setSessionsList(res.data);
    } catch { /* ignore */ }
  };

  const startSession = async () => {
    if (!patientName.trim()) { toast.error('Enter patient name'); return; }
    setStarting(true);
    try {
      const res = await axios.post(`${API_URL}/ai/intake/start`, {
        patient_name: patientName.trim(),
        language: 'english',
      }, { headers: getAuthHeaders() });
      setSession(res.data);
      setMessages([{ role: 'assistant', text: res.data.greeting }]);
      fetchSessions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !session) return;
    const userMsg = { role: 'user', text: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/ai/intake/message`, {
        session_id: session.session_id,
        message: userMsg.text,
      }, { headers: getAuthHeaders() });
      setMessages(m => [...m, { role: 'assistant', text: res.data.reply, intake_ready: res.data.intake_ready }]);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const submitIntake = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/ai/intake/submit`, {
        session_id: session.session_id,
      }, { headers: getAuthHeaders() });
      toast.success('Intake submitted to doctor review');
      setSession(null);
      setMessages([]);
      setPatientName('');
      fetchSessions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const copyPublicLink = () => {
    const url = `${window.location.origin}/intake/${session.session_id}?token=${session.public_token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isReady = messages.length > 0 && messages[messages.length - 1].intake_ready;

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {/* Chat */}
      <Card className="md:col-span-2 flex flex-col" style={{ minHeight: '70vh' }} data-testid="intake-chat-card">
        <CardHeader className="pb-3 border-b border-[#F1F2EF]">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#3A5A40]" />
              {session ? `Intake — ${patientName}` : 'New Intake Session'}
            </CardTitle>
            {session && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={() => setShareLinkOpen(true)} data-testid="share-intake-btn">
                  <LinkIcon className="w-3 h-3 mr-1" /> Share with patient
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          {!session ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
              <Brain className="w-12 h-12 text-[#3A5A40]/50" />
              <p className="text-sm text-[#6B7280] text-center max-w-xs">Start a guided intake. The assistant will ask one question at a time and build a clinical summary for the doctor.</p>
              <div className="w-full max-w-sm space-y-3">
                <div>
                  <Label>Patient Name</Label>
                  <Input value={patientName} onChange={e => setPatientName(e.target.value)} placeholder="e.g., Rahul Sharma" className="rounded-xl mt-1" data-testid="intake-patient-name" />
                </div>
                <Button onClick={startSession} disabled={starting} className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="start-intake-btn">
                  {starting ? 'Starting…' : 'Start Intake'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '55vh' }}>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-[#3A5A40] text-white rounded-br-md'
                        : 'bg-[#F1F2EF] text-[#1A1C18] rounded-bl-md'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-[#F1F2EF] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-[#6B7280]">…typing</div>
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-[#F1F2EF] space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type the patient's response…"
                    className="rounded-xl resize-none min-h-[44px]"
                    rows={1}
                    disabled={sending}
                    data-testid="intake-input"
                  />
                  <Button onClick={sendMessage} disabled={sending || !input.trim()} className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-4" data-testid="intake-send-btn">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                {isReady && (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                    <span className="text-xs text-green-800">Intake looks complete — ready to submit for doctor review.</span>
                    <Button onClick={submitIntake} disabled={submitting} size="sm" className="bg-green-600 hover:bg-green-700 rounded-full text-xs" data-testid="submit-intake-btn">
                      {submitting ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Recent sessions */}
      <Card data-testid="intake-recent-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Sessions</CardTitle></CardHeader>
        <CardContent className="p-3 space-y-2 max-h-[70vh] overflow-y-auto">
          {sessionsList.length === 0 && <p className="text-sm text-[#6B7280] text-center py-4">No sessions yet</p>}
          {sessionsList.map(s => (
            <div key={s.id} className="p-3 rounded-xl border border-[#F1F2EF] hover:border-[#3A5A40]/30 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium truncate">{s.patient_name || 'Unnamed'}</p>
                <Badge className={`text-[10px] ${
                  s.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
                  s.status === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>{s.status}</Badge>
              </div>
              <p className="text-[11px] text-[#6B7280]">{s.message_count} messages · {s.mode}</p>
              <p className="text-[11px] text-[#8B95A1] truncate mt-1">{s.last_message}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Share link dialog */}
      <Dialog open={shareLinkOpen} onOpenChange={setShareLinkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Intake Link with Patient</DialogTitle>
            <DialogDescription>The patient can complete the intake from their own device using this secure link.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm text-[#6B7280]">Send this link to the patient. They can complete the intake from their own device at their own pace.</p>
            <div className="flex gap-2">
              <Input readOnly value={session ? `${window.location.origin}/intake/${session.session_id}?token=${session.public_token}` : ''} className="rounded-xl text-xs font-mono" data-testid="share-link-input" />
              <Button onClick={copyPublicLink} className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="copy-share-link">
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// =============== PRAKRITI ANALYSIS ===============
const PrakritiAgent = () => {
  const { getAuthHeaders } = useAuth();
  const [text, setText] = useState('');
  const [tongueImg, setTongueImg] = useState(null); // { base64, preview }
  const [eyeImg, setEyeImg] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/prakriti/analyses`, { headers: getAuthHeaders() });
      setHistory(res.data);
    } catch { /* ignore */ }
  };

  const handleFile = (e, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload JPEG, PNG, or WEBP');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      setter({ base64, preview: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const analyse = async () => {
    if (!text.trim() && !tongueImg && !eyeImg) {
      toast.error('Provide intake text or at least one image');
      return;
    }
    setAnalysing(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/ai/prakriti/analyze`, {
        text_input: text.trim() || null,
        tongue_image_base64: tongueImg?.base64 || null,
        eye_image_base64: eyeImg?.base64 || null,
      }, { headers: getAuthHeaders() });
      setResult(res.data);
      fetchHistory();
      toast.success('Analysis ready — sent to doctor review queue');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Analysis failed');
    } finally {
      setAnalysing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Input */}
      <Card data-testid="prakriti-input-card">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#3A5A40]" /> Prakriti / Vikriti Analyser</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Clinical notes / intake summary</Label>
            <Textarea value={text} onChange={e => setText(e.target.value)} rows={8} className="rounded-xl mt-1" placeholder="Paste intake summary or key patient observations (body frame, skin, sleep, digestion, temperament, complaints, etc.)" data-testid="prakriti-text-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tongue Photo (optional)</Label>
              <div className="mt-1">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleFile(e, setTongueImg)} className="hidden" id="tongue-upload" data-testid="tongue-upload-input" />
                <label htmlFor="tongue-upload" className="block cursor-pointer border-2 border-dashed border-[#DAD7CD] rounded-xl p-3 text-center hover:border-[#3A5A40] transition-colors">
                  {tongueImg ? (
                    <img src={tongueImg.preview} alt="tongue" className="max-h-24 mx-auto rounded" />
                  ) : (
                    <><Upload className="w-4 h-4 mx-auto text-[#6B7280]" /><span className="text-xs text-[#6B7280] mt-1 block">Upload tongue image</span></>
                  )}
                </label>
              </div>
            </div>
            <div>
              <Label className="text-xs">Eye Photo (optional)</Label>
              <div className="mt-1">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleFile(e, setEyeImg)} className="hidden" id="eye-upload" data-testid="eye-upload-input" />
                <label htmlFor="eye-upload" className="block cursor-pointer border-2 border-dashed border-[#DAD7CD] rounded-xl p-3 text-center hover:border-[#3A5A40] transition-colors">
                  {eyeImg ? (
                    <img src={eyeImg.preview} alt="eye" className="max-h-24 mx-auto rounded" />
                  ) : (
                    <><Upload className="w-4 h-4 mx-auto text-[#6B7280]" /><span className="text-xs text-[#6B7280] mt-1 block">Upload eye image</span></>
                  )}
                </label>
              </div>
            </div>
          </div>
          <Button onClick={analyse} disabled={analysing} className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="analyse-prakriti-btn">
            {analysing ? (<><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analysing…</>) : 'Analyse'}
          </Button>
          <p className="text-[11px] text-[#6B7280] italic">Result will be queued for doctor review before being added to the patient chart.</p>
        </CardContent>
      </Card>

      {/* Result / History */}
      <Card data-testid="prakriti-result-card">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-[#3A5A40]" /> {result ? 'Latest Analysis' : 'Recent Analyses'}</CardTitle></CardHeader>
        <CardContent>
          {result?.result ? (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#F1F2EF]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wide text-[#6B7280]">Dominant</span>
                  <Badge className="bg-amber-100 text-amber-700 text-[10px]">Confidence: {result.result.confidence}</Badge>
                </div>
                <p className="text-sm"><strong>Prakriti:</strong> {result.result.dominant_prakriti}</p>
                <p className="text-sm"><strong>Vikriti:</strong> {result.result.dominant_vikriti}</p>
              </div>
              <DoshaBars scores={result.result.prakriti_scores} label="Prakriti (Innate)" />
              <DoshaBars scores={result.result.vikriti_scores} label="Vikriti (Current Imbalance)" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280] mb-1">Reasoning</p>
                <p className="text-sm text-[#1A1C18]">{result.result.reasoning}</p>
              </div>
              {result.result.suggested_lines_of_treatment?.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280] mb-1">Suggested Lines of Treatment</p>
                  <ul className="text-sm space-y-1 list-disc pl-5">
                    {result.result.suggested_lines_of_treatment.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-medium text-amber-800 mb-1">Status: Pending Doctor Review</p>
                <p className="text-[11px] text-amber-700">{result.result.disclaimers?.[0]}</p>
              </div>
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-8">No analyses yet. Run your first one.</p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {history.slice(0, 10).map(h => (
                <div key={h.id} className="p-3 rounded-xl border border-[#F1F2EF]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{h.patient_name || 'Unnamed'}</p>
                    <Badge className={`text-[10px] ${
                      h.status === 'approved' ? 'bg-green-100 text-green-700' :
                      h.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>{h.status.replace('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280]">{h.result?.dominant_prakriti} · {new Date(h.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// =============== KNOWLEDGE AGENT ===============
const KnowledgeAgent = () => {
  const { getAuthHeaders } = useAuth();
  const [question, setQuestion] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState([]);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/knowledge/history`, { headers: getAuthHeaders() });
      setHistory(res.data);
    } catch { /* ignore */ }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const res = await axios.post(`${API_URL}/ai/knowledge/ask`, {
        question: question.trim(),
        patient_context: context.trim() || null,
      }, { headers: getAuthHeaders() });
      setAnswer(res.data.answer);
      fetchHistory();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <Card className="md:col-span-2" data-testid="knowledge-ask-card">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4 text-[#3A5A40]" /> Ayurvedic Knowledge Agent</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Your Question</Label>
            <Textarea value={question} onChange={e => setQuestion(e.target.value)} rows={2} className="rounded-xl mt-1" placeholder="e.g., What is the classical protocol for Basti chikitsa in Vatavyadhi?" data-testid="knowledge-question-input" />
          </div>
          <div>
            <Label>Patient Context (optional)</Label>
            <Textarea value={context} onChange={e => setContext(e.target.value)} rows={2} className="rounded-xl mt-1" placeholder="e.g., 45F, Vata-predominant, chronic knee pain 2 yrs" />
          </div>
          <Button onClick={ask} disabled={loading || !question.trim()} className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="knowledge-ask-btn">
            {loading ? 'Consulting classics…' : 'Ask'}
          </Button>
          {answer && (
            <div className="mt-4 p-4 rounded-xl bg-[#F1F2EF] text-sm whitespace-pre-wrap" data-testid="knowledge-answer">
              {answer}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="knowledge-history-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Recent Queries</CardTitle></CardHeader>
        <CardContent className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
          {history.length === 0 && <p className="text-sm text-[#6B7280] text-center py-4">No queries yet</p>}
          {history.map(h => (
            <div key={h.id} className="p-3 rounded-xl border border-[#F1F2EF] cursor-pointer hover:border-[#3A5A40]/30" onClick={() => { setQuestion(h.question); setAnswer(h.answer); }}>
              <p className="text-sm font-medium truncate">{h.question}</p>
              <p className="text-[11px] text-[#6B7280] mt-1">{new Date(h.created_at).toLocaleString()}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// =============== REVIEW QUEUE ===============
const ReviewQueue = () => {
  const { getAuthHeaders, user } = useAuth();
  const [queue, setQueue] = useState({ pending_prakriti: [], submitted_intakes: [] });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedIntake, setSelectedIntake] = useState(null);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [acting, setActing] = useState(false);

  const canReview = user?.role === 'admin' || user?.role === 'doctor';

  useEffect(() => { if (canReview) fetchQueue(); else setLoading(false); }, [canReview]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/ai/review-queue`, { headers: getAuthHeaders() });
      setQueue(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  const act = async (action) => {
    if (!selected) return;
    setActing(true);
    try {
      await axios.post(`${API_URL}/ai/prakriti/analysis/${selected.id}/review`, {
        action,
        reviewer_notes: reviewerNotes,
      }, { headers: getAuthHeaders() });
      toast.success(`Analysis ${action}d`);
      setSelected(null);
      setReviewerNotes('');
      fetchQueue();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setActing(false);
    }
  };

  const openIntake = async (intakeStub) => {
    setIntakeLoading(true);
    setSelectedIntake({ ...intakeStub, messages: [], loading: true });
    try {
      const res = await axios.get(`${API_URL}/ai/intake/session/${intakeStub.id}`, { headers: getAuthHeaders() });
      setSelectedIntake({ ...res.data, loading: false });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load intake');
      setSelectedIntake(null);
    } finally {
      setIntakeLoading(false);
    }
  };

  const markReviewed = async () => {
    if (!selectedIntake) return;
    setActing(true);
    try {
      await axios.post(`${API_URL}/ai/intake/session/${selectedIntake.id}/mark-reviewed`, {}, { headers: getAuthHeaders() });
      toast.success('Intake marked as reviewed');
      setSelectedIntake(null);
      fetchQueue();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed');
    } finally {
      setActing(false);
    }
  };

  const runPrakritiFromIntake = async () => {
    if (!selectedIntake) return;
    setActing(true);
    try {
      await axios.post(`${API_URL}/ai/prakriti/analyze`, {
        intake_session_id: selectedIntake.id,
      }, { headers: getAuthHeaders() });
      toast.success('Prakriti analysis queued for your review');
      setSelectedIntake(null);
      fetchQueue();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to analyse');
    } finally {
      setActing(false);
    }
  };

  if (!canReview) {
    return <div className="empty-state py-12"><ClipboardCheck className="empty-state-icon" /><p>Only doctors and admins can access the review queue.</p></div>;
  }
  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;

  return (
    <div className="space-y-6">
      <Card data-testid="pending-prakriti-card">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#3A5A40]" /> Pending Prakriti Reviews ({queue.pending_prakriti.length})</CardTitle></CardHeader>
        <CardContent>
          {queue.pending_prakriti.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-6">Nothing pending</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {queue.pending_prakriti.map(p => (
                <div key={p.id} className="p-4 rounded-xl border border-[#F1F2EF] hover:border-[#3A5A40]/30 cursor-pointer transition-colors" onClick={() => setSelected(p)} data-testid={`pending-card-${p.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{p.patient_name || 'Unnamed'}</p>
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">pending</Badge>
                  </div>
                  <p className="text-xs text-[#6B7280] mb-1">{p.result?.dominant_prakriti} · {p.result?.dominant_vikriti}</p>
                  <p className="text-[11px] text-[#8B95A1]">by {p.created_by_name} · {new Date(p.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="submitted-intakes-card">
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-[#3A5A40]" /> Submitted Intakes ({queue.submitted_intakes.length})</CardTitle></CardHeader>
        <CardContent>
          {queue.submitted_intakes.length === 0 ? (
            <p className="text-sm text-[#6B7280] text-center py-6">No submitted intakes</p>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {queue.submitted_intakes.map(s => (
                <div key={s.id} className="p-4 rounded-xl border border-[#F1F2EF] hover:border-[#3A5A40]/30 cursor-pointer transition-colors" onClick={() => openIntake(s)} data-testid={`intake-card-${s.id}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{s.patient_name || 'Unnamed'}</p>
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">submitted</Badge>
                  </div>
                  {s.summary?.chief_complaint && <p className="text-xs text-[#6B7280] line-clamp-2">Chief complaint: {typeof s.summary.chief_complaint === 'string' ? s.summary.chief_complaint : JSON.stringify(s.summary.chief_complaint)}</p>}
                  <p className="text-[11px] text-[#8B95A1] mt-1">{s.submitted_at ? new Date(s.submitted_at).toLocaleString() : ''}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReviewerNotes(''); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Prakriti Analysis — {selected?.patient_name}</DialogTitle>
            <DialogDescription>Review the AI-generated assessment. Approving will save it to the patient's chart; rejecting discards it.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 p-3 rounded-xl bg-[#F1F2EF]">
                <div><p className="text-[10px] uppercase text-[#6B7280]">Prakriti</p><p className="text-sm font-medium">{selected.result.dominant_prakriti}</p></div>
                <div><p className="text-[10px] uppercase text-[#6B7280]">Vikriti</p><p className="text-sm font-medium">{selected.result.dominant_vikriti}</p></div>
              </div>
              <DoshaBars scores={selected.result.prakriti_scores} label="Prakriti" />
              <DoshaBars scores={selected.result.vikriti_scores} label="Vikriti" />
              <div>
                <p className="text-xs font-medium uppercase text-[#6B7280] mb-1">Reasoning</p>
                <p className="text-sm">{selected.result.reasoning}</p>
              </div>
              {selected.result.suggested_lines_of_treatment?.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase text-[#6B7280] mb-1">Suggested Treatment Lines</p>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    {selected.result.suggested_lines_of_treatment.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <Label>Reviewer Notes (optional)</Label>
                <Textarea value={reviewerNotes} onChange={e => setReviewerNotes(e.target.value)} rows={3} className="rounded-xl mt-1" placeholder="Your clinical comments…" data-testid="reviewer-notes-input" />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => act('reject')} disabled={acting} className="rounded-full border-red-200 text-red-600 hover:bg-red-50" data-testid="reject-btn">
                  <ThumbsDown className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button onClick={() => act('approve')} disabled={acting} className="bg-green-600 hover:bg-green-700 rounded-full" data-testid="approve-btn">
                  <ThumbsUp className="w-4 h-4 mr-1" /> Approve & Save to Chart
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Intake Review Dialog */}
      <Dialog open={!!selectedIntake} onOpenChange={(o) => { if (!o) setSelectedIntake(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Intake Review — {selectedIntake?.patient_name || 'Unnamed'}</DialogTitle>
            <DialogDescription>Review the patient's intake conversation, trigger a Prakriti analysis, and mark it reviewed.</DialogDescription>
          </DialogHeader>
          {selectedIntake && (
            <div className="space-y-4 mt-2" data-testid="intake-review-dialog">
              {intakeLoading ? (
                <div className="flex items-center justify-center py-8"><div className="spinner" /></div>
              ) : (
                <>
                  {/* Metadata */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[#F1F2EF] text-xs">
                    <div>
                      <p className="text-[10px] uppercase text-[#6B7280]">Mode</p>
                      <p className="font-medium capitalize">{selectedIntake.mode?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[#6B7280]">Submitted</p>
                      <p className="font-medium">{selectedIntake.submitted_at ? new Date(selectedIntake.submitted_at).toLocaleString() : '—'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-[#6B7280]">Messages</p>
                      <p className="font-medium">{selectedIntake.messages?.length || 0}</p>
                    </div>
                  </div>

                  {/* Structured summary */}
                  {selectedIntake.summary && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#3A5A40] mb-2">AI-generated Summary</p>
                      <div className="border border-[#F1F2EF] rounded-xl divide-y divide-[#F1F2EF]">
                        {Object.entries(selectedIntake.summary).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-3 px-3 py-2 text-sm">
                            <span className="text-[#6B7280] capitalize text-xs">{k.replace(/_/g, ' ')}</span>
                            <span className="col-span-2 text-[#1A1C18]">{typeof v === 'string' ? v : Array.isArray(v) ? v.join(', ') : JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Full transcript */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#3A5A40] mb-2">Full Conversation</p>
                    <div className="border border-[#F1F2EF] rounded-xl p-3 space-y-2 max-h-[40vh] overflow-y-auto bg-white">
                      {(selectedIntake.messages || []).map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs whitespace-pre-wrap ${
                            m.role === 'user'
                              ? 'bg-[#3A5A40] text-white rounded-br-md'
                              : 'bg-[#F1F2EF] text-[#1A1C18] rounded-bl-md'
                          }`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 justify-end pt-2 border-t border-[#F1F2EF]">
                    <Button variant="outline" onClick={runPrakritiFromIntake} disabled={acting} className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10" data-testid="run-prakriti-from-intake-btn">
                      <Sparkles className="w-4 h-4 mr-1" /> Run Prakriti Analysis
                    </Button>
                    <Button onClick={markReviewed} disabled={acting} className="bg-green-600 hover:bg-green-700 rounded-full" data-testid="mark-reviewed-btn">
                      <Check className="w-4 h-4 mr-1" /> Mark Reviewed
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// =============== MAIN PAGE ===============
export default function AIAssist() {
  const { user } = useAuth();
  const canReview = user?.role === 'admin' || user?.role === 'doctor';

  return (
    <div className="animate-fade-in" data-testid="ai-assist-page">
      <div className="mb-8">
        <h1 className="page-title">AI Assist</h1>
        <p className="page-subtitle">Intelligent intake, Prakriti analysis, Samhita knowledge and doctor review — all in one place.</p>
      </div>

      <Tabs defaultValue="intake" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="intake" data-testid="tab-intake"><MessageCircle className="w-3 h-3 mr-1" /> Intake</TabsTrigger>
          <TabsTrigger value="prakriti" data-testid="tab-prakriti"><Sparkles className="w-3 h-3 mr-1" /> Prakriti</TabsTrigger>
          <TabsTrigger value="knowledge" data-testid="tab-knowledge"><BookOpen className="w-3 h-3 mr-1" /> Knowledge</TabsTrigger>
          {canReview && <TabsTrigger value="review" data-testid="tab-review"><ClipboardCheck className="w-3 h-3 mr-1" /> Review Queue</TabsTrigger>}
        </TabsList>
        <TabsContent value="intake"><IntakeAgent /></TabsContent>
        <TabsContent value="prakriti"><PrakritiAgent /></TabsContent>
        <TabsContent value="knowledge"><KnowledgeAgent /></TabsContent>
        {canReview && <TabsContent value="review"><ReviewQueue /></TabsContent>}
      </Tabs>
    </div>
  );
}
