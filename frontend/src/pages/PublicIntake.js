import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Send, Check } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PublicIntake() {
  const { sessionId } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('active');
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!sessionId || !token) { setError('Invalid link'); setLoading(false); return; }
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const loadSession = async () => {
    try {
      const res = await axios.get(`${API_URL}/ai/intake/session-public/${sessionId}?token=${token}`);
      setMessages(res.data.messages || []);
      setStatus(res.data.status);
      setReady(res.data.intake_ready);
      setPatientName(res.data.patient_name || '');
      if (res.data.status === 'submitted') setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not load your intake');
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/ai/intake/message-public`, {
        session_id: sessionId,
        message: userMsg.text,
        public_token: token,
      });
      setMessages(m => [...m, { role: 'assistant', text: res.data.reply }]);
      setReady(res.data.intake_ready);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const submit = async () => {
    try {
      await axios.post(`${API_URL}/ai/intake/submit-public`, {
        session_id: sessionId,
        public_token: token,
      });
      setSubmitted(true);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Submit failed');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center"><div className="spinner"></div></div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-lg font-semibold text-[#BC4749] mb-2">Link issue</h2>
            <p className="text-sm text-[#6B7280]">{error}. Please ask the clinic to resend your intake link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-green-100 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold">Thank you, {patientName || 'friend'}!</h2>
            <p className="text-sm text-[#6B7280]">Your intake has been submitted. Our Ayurvedic doctor will review it before your visit. You can close this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] flex flex-col">
      <header className="px-6 py-4 border-b border-[#F1F2EF] bg-white">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img
            src="https://customer-assets.emergentagent.com/job_1b7e9271-1a57-48d5-ade0-52ab639af0ef/artifacts/zx4aqsmj_Logo%20jpeg.jpg"
            alt="Tatva Ayurved"
            className="w-10 h-10 rounded-xl object-cover"
          />
          <div>
            <h1 className="text-base font-bold" style={{ fontFamily: 'Playfair Display' }}>Tatva Ayurved</h1>
            <p className="text-xs text-[#6B7280]">Personal intake assistant · {patientName}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto px-4 py-4">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 py-4" data-testid="public-intake-messages">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-[#3A5A40] text-white rounded-br-md'
                  : 'bg-white border border-[#F1F2EF] text-[#1A1C18] rounded-bl-md'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#F1F2EF] px-4 py-2.5 rounded-2xl rounded-bl-md text-sm text-[#6B7280]">…typing</div>
            </div>
          )}
        </div>

        <div className="pb-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type your answer…"
              className="rounded-xl resize-none min-h-[44px] bg-white"
              rows={1}
              disabled={sending || status !== 'active'}
              data-testid="public-intake-input"
            />
            <Button onClick={send} disabled={sending || !input.trim() || status !== 'active'} className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-4" data-testid="public-intake-send-btn">
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {ready && status === 'active' && (
            <div className="mt-3 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <span className="text-xs text-green-800">All done! Submit to send this to your doctor.</span>
              <Button onClick={submit} size="sm" className="bg-green-600 hover:bg-green-700 rounded-full text-xs" data-testid="public-submit-btn">Submit</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
