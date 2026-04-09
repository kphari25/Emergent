import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Plus, LogIn, LogOut, Search, User, Bed, Ticket, Eye, Upload, Download, FileSpreadsheet, Phone, AlertTriangle } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const prakritiTypes = [
  { value: 'vata', label: 'Vata' },
  { value: 'pitta', label: 'Pitta' },
  { value: 'kapha', label: 'Kapha' },
  { value: 'vata-pitta', label: 'Vata-Pitta' },
  { value: 'pitta-kapha', label: 'Pitta-Kapha' },
  { value: 'vata-kapha', label: 'Vata-Kapha' },
  { value: 'tridosha', label: 'Tridosha' },
];

const referralSources = [
  'Google', 'Word of Mouth', 'Doctor Referral', 'Social Media', 'Walk-in', 'Newspaper', 'Website', 'Other'
];

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const emptyPatient = {
  name: '', age: '', gender: 'male', phone: '', address: '', medical_history: '', prakriti: '',
  dob: '', email: '', blood_group: '', occupation: '', marital_status: '', 
  emergency_contact_name: '', emergency_contact_phone: '', lifestyle: '', referral_source: ''
};

export default function Patients() {
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [patients, setPatients] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [importing, setImporting] = useState(false);
  const [phoneLookup, setPhoneLookup] = useState('');
  const [phoneLookupResults, setPhoneLookupResults] = useState([]);
  const [showLookup, setShowLookup] = useState(false);
  const fileInputRef = useRef(null);

  const [newPatient, setNewPatient] = useState({ ...emptyPatient });

  const [checkinData, setCheckinData] = useState({
    patient_type: 'OP', room_number: '', doctor_id: '', reason: '', priority: 'normal'
  });

  useEffect(() => {
    fetchData();
  }, [filterType]);

  const fetchData = async () => {
    try {
      const [patientsRes, roomsRes, doctorsRes] = await Promise.all([
        axios.get(`${API_URL}/patients?patient_type=${filterType}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/rooms/available`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/doctors`, { headers: getAuthHeaders() })
      ]);
      setPatients(patientsRes.data);
      setRooms(roomsRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLookup = async (phone) => {
    setPhoneLookup(phone);
    if (phone.length >= 4) {
      try {
        const res = await axios.get(`${API_URL}/patients/search-phone?phone=${phone}`, { headers: getAuthHeaders() });
        setPhoneLookupResults(res.data);
        setShowLookup(true);
      } catch { setPhoneLookupResults([]); }
    } else {
      setPhoneLookupResults([]);
      setShowLookup(false);
    }
  };

  const selectExistingPatient = (patient) => {
    navigate(`/patients/${patient.id}`);
    setShowLookup(false);
  };

  const handleAddPatient = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/patients`, {
        ...newPatient,
        age: parseInt(newPatient.age)
      }, { headers: getAuthHeaders() });
      toast.success('Patient registered successfully');
      setAddDialogOpen(false);
      setNewPatient({ ...emptyPatient });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add patient');
    }
  };

  const handleCheckin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/patients/checkin`, {
        patient_id: selectedPatient.id,
        ...checkinData
      }, { headers: getAuthHeaders() });
      toast.success(`Patient checked in as ${checkinData.patient_type}`);
      setCheckinDialogOpen(false);
      setCheckinData({ patient_type: 'OP', room_number: '', doctor_id: '', reason: '', priority: 'normal' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check in');
    }
  };

  const handleCheckout = async (patientId) => {
    try {
      await axios.post(`${API_URL}/patients/${patientId}/checkout`, {}, { headers: getAuthHeaders() });
      toast.success('Patient checked out successfully');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to check out');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validExtensions = ['csv', 'xlsx', 'xls'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API_URL}/patients/import`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message);
      if (res.data.errors?.length > 0) res.data.errors.forEach(err => toast.warning(err));
      setImportDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const headers = ['name', 'age', 'gender', 'phone', 'address', 'medical_history', 'prakriti'];
    const sample = ['Rajesh Kumar', '45', 'male', '9876543210', '123 Main St', 'Hypertension', 'Vata-Pitta'];
    const csvContent = [headers.join(','), sample.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'patients_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPatients = patients.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.phone?.includes(searchTerm) ||
    p.pid?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="patients-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Patients</h1>
          <p className="page-subtitle">Manage patient registrations and check-ins</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10" data-testid="import-patients-btn">
                <Upload className="w-5 h-5 mr-2" />
                Import
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Import Patients</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                  <p className="text-sm text-[#6B7280] mb-3">Upload a CSV or Excel file with patient data. Required column: <strong>name</strong></p>
                  <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={downloadTemplate}>
                    <Download className="w-4 h-4 mr-1" /> Download Template
                  </Button>
                </div>
                <div className="border-2 border-dashed border-[#DAD7CD] rounded-xl p-6 text-center">
                  <FileSpreadsheet className="w-12 h-12 mx-auto text-[#6B7280] mb-3" />
                  <p className="text-sm text-[#6B7280] mb-3">Drag and drop or click to select</p>
                  <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} className="hidden" id="patients-import" data-testid="patients-import-input" />
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => fileInputRef.current?.click()} disabled={importing}>
                    {importing ? <span className="spinner mr-2"></span> : <Upload className="w-4 h-4 mr-2" />}
                    {importing ? 'Importing...' : 'Select File'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-patient-btn">
                <Plus className="w-5 h-5 mr-2" /> New Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Register New Patient</DialogTitle>
              </DialogHeader>

              {/* Phone Lookup */}
              <div className="mt-4 p-4 bg-[#DAD7CD]/20 rounded-xl">
                <Label className="text-xs text-[#6B7280] uppercase tracking-wide mb-2 block">Quick Lookup - Returning Patient?</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                  <Input
                    placeholder="Enter mobile number to check..."
                    value={phoneLookup}
                    onChange={(e) => handlePhoneLookup(e.target.value)}
                    className="pl-10 rounded-xl"
                    data-testid="phone-lookup-input"
                  />
                </div>
                {showLookup && phoneLookupResults.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {phoneLookupResults.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-white rounded-lg border cursor-pointer hover:bg-[#3A5A40]/5" onClick={() => selectExistingPatient(p)}>
                        <div>
                          <p className="text-sm font-medium">{p.pid && <span className="text-[#3A5A40] mr-2">{p.pid}</span>}{p.name}</p>
                          <p className="text-xs text-[#6B7280]">{p.phone} | {p.age}y, {p.gender}</p>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-full text-xs">View Profile</Button>
                      </div>
                    ))}
                  </div>
                )}
                {showLookup && phoneLookupResults.length === 0 && phoneLookup.length >= 4 && (
                  <p className="text-xs text-[#6B7280] mt-2">No existing patient found. Fill the form below to register.</p>
                )}
              </div>

              <form onSubmit={handleAddPatient} className="space-y-5 mt-2">
                {/* Section: Basic Info */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input value={newPatient.name} onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })} required className="rounded-xl" data-testid="patient-name-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone *</Label>
                      <Input value={newPatient.phone} onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })} required className="rounded-xl" data-testid="patient-phone-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={newPatient.email} onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })} className="rounded-xl" data-testid="patient-email-input" />
                    </div>
                  </div>
                </div>

                {/* Section: Demographics */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Demographics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Age *</Label>
                      <Input type="number" value={newPatient.age} onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })} required className="rounded-xl" data-testid="patient-age-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender *</Label>
                      <Select value={newPatient.gender} onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}>
                        <SelectTrigger className="rounded-xl" data-testid="patient-gender-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input type="date" value={newPatient.dob} onChange={(e) => setNewPatient({ ...newPatient, dob: e.target.value })} className="rounded-xl" data-testid="patient-dob-input" />
                    </div>
                    <div className="space-y-2">
                      <Label>Blood Group</Label>
                      <Select value={newPatient.blood_group} onValueChange={(v) => setNewPatient({ ...newPatient, blood_group: v })}>
                        <SelectTrigger className="rounded-xl" data-testid="patient-blood-select"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {bloodGroups.map(bg => (<SelectItem key={bg} value={bg}>{bg}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <Label>Marital Status</Label>
                      <Select value={newPatient.marital_status} onValueChange={(v) => setNewPatient({ ...newPatient, marital_status: v })}>
                        <SelectTrigger className="rounded-xl" data-testid="patient-marital-select"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="married">Married</SelectItem>
                          <SelectItem value="divorced">Divorced</SelectItem>
                          <SelectItem value="widowed">Widowed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Occupation</Label>
                      <Input value={newPatient.occupation} onChange={(e) => setNewPatient({ ...newPatient, occupation: e.target.value })} className="rounded-xl" placeholder="e.g., Teacher, Engineer" data-testid="patient-occupation-input" />
                    </div>
                  </div>
                </div>

                {/* Section: Ayurveda-specific */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Ayurveda Profile</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prakriti (Body Constitution)</Label>
                      <Select value={newPatient.prakriti} onValueChange={(v) => setNewPatient({ ...newPatient, prakriti: v })}>
                        <SelectTrigger className="rounded-xl" data-testid="patient-prakriti-select"><SelectValue placeholder="Select Prakriti" /></SelectTrigger>
                        <SelectContent>
                          {prakritiTypes.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Lifestyle</Label>
                      <Select value={newPatient.lifestyle} onValueChange={(v) => setNewPatient({ ...newPatient, lifestyle: v })}>
                        <SelectTrigger className="rounded-xl" data-testid="patient-lifestyle-select"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentary</SelectItem>
                          <SelectItem value="moderate">Moderately Active</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="highly_active">Highly Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section: Contact & Emergency */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Contact & Emergency</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Address *</Label>
                      <Textarea value={newPatient.address} onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })} required className="rounded-xl" data-testid="patient-address-input" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Emergency Contact Name</Label>
                        <Input value={newPatient.emergency_contact_name} onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_name: e.target.value })} className="rounded-xl" data-testid="patient-emergency-name-input" />
                      </div>
                      <div className="space-y-2">
                        <Label>Emergency Contact Phone</Label>
                        <Input value={newPatient.emergency_contact_phone} onChange={(e) => setNewPatient({ ...newPatient, emergency_contact_phone: e.target.value })} className="rounded-xl" data-testid="patient-emergency-phone-input" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Medical & Referral */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">Medical & Referral</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Medical History</Label>
                      <Textarea value={newPatient.medical_history} onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })} className="rounded-xl" placeholder="Previous conditions, allergies, ongoing medications" />
                    </div>
                    <div className="space-y-2">
                      <Label>Referral Source</Label>
                      <Select value={newPatient.referral_source} onValueChange={(v) => setNewPatient({ ...newPatient, referral_source: v })}>
                        <SelectTrigger className="rounded-xl" data-testid="patient-referral-select"><SelectValue placeholder="How did the patient hear about us?" /></SelectTrigger>
                        <SelectContent>
                          {referralSources.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-patient-btn">
                  Register Patient
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
          <Input
            placeholder="Search by name, phone, or PID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
            data-testid="search-patients"
          />
        </div>
        <Tabs value={filterType} onValueChange={setFilterType} className="w-full md:w-auto">
          <TabsList className="bg-[#DAD7CD]/30">
            <TabsTrigger value="all" data-testid="filter-all">All</TabsTrigger>
            <TabsTrigger value="IP" data-testid="filter-ip">In-Patients</TabsTrigger>
            <TabsTrigger value="OP" data-testid="filter-op">Out-Patients</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Patients Table */}
      <Card data-testid="patients-table">
        <CardContent className="p-0">
          {filteredPatients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PID</th>
                    <th>Patient</th>
                    <th>Age/Gender</th>
                    <th>Phone</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Room/Token</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="table-row-hover">
                      <td>
                        <span className="font-mono text-xs font-semibold text-[#3A5A40] bg-[#3A5A40]/10 px-2 py-1 rounded-md">
                          {patient.pid || '-'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#3A5A40]/10 flex items-center justify-center relative">
                            <User className="w-5 h-5 text-[#3A5A40]" />
                            {patient.priority === 'emergency' && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {patient.priority === 'elderly' && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">E</div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[#1A1C18]">{patient.name}</p>
                            <p className="text-xs text-[#6B7280] capitalize">{patient.prakriti || patient.referral_source || 'N/A'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{patient.age} / {patient.gender}</td>
                      <td>{patient.phone}</td>
                      <td>
                        {patient.patient_type !== 'None' ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            patient.patient_type === 'IP' ? 'bg-[#588157]/10 text-[#588157]' : 'bg-[#D4A373]/10 text-[#D4A373]'
                          }`}>
                            {patient.patient_type}
                          </span>
                        ) : (
                          <span className="text-[#6B7280]">-</span>
                        )}
                      </td>
                      <td>
                        <span className={`status-indicator ${patient.status === 'active' ? 'status-active' : 'status-pending'}`}>
                          {patient.status}
                        </span>
                      </td>
                      <td>
                        {patient.patient_type === 'IP' && patient.room_number && (
                          <div className="flex items-center gap-1 text-sm"><Bed className="w-4 h-4 text-[#588157]" /><span>Room {patient.room_number}</span></div>
                        )}
                        {patient.patient_type === 'OP' && patient.token_number && (
                          <div className="flex items-center gap-1 text-sm"><Ticket className="w-4 h-4 text-[#D4A373]" /><span>Token #{patient.token_number}</span></div>
                        )}
                        {patient.patient_type === 'None' && <span className="text-[#6B7280]">-</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate(`/patients/${patient.id}`)} data-testid={`view-btn-${patient.id}`}>
                            <Eye className="w-4 h-4 mr-1" /> View
                          </Button>
                          {patient.patient_type === 'None' || patient.status === 'discharged' ? (
                            <Button size="sm" variant="outline" className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10"
                              onClick={() => { setSelectedPatient(patient); setCheckinDialogOpen(true); }}
                              data-testid={`checkin-btn-${patient.id}`}>
                              <LogIn className="w-4 h-4 mr-1" /> Check In
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="rounded-full border-[#BC4749] text-[#BC4749] hover:bg-[#BC4749]/10"
                              onClick={() => handleCheckout(patient.id)}
                              data-testid={`checkout-btn-${patient.id}`}>
                              <LogOut className="w-4 h-4 mr-1" /> Check Out
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state py-12">
              <User className="empty-state-icon" />
              <p>No patients found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check-in Dialog */}
      <Dialog open={checkinDialogOpen} onOpenChange={setCheckinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Patient Check-In</DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <form onSubmit={handleCheckin} className="space-y-4 mt-4">
              <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                <p className="font-medium">{selectedPatient.pid && <span className="text-[#3A5A40] mr-2">{selectedPatient.pid}</span>}{selectedPatient.name}</p>
                <p className="text-sm text-[#6B7280]">{selectedPatient.age} years, {selectedPatient.gender}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Patient Type</Label>
                  <Select value={checkinData.patient_type} onValueChange={(v) => setCheckinData({ ...checkinData, patient_type: v })}>
                    <SelectTrigger className="rounded-xl" data-testid="checkin-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IP">In-Patient (IP)</SelectItem>
                      <SelectItem value="OP">Out-Patient (OP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={checkinData.priority} onValueChange={(v) => setCheckinData({ ...checkinData, priority: v })}>
                    <SelectTrigger className="rounded-xl" data-testid="checkin-priority-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="elderly">Elderly</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {checkinData.patient_type === 'IP' && (
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={checkinData.room_number} onValueChange={(v) => setCheckinData({ ...checkinData, room_number: v })}>
                    <SelectTrigger className="rounded-xl" data-testid="checkin-room-select"><SelectValue placeholder="Select room" /></SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.room_number}>Room {room.room_number} - {room.room_type} (₹{room.daily_rate}/day)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Doctor (Optional)</Label>
                <Select value={checkinData.doctor_id} onValueChange={(v) => setCheckinData({ ...checkinData, doctor_id: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Assign doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.map((doc) => (<SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reason for Visit</Label>
                <Textarea value={checkinData.reason} onChange={(e) => setCheckinData({ ...checkinData, reason: e.target.value })} required className="rounded-xl" placeholder="Enter reason for visit" data-testid="checkin-reason-input" />
              </div>

              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-checkin-btn">
                Complete Check-In
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
