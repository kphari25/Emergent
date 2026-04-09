import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft, User, Pill, Calendar, Receipt, FileText, Plus, 
  Clock, Stethoscope, Package, IndianRupee, Trash2, History
} from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  
  const [patient, setPatient] = useState(null);
  const [report, setReport] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);

  const [newPrescription, setNewPrescription] = useState({
    diagnosis: '',
    doctor_id: '',
    items: [],
    notes: ''
  });

  const [newMedicine, setNewMedicine] = useState({
    inventory_id: '',
    name: '',
    quantity: 1,
    dosage: '',
    duration: ''
  });

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const fetchData = async () => {
    try {
      const [reportRes, inventoryRes, doctorsRes] = await Promise.all([
        axios.get(`${API_URL}/patients/${patientId}/report`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/inventory`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/doctors`, { headers: getAuthHeaders() })
      ]);
      setReport(reportRes.data);
      setPatient(reportRes.data.patient);
      setInventory(inventoryRes.data);
      setDoctors(doctorsRes.data);
    } catch (error) {
      toast.error('Failed to load patient data');
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  };

  const selectMedicine = (inventoryId) => {
    const item = inventory.find(i => i.id === inventoryId);
    if (item) {
      setNewMedicine({
        inventory_id: item.id,
        name: item.name,
        quantity: 1,
        dosage: '',
        duration: ''
      });
    }
  };

  const addMedicineToPrescription = () => {
    if (!newMedicine.inventory_id || !newMedicine.dosage || !newMedicine.duration) {
      toast.error('Please fill all medicine details');
      return;
    }
    
    const item = inventory.find(i => i.id === newMedicine.inventory_id);
    if (item && newMedicine.quantity > item.quantity) {
      toast.error(`Insufficient stock. Available: ${item.quantity}`);
      return;
    }

    setNewPrescription({
      ...newPrescription,
      items: [...newPrescription.items, { ...newMedicine }]
    });
    setNewMedicine({ inventory_id: '', name: '', quantity: 1, dosage: '', duration: '' });
  };

  const removeMedicineFromPrescription = (index) => {
    setNewPrescription({
      ...newPrescription,
      items: newPrescription.items.filter((_, i) => i !== index)
    });
  };

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    if (newPrescription.items.length === 0) {
      toast.error('Please add at least one medicine');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/prescriptions`, {
        patient_id: patientId,
        ...newPrescription
      }, { headers: getAuthHeaders() });
      toast.success('Prescription created and stock updated');
      setPrescriptionDialogOpen(false);
      setNewPrescription({ diagnosis: '', doctor_id: '', items: [], notes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create prescription');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p>Patient not found</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="patient-details-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/patients')}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {patient.pid && <span className="font-mono text-sm font-semibold text-[#3A5A40] bg-[#3A5A40]/10 px-2 py-1 rounded-md">{patient.pid}</span>}
            <h1 className="page-title">{patient.name}</h1>
          </div>
          <p className="page-subtitle">
            {patient.age} years, {patient.gender} • {patient.prakriti ? patient.prakriti.charAt(0).toUpperCase() + patient.prakriti.slice(1) : 'Prakriti not specified'}
            {patient.blood_group ? ` • ${patient.blood_group}` : ''}
          </p>
        </div>
        <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-prescription-btn">
              <Plus className="w-5 h-5 mr-2" />
              New Prescription
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Create Prescription</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePrescription} className="space-y-4 mt-4">
              <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                <p className="font-medium">{patient.name}</p>
                <p className="text-sm text-[#6B7280]">{patient.age} years, {patient.gender}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Diagnosis</Label>
                  <Input
                    value={newPrescription.diagnosis}
                    onChange={(e) => setNewPrescription({ ...newPrescription, diagnosis: e.target.value })}
                    required
                    className="rounded-xl"
                    placeholder="e.g., Vata imbalance, Joint pain"
                    data-testid="prescription-diagnosis-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prescribed By (Doctor)</Label>
                  <Select
                    value={newPrescription.doctor_id}
                    onValueChange={(v) => setNewPrescription({ ...newPrescription, doctor_id: v })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Add Medicine Section */}
              <div className="space-y-2">
                <Label>Add Medicines</Label>
                <div className="p-4 border border-[#E2E8F0] rounded-xl space-y-3">
                  <Select onValueChange={selectMedicine}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select medicine from inventory" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.filter(i => i.quantity > 0).map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} (Stock: {item.quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {newMedicine.inventory_id && (
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={newMedicine.quantity}
                          onChange={(e) => setNewMedicine({ ...newMedicine, quantity: parseInt(e.target.value) || 1 })}
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Dosage</Label>
                        <Input
                          value={newMedicine.dosage}
                          onChange={(e) => setNewMedicine({ ...newMedicine, dosage: e.target.value })}
                          className="rounded-xl"
                          placeholder="e.g., 1 tab twice daily"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Duration</Label>
                        <Input
                          value={newMedicine.duration}
                          onChange={(e) => setNewMedicine({ ...newMedicine, duration: e.target.value })}
                          className="rounded-xl"
                          placeholder="e.g., 7 days"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={addMedicineToPrescription}
                          className="w-full bg-[#588157] hover:bg-[#3A5A40] rounded-xl"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Medicines List */}
              {newPrescription.items.length > 0 && (
                <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                  <Label className="text-sm font-medium">Prescribed Medicines</Label>
                  {newPrescription.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[#F9FAFB] rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-[#6B7280]">
                          Qty: {item.quantity} • {item.dosage} • {item.duration}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-[#BC4749]"
                        onClick={() => removeMedicineFromPrescription(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={newPrescription.notes}
                  onChange={(e) => setNewPrescription({ ...newPrescription, notes: e.target.value })}
                  className="rounded-xl"
                  placeholder="Diet recommendations, lifestyle advice, etc."
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full"
                data-testid="submit-prescription-btn"
              >
                Create Prescription & Deduct Stock
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="metric-card card-hover">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Total Visits</p>
                <p className="metric-value">{report?.summary?.total_visits || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                <History className="w-6 h-6 text-[#3A5A40]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Prescriptions</p>
                <p className="metric-value">{report?.summary?.total_prescriptions || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#588157]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Medicines</p>
                <p className="metric-value">{report?.summary?.total_medicines_prescribed || 0}</p>
                <p className="text-sm text-[#6B7280] mt-1">
                  ₹{(report?.summary?.total_medicine_value || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                <Pill className="w-6 h-6 text-[#D4A373]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card card-hover">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Balance Due</p>
                <p className={`metric-value ${(report?.summary?.balance_due || 0) > 0 ? 'text-[#BC4749]' : 'text-[#588157]'}`}>
                  ₹{(report?.summary?.balance_due || 0).toLocaleString()}
                </p>
                <p className="text-sm text-[#6B7280] mt-1">
                  Paid: ₹{(report?.summary?.total_paid || 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#BC4749]/10 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-[#BC4749]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="prescriptions" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="visits">Visit History</TabsTrigger>
          <TabsTrigger value="bills">Bills</TabsTrigger>
          <TabsTrigger value="info">Patient Info</TabsTrigger>
        </TabsList>

        {/* Prescriptions Tab */}
        <TabsContent value="prescriptions">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Prescription History</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.prescriptions?.length > 0 ? (
                <div className="space-y-4">
                  {report.prescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="p-4 border border-[#E2E8F0] rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-[#1A1C18]">{prescription.diagnosis}</h4>
                          <p className="text-sm text-[#6B7280]">
                            {new Date(prescription.created_at).toLocaleDateString()} •
                            {prescription.doctor_name && ` Dr. ${prescription.doctor_name}`}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          prescription.status === 'active' ? 'bg-[#588157]/10 text-[#588157]' :
                          prescription.status === 'completed' ? 'bg-[#3A5A40]/10 text-[#3A5A40]' :
                          'bg-[#BC4749]/10 text-[#BC4749]'
                        }`}>
                          {prescription.status}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {prescription.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-[#F9FAFB] rounded-lg text-sm">
                            <div className="flex items-center gap-2">
                              <Pill className="w-4 h-4 text-[#588157]" />
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <div className="text-[#6B7280]">
                              Qty: {item.quantity} • {item.dosage} • {item.duration}
                            </div>
                          </div>
                        ))}
                      </div>

                      {prescription.notes && (
                        <p className="mt-3 text-sm text-[#6B7280] italic">
                          Note: {prescription.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B7280]">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No prescriptions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Visit History Tab */}
        <TabsContent value="visits">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Visit History</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.checkin_history?.length > 0 ? (
                <div className="space-y-3">
                  {report.checkin_history.map((visit) => (
                    <div
                      key={visit.id}
                      className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          visit.patient_type === 'IP' ? 'bg-[#588157]/10' : 'bg-[#D4A373]/10'
                        }`}>
                          <Clock className={`w-5 h-5 ${
                            visit.patient_type === 'IP' ? 'text-[#588157]' : 'text-[#D4A373]'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">
                            {visit.patient_type} Visit
                            {visit.room_number && ` • Room ${visit.room_number}`}
                          </p>
                          <p className="text-sm text-[#6B7280]">{visit.reason}</p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p>{new Date(visit.checkin_time).toLocaleDateString()}</p>
                        <p className="text-[#6B7280]">
                          {visit.checkout_time ? 'Discharged' : 'Active'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B7280]">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No visit history</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bills Tab */}
        <TabsContent value="bills">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Billing History</CardTitle>
            </CardHeader>
            <CardContent>
              {report?.bills?.length > 0 ? (
                <div className="space-y-3">
                  {report.bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 border border-[#E2E8F0] rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                          <Receipt className="w-5 h-5 text-[#3A5A40]" />
                        </div>
                        <div>
                          <p className="font-medium">₹{bill.total_amount.toLocaleString()}</p>
                          <p className="text-sm text-[#6B7280]">
                            {new Date(bill.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          bill.status === 'paid' ? 'text-[#588157]' :
                          bill.status === 'partial' ? 'text-[#D4A373]' : 'text-[#BC4749]'
                        }`}>
                          {bill.status === 'paid' ? 'Paid' :
                           bill.status === 'partial' ? `Partial (₹${bill.paid_amount})` :
                           'Pending'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-[#6B7280]">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No bills yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patient Info Tab */}
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {/* Basic Information */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">PID</Label>
                      <p className="font-mono font-semibold text-[#3A5A40]">{patient.pid || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Full Name</Label>
                      <p className="font-medium">{patient.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Phone</Label>
                      <p className="font-medium">{patient.phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Email</Label>
                      <p className="font-medium">{patient.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Demographics */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Demographics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Age / Gender</Label>
                      <p className="font-medium">{patient.age} years / {patient.gender}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Date of Birth</Label>
                      <p className="font-medium">{patient.dob || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Blood Group</Label>
                      <p className="font-medium">{patient.blood_group || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Marital Status</Label>
                      <p className="font-medium capitalize">{patient.marital_status || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Occupation</Label>
                      <p className="font-medium">{patient.occupation || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Ayurveda Profile */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Ayurveda Profile</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Prakriti (Body Constitution)</Label>
                      <p className="font-medium capitalize">{patient.prakriti || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Lifestyle</Label>
                      <p className="font-medium capitalize">{patient.lifestyle || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Referral Source</Label>
                      <p className="font-medium">{patient.referral_source || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Contact & Emergency */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Contact & Emergency</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Address</Label>
                      <p className="font-medium">{patient.address}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Emergency Contact</Label>
                      <p className="font-medium">
                        {patient.emergency_contact_name ? `${patient.emergency_contact_name} (${patient.emergency_contact_phone || 'N/A'})` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Medical & Status */}
                <div>
                  <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">Medical & Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Current Status</Label>
                      <p className="font-medium capitalize">{patient.status}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Patient Type</Label>
                      <p className="font-medium">{patient.patient_type !== 'None' ? patient.patient_type : 'Not admitted'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-[#6B7280] uppercase">Priority</Label>
                      <p className="font-medium capitalize">{patient.priority || 'Normal'}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label className="text-xs text-[#6B7280] uppercase">Medical History</Label>
                    <p className="font-medium">{patient.medical_history || 'None recorded'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
