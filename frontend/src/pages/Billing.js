import { useState, useEffect, useRef } from 'react';
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
import { Plus, Receipt, IndianRupee, Check, Clock, AlertCircle, Trash2, Printer, X, Bed, User, Wallet, FileText } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hospital Details
const HOSPITAL_INFO = {
  name: 'Tatva Ayurved Hospital',
  address: 'Thekkuveedu Lane, Kannur Rd., Near Christian College',
  city: 'Kozhikode, Kerala - 673001',
  phone: '+91 9895112264',
  email: 'info@tatvaayurved.com',
  gstin: 'GSTIN: 32XXXXX1234X1ZX',
  logo: 'https://customer-assets.emergentagent.com/job_1b7e9271-1a57-48d5-ade0-52ab639af0ef/artifacts/zx4aqsmj_Logo%20jpeg.jpg'
};

// GST Rate
const GST_RATE = 18;

export default function Billing() {
  const { getAuthHeaders } = useAuth();
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billType, setBillType] = useState('OP'); // OP or IP
  const printRef = useRef();

  // IP Bill State
  const [ipBill, setIpBill] = useState({
    patient_id: '',
    items: [], // medicines
    consultation_charges: '',
    room_charges: '',
    treatment_charges: '',
    mess_charges: '',
    other_charges: '',
    discount: '',
    notes: '',
    include_gst: true,
    admission_date: '',
    discharge_date: '',
    num_days: ''
  });

  // OP Bill State
  const [opBill, setOpBill] = useState({
    patient_id: '',
    items: [], // medicines
    consultation_charges: '',
    treatment_charges: '',
    other_charges: '',
    discount: '',
    notes: '',
    include_gst: true
  });

  const [newItem, setNewItem] = useState({ name: '', quantity: 1, sale_price: '', purchase_price: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [advanceDialogOpen, setAdvanceDialogOpen] = useState(false);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceMethod, setAdvanceMethod] = useState('cash');
  const [advancePatientId, setAdvancePatientId] = useState('');
  const [patientSummary, setPatientSummary] = useState(null);
  const [summaryPatientId, setSummaryPatientId] = useState('');

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterType]);

  const fetchData = async () => {
    try {
      const [billsRes, patientsRes, inventoryRes] = await Promise.all([
        axios.get(`${API_URL}/bills?status=${filterStatus}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/patients`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/inventory`, { headers: getAuthHeaders() })
      ]);
      let filteredBills = billsRes.data;
      if (filterType !== 'all') {
        filteredBills = filteredBills.filter(b => b.bill_type === filterType);
      }
      setBills(filteredBills);
      setPatients(patientsRes.data);
      setInventory(inventoryRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentBill = () => billType === 'IP' ? ipBill : opBill;
  const setCurrentBill = (updates) => {
    if (billType === 'IP') {
      setIpBill(prev => ({ ...prev, ...updates }));
    } else {
      setOpBill(prev => ({ ...prev, ...updates }));
    }
  };

  const addItemToBill = () => {
    if (!newItem.name || !newItem.sale_price) return;
    const currentBill = getCurrentBill();
    setCurrentBill({
      items: [...currentBill.items, {
        ...newItem,
        quantity: parseInt(newItem.quantity),
        sale_price: parseFloat(newItem.sale_price),
        purchase_price: parseFloat(newItem.purchase_price || 0)
      }]
    });
    setNewItem({ name: '', quantity: 1, sale_price: '', purchase_price: '' });
  };

  const removeItemFromBill = (index) => {
    const currentBill = getCurrentBill();
    setCurrentBill({
      items: currentBill.items.filter((_, i) => i !== index)
    });
  };

  const selectInventoryItem = (itemId) => {
    const item = inventory.find(i => i.id === itemId);
    if (item) {
      const purchasePrice = item.purchase_price || item.price || 0;
      const salePrice = item.sale_price || (purchasePrice * 1.2);
      setNewItem({
        name: item.name,
        quantity: 1,
        sale_price: salePrice.toString(),
        purchase_price: purchasePrice.toString()
      });
    }
  };

  // Calculate bill totals for IP
  const calculateIPTotals = () => {
    const bill = ipBill;
    const itemsTotal = bill.items.reduce((sum, i) => sum + (i.quantity * (i.sale_price || 0)), 0);
    const consultationCharges = parseFloat(bill.consultation_charges) || 0;
    const roomCharges = parseFloat(bill.room_charges) || 0;
    const treatmentCharges = parseFloat(bill.treatment_charges) || 0;
    const messCharges = parseFloat(bill.mess_charges) || 0;
    const otherCharges = parseFloat(bill.other_charges) || 0;
    const discount = parseFloat(bill.discount) || 0;

    const subtotal = itemsTotal + consultationCharges + roomCharges + treatmentCharges + messCharges + otherCharges;
    const discountedTotal = subtotal - discount;
    const gstAmount = bill.include_gst ? (discountedTotal * GST_RATE / 100) : 0;
    const grandTotal = discountedTotal + gstAmount;

    return { itemsTotal, consultationCharges, roomCharges, treatmentCharges, messCharges, otherCharges, subtotal, discount, discountedTotal, gstAmount, grandTotal };
  };

  // Calculate bill totals for OP
  const calculateOPTotals = () => {
    const bill = opBill;
    const itemsTotal = bill.items.reduce((sum, i) => sum + (i.quantity * (i.sale_price || 0)), 0);
    const consultationCharges = parseFloat(bill.consultation_charges) || 0;
    const treatmentCharges = parseFloat(bill.treatment_charges) || 0;
    const otherCharges = parseFloat(bill.other_charges) || 0;
    const discount = parseFloat(bill.discount) || 0;

    const subtotal = itemsTotal + consultationCharges + treatmentCharges + otherCharges;
    const discountedTotal = subtotal - discount;
    const gstAmount = bill.include_gst ? (discountedTotal * GST_RATE / 100) : 0;
    const grandTotal = discountedTotal + gstAmount;

    return { itemsTotal, consultationCharges, treatmentCharges, otherCharges, subtotal, discount, discountedTotal, gstAmount, grandTotal };
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    const currentBill = getCurrentBill();
    const totals = billType === 'IP' ? calculateIPTotals() : calculateOPTotals();

    // Prepare items with profit calculation
    const itemsWithProfit = currentBill.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      sale_price: item.sale_price,
      purchase_price: item.purchase_price || 0,
      item_total: item.quantity * item.sale_price,
      profit: (item.sale_price - (item.purchase_price || 0)) * item.quantity
    }));

    const billData = {
      patient_id: currentBill.patient_id,
      bill_type: billType,
      items: itemsWithProfit,
      consultation_charges: parseFloat(currentBill.consultation_charges) || 0,
      treatment_charges: parseFloat(currentBill.treatment_charges) || 0,
      room_charges: billType === 'IP' ? (parseFloat(currentBill.room_charges) || 0) : 0,
      mess_charges: billType === 'IP' ? (parseFloat(currentBill.mess_charges) || 0) : 0,
      other_charges: parseFloat(currentBill.other_charges) || 0,
      discount: parseFloat(currentBill.discount) || 0,
      gst_rate: currentBill.include_gst ? GST_RATE : 0,
      gst_amount: totals.gstAmount,
      subtotal: totals.subtotal,
      total_amount: totals.grandTotal,
      notes: currentBill.notes || '',
      admission_date: billType === 'IP' ? currentBill.admission_date : null,
      discharge_date: billType === 'IP' ? currentBill.discharge_date : null
    };

    try {
      await axios.post(`${API_URL}/bills`, billData, { headers: getAuthHeaders() });
      toast.success(`${billType} Bill created successfully`);
      setAddDialogOpen(false);
      // Reset forms
      setIpBill({
        patient_id: '', items: [], consultation_charges: '', room_charges: '',
        treatment_charges: '', mess_charges: '', other_charges: '', discount: '',
        notes: '', include_gst: true, admission_date: '', discharge_date: '', num_days: ''
      });
      setOpBill({
        patient_id: '', items: [], consultation_charges: '', treatment_charges: '',
        other_charges: '', discount: '', notes: '', include_gst: true
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create bill');
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/bills/payment`, {
        bill_id: selectedBill.id,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod
      }, { headers: getAuthHeaders() });
      toast.success('Payment recorded successfully');
      setPaymentDialogOpen(false);
      setPaymentAmount('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const openInvoice = (bill) => {
    setSelectedBill(bill);
    setInvoiceDialogOpen(true);
  };

  const handleAdvanceDeposit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/advances`, {
        patient_id: advancePatientId,
        amount: parseFloat(advanceAmount),
        payment_method: advanceMethod
      }, { headers: getAuthHeaders() });
      toast.success('Advance deposit recorded');
      setAdvanceDialogOpen(false);
      setAdvanceAmount('');
      setAdvancePatientId('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record advance');
    }
  };

  const fetchPatientSummary = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await axios.get(`${API_URL}/billing/patient-summary/${patientId}`, { headers: getAuthHeaders() });
      setPatientSummary(res.data);
    } catch (error) {
      toast.error('Failed to load patient billing summary');
    }
  };

  const handleApplyAdvance = async (billId) => {
    try {
      const advanceRes = await axios.get(`${API_URL}/advances/patient/${selectedBill.patient_id}/balance`, { headers: getAuthHeaders() });
      const balance = advanceRes.data.total_balance;
      if (balance <= 0) {
        toast.error('No advance balance available');
        return;
      }
      const remaining = selectedBill.total_amount - selectedBill.paid_amount;
      const toApply = Math.min(balance, remaining);
      await axios.post(`${API_URL}/advances/apply-to-bill?bill_id=${billId}&amount=${toApply}`, {}, { headers: getAuthHeaders() });
      toast.success(`Applied INR ${toApply.toFixed(2)} from advance`);
      setPaymentDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to apply advance');
    }
  };

  const autoPopulateFromSummary = () => {
    if (!patientSummary) return;
    if (billType === 'IP') {
      setIpBill(prev => ({
        ...prev,
        patient_id: patientSummary.patient.id,
        room_charges: patientSummary.room_charges.toString(),
        treatment_charges: patientSummary.therapy_charges.toString(),
        mess_charges: patientSummary.mess_charges.toString(),
      }));
    } else {
      setOpBill(prev => ({
        ...prev,
        patient_id: patientSummary.patient.id,
        treatment_charges: patientSummary.therapy_charges.toString(),
      }));
    }
    toast.success('Charges auto-populated from patient summary');
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <Check className="w-4 h-4 text-[#588157]" />;
      case 'partial': return <Clock className="w-4 h-4 text-[#D4A373]" />;
      default: return <AlertCircle className="w-4 h-4 text-[#BC4749]" />;
    }
  };

  const getPatientInfo = (patientId) => {
    return patients.find(p => p.id === patientId) || {};
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  // Get patients filtered by type
  const getFilteredPatients = () => {
    if (billType === 'IP') {
      return patients.filter(p => p.patient_type === 'IP' || p.status === 'admitted');
    }
    return patients; // OP can bill any patient
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const ipTotals = calculateIPTotals();
  const opTotals = calculateOPTotals();

  return (
    <div className="animate-fade-in" data-testid="billing-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Billing & Invoices</h1>
          <p className="page-subtitle">Create and manage IP/OP patient bills with GST invoices</p>
        </div>
        <div className="flex gap-2">
          {/* Advance Deposit Button */}
          <Dialog open={advanceDialogOpen} onOpenChange={setAdvanceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full border-[#D4A373] text-[#D4A373] hover:bg-[#D4A373]/10" data-testid="advance-deposit-btn">
                <Wallet className="w-5 h-5 mr-2" />
                Advance Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Record Advance Deposit</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdvanceDeposit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Patient</Label>
                  <Select value={advancePatientId} onValueChange={setAdvancePatientId}>
                    <SelectTrigger className="rounded-xl" data-testid="advance-patient-select"><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.phone}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (INR)</Label>
                  <Input type="number" value={advanceAmount} onChange={(e) => setAdvanceAmount(e.target.value)} required className="rounded-xl" placeholder="Enter advance amount" data-testid="advance-amount" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={advanceMethod} onValueChange={setAdvanceMethod}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full bg-[#D4A373] hover:bg-[#D4A373]/90 rounded-full" data-testid="submit-advance">Record Advance</Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Consolidated Summary Button */}
          <Dialog open={summaryDialogOpen} onOpenChange={setSummaryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full" data-testid="billing-summary-btn">
                <FileText className="w-5 h-5 mr-2" />
                Patient Summary
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Patient Billing Summary</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Select Patient</Label>
                  <Select value={summaryPatientId} onValueChange={(v) => { setSummaryPatientId(v); fetchPatientSummary(v); }}>
                    <SelectTrigger className="rounded-xl" data-testid="summary-patient-select"><SelectValue placeholder="Select patient" /></SelectTrigger>
                    <SelectContent>
                      {patients.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - {p.phone}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {patientSummary && (
                  <div className="space-y-3">
                    <div className="p-4 bg-[#3A5A40]/5 rounded-xl">
                      <h4 className="font-semibold mb-2 text-[#3A5A40]">{patientSummary.patient.name}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-gray-500">Therapy Sessions:</span> <strong>{patientSummary.therapy_sessions}</strong></div>
                        <div><span className="text-gray-500">Therapy Charges:</span> <strong>INR {patientSummary.therapy_charges.toFixed(2)}</strong></div>
                        <div><span className="text-gray-500">Room Charges:</span> <strong>INR {patientSummary.room_charges.toFixed(2)}</strong></div>
                        <div><span className="text-gray-500">Mess Charges:</span> <strong>INR {patientSummary.mess_charges.toFixed(2)}</strong></div>
                        <div><span className="text-gray-500">Advance Balance:</span> <strong className="text-[#588157]">INR {patientSummary.advance_balance.toFixed(2)}</strong></div>
                        <div><span className="text-gray-500">Outstanding:</span> <strong className="text-[#BC4749]">INR {patientSummary.outstanding.toFixed(2)}</strong></div>
                      </div>
                    </div>
                    <Button onClick={() => { autoPopulateFromSummary(); setSummaryDialogOpen(false); setAddDialogOpen(true); }} className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="auto-populate-btn">
                      Auto-Fill Consolidated Bill
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Invoice */}
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="create-bill-btn">
                <Plus className="w-5 h-5 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Create New Invoice</DialogTitle>
            </DialogHeader>

            {/* IP/OP Tabs */}
            <Tabs value={billType} onValueChange={setBillType} className="mt-4">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="OP" className="flex items-center gap-2" data-testid="op-tab">
                  <User className="w-4 h-4" />
                  Out-Patient (OP)
                </TabsTrigger>
                <TabsTrigger value="IP" className="flex items-center gap-2" data-testid="ip-tab">
                  <Bed className="w-4 h-4" />
                  In-Patient (IP)
                </TabsTrigger>
              </TabsList>

              {/* OP Bill Form */}
              <TabsContent value="OP">
                <form onSubmit={handleCreateBill} className="space-y-4">
                  <div className="p-3 bg-[#588157]/10 rounded-xl mb-4">
                    <p className="text-sm font-medium text-[#3A5A40]">Out-Patient Invoice</p>
                    <p className="text-xs text-[#6B7280]">For patients visiting for consultation and treatment</p>
                  </div>

                  {/* Patient Selection */}
                  <div className="space-y-2">
                    <Label>Select Patient</Label>
                    <Select value={opBill.patient_id} onValueChange={(v) => setOpBill({ ...opBill, patient_id: v })}>
                      <SelectTrigger className="rounded-xl" data-testid="op-patient-select">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} - {p.phone}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* OP Charges */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consultation Fees (₹)</Label>
                      <Input type="number" value={opBill.consultation_charges} onChange={(e) => setOpBill({ ...opBill, consultation_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="op-consultation" />
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Charges (₹)</Label>
                      <Input type="number" value={opBill.treatment_charges} onChange={(e) => setOpBill({ ...opBill, treatment_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="op-treatment" />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Charges (₹)</Label>
                      <Input type="number" value={opBill.other_charges} onChange={(e) => setOpBill({ ...opBill, other_charges: e.target.value })} className="rounded-xl" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount (₹)</Label>
                      <Input type="number" value={opBill.discount} onChange={(e) => setOpBill({ ...opBill, discount: e.target.value })} className="rounded-xl" placeholder="0" />
                    </div>
                  </div>

                  {/* Medicine Items */}
                  <div className="space-y-2">
                    <Label>Medicine Charges</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={selectInventoryItem}>
                        <SelectTrigger className="rounded-xl flex-1">
                          <SelectValue placeholder="Select medicine from inventory" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.filter(i => i.category === 'medicines' || i.category === 'herbs').map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} - ₹{(item.sale_price || item.price || 0).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <Input placeholder="Medicine name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="rounded-xl col-span-2" />
                      <Input type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className="rounded-xl" />
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Price" value={newItem.sale_price} onChange={(e) => setNewItem({ ...newItem, sale_price: e.target.value })} className="rounded-xl" />
                        <Button type="button" variant="outline" onClick={addItemToBill} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {opBill.items.length > 0 && (
                    <div className="border border-[#E2E8F0] rounded-xl p-3">
                      <p className="text-xs font-medium text-[#6B7280] mb-2">MEDICINES</p>
                      {opBill.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                          <span>{item.name} x {item.quantity}</span>
                          <div className="flex items-center gap-2">
                            <span>₹{(item.quantity * item.sale_price).toFixed(2)}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-[#BC4749]" onClick={() => removeItemFromBill(index)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GST Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-[#DAD7CD]/20 rounded-xl">
                    <input type="checkbox" id="op_gst" checked={opBill.include_gst} onChange={(e) => setOpBill({ ...opBill, include_gst: e.target.checked })} className="w-4 h-4 accent-[#3A5A40]" />
                    <Label htmlFor="op_gst" className="cursor-pointer">Include GST ({GST_RATE}%)</Label>
                  </div>

                  {/* Bill Summary */}
                  <div className="border border-[#3A5A40] rounded-xl p-4 bg-[#3A5A40]/5">
                    <h4 className="font-semibold mb-3">OP Bill Summary</h4>
                    <div className="space-y-1 text-sm">
                      {opTotals.consultationCharges > 0 && <div className="flex justify-between"><span>Consultation:</span><span>₹{opTotals.consultationCharges.toFixed(2)}</span></div>}
                      {opTotals.treatmentCharges > 0 && <div className="flex justify-between"><span>Treatment:</span><span>₹{opTotals.treatmentCharges.toFixed(2)}</span></div>}
                      {opTotals.itemsTotal > 0 && <div className="flex justify-between"><span>Medicines:</span><span>₹{opTotals.itemsTotal.toFixed(2)}</span></div>}
                      {opTotals.otherCharges > 0 && <div className="flex justify-between"><span>Other:</span><span>₹{opTotals.otherCharges.toFixed(2)}</span></div>}
                      <div className="flex justify-between border-t pt-1"><span>Subtotal:</span><span>₹{opTotals.subtotal.toFixed(2)}</span></div>
                      {opTotals.discount > 0 && <div className="flex justify-between text-[#BC4749]"><span>Discount:</span><span>-₹{opTotals.discount.toFixed(2)}</span></div>}
                      {opBill.include_gst && <div className="flex justify-between"><span>GST ({GST_RATE}%):</span><span>₹{opTotals.gstAmount.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-bold text-lg border-t pt-2 text-[#3A5A40]">
                        <span>Grand Total:</span><span>₹{opTotals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={opBill.notes} onChange={(e) => setOpBill({ ...opBill, notes: e.target.value })} className="rounded-xl" placeholder="Any additional notes" />
                  </div>

                  <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-op-bill">
                    Create OP Invoice
                  </Button>
                </form>
              </TabsContent>

              {/* IP Bill Form */}
              <TabsContent value="IP">
                <form onSubmit={handleCreateBill} className="space-y-4">
                  <div className="p-3 bg-[#D4A373]/10 rounded-xl mb-4">
                    <p className="text-sm font-medium text-[#D4A373]">In-Patient Invoice</p>
                    <p className="text-xs text-[#6B7280]">For admitted patients with room, treatment, and mess charges</p>
                  </div>

                  {/* Patient Selection */}
                  <div className="space-y-2">
                    <Label>Select Admitted Patient</Label>
                    <Select value={ipBill.patient_id} onValueChange={(v) => setIpBill({ ...ipBill, patient_id: v })}>
                      <SelectTrigger className="rounded-xl" data-testid="ip-patient-select">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredPatients().map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} - {p.phone} {p.room_number ? `(Room ${p.room_number})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Admission Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Admission Date</Label>
                      <Input type="date" value={ipBill.admission_date} onChange={(e) => setIpBill({ ...ipBill, admission_date: e.target.value })} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>Discharge Date</Label>
                      <Input type="date" value={ipBill.discharge_date} onChange={(e) => setIpBill({ ...ipBill, discharge_date: e.target.value })} className="rounded-xl" />
                    </div>
                  </div>

                  {/* IP Charges */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Consultation Charges (₹)</Label>
                      <Input type="number" value={ipBill.consultation_charges} onChange={(e) => setIpBill({ ...ipBill, consultation_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="ip-consultation" />
                    </div>
                    <div className="space-y-2">
                      <Label>Room Charges (₹)</Label>
                      <Input type="number" value={ipBill.room_charges} onChange={(e) => setIpBill({ ...ipBill, room_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="ip-room" />
                    </div>
                    <div className="space-y-2">
                      <Label>Treatment Charges (₹)</Label>
                      <Input type="number" value={ipBill.treatment_charges} onChange={(e) => setIpBill({ ...ipBill, treatment_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="ip-treatment" />
                    </div>
                    <div className="space-y-2">
                      <Label>Mess/Food Charges (₹)</Label>
                      <Input type="number" value={ipBill.mess_charges} onChange={(e) => setIpBill({ ...ipBill, mess_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="ip-mess" />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Charges (₹)</Label>
                      <Input type="number" value={ipBill.other_charges} onChange={(e) => setIpBill({ ...ipBill, other_charges: e.target.value })} className="rounded-xl" placeholder="0" />
                    </div>
                    <div className="space-y-2">
                      <Label>Discount (₹)</Label>
                      <Input type="number" value={ipBill.discount} onChange={(e) => setIpBill({ ...ipBill, discount: e.target.value })} className="rounded-xl" placeholder="0" />
                    </div>
                  </div>

                  {/* Medicine Items */}
                  <div className="space-y-2">
                    <Label>Medicine Charges</Label>
                    <div className="flex gap-2">
                      <Select onValueChange={selectInventoryItem}>
                        <SelectTrigger className="rounded-xl flex-1">
                          <SelectValue placeholder="Select medicine from inventory" />
                        </SelectTrigger>
                        <SelectContent>
                          {inventory.filter(i => i.category === 'medicines' || i.category === 'herbs').map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} - ₹{(item.sale_price || item.price || 0).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      <Input placeholder="Medicine name" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} className="rounded-xl col-span-2" />
                      <Input type="number" placeholder="Qty" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })} className="rounded-xl" />
                      <div className="flex gap-2">
                        <Input type="number" placeholder="Price" value={newItem.sale_price} onChange={(e) => setNewItem({ ...newItem, sale_price: e.target.value })} className="rounded-xl" />
                        <Button type="button" variant="outline" onClick={addItemToBill} className="rounded-xl"><Plus className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  {ipBill.items.length > 0 && (
                    <div className="border border-[#E2E8F0] rounded-xl p-3">
                      <p className="text-xs font-medium text-[#6B7280] mb-2">MEDICINES</p>
                      {ipBill.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                          <span>{item.name} x {item.quantity}</span>
                          <div className="flex items-center gap-2">
                            <span>₹{(item.quantity * item.sale_price).toFixed(2)}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-[#BC4749]" onClick={() => removeItemFromBill(index)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* GST Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-[#DAD7CD]/20 rounded-xl">
                    <input type="checkbox" id="ip_gst" checked={ipBill.include_gst} onChange={(e) => setIpBill({ ...ipBill, include_gst: e.target.checked })} className="w-4 h-4 accent-[#3A5A40]" />
                    <Label htmlFor="ip_gst" className="cursor-pointer">Include GST ({GST_RATE}%)</Label>
                  </div>

                  {/* Bill Summary */}
                  <div className="border border-[#D4A373] rounded-xl p-4 bg-[#D4A373]/5">
                    <h4 className="font-semibold mb-3">IP Bill Summary</h4>
                    <div className="space-y-1 text-sm">
                      {ipTotals.consultationCharges > 0 && <div className="flex justify-between"><span>Consultation:</span><span>₹{ipTotals.consultationCharges.toFixed(2)}</span></div>}
                      {ipTotals.roomCharges > 0 && <div className="flex justify-between"><span>Room Charges:</span><span>₹{ipTotals.roomCharges.toFixed(2)}</span></div>}
                      {ipTotals.treatmentCharges > 0 && <div className="flex justify-between"><span>Treatment:</span><span>₹{ipTotals.treatmentCharges.toFixed(2)}</span></div>}
                      {ipTotals.messCharges > 0 && <div className="flex justify-between"><span>Mess/Food:</span><span>₹{ipTotals.messCharges.toFixed(2)}</span></div>}
                      {ipTotals.itemsTotal > 0 && <div className="flex justify-between"><span>Medicines:</span><span>₹{ipTotals.itemsTotal.toFixed(2)}</span></div>}
                      {ipTotals.otherCharges > 0 && <div className="flex justify-between"><span>Other:</span><span>₹{ipTotals.otherCharges.toFixed(2)}</span></div>}
                      <div className="flex justify-between border-t pt-1"><span>Subtotal:</span><span>₹{ipTotals.subtotal.toFixed(2)}</span></div>
                      {ipTotals.discount > 0 && <div className="flex justify-between text-[#BC4749]"><span>Discount:</span><span>-₹{ipTotals.discount.toFixed(2)}</span></div>}
                      {ipBill.include_gst && <div className="flex justify-between"><span>GST ({GST_RATE}%):</span><span>₹{ipTotals.gstAmount.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-bold text-lg border-t pt-2 text-[#D4A373]">
                        <span>Grand Total:</span><span>₹{ipTotals.grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={ipBill.notes} onChange={(e) => setIpBill({ ...ipBill, notes: e.target.value })} className="rounded-xl" placeholder="Any additional notes" />
                  </div>

                  <Button type="submit" className="w-full bg-[#D4A373] hover:bg-[#D4A373]/90 rounded-full" data-testid="submit-ip-bill">
                    Create IP Invoice
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 rounded-xl" data-testid="filter-type">
            <SelectValue placeholder="Bill Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="OP">Out-Patient</SelectItem>
            <SelectItem value="IP">In-Patient</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-xl" data-testid="filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills List */}
      <div className="grid gap-4" data-testid="bills-list">
        {bills.length > 0 ? (
          bills.map((bill) => (
            <Card key={bill.id} className="card-hover" data-testid={`bill-card-${bill.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bill.bill_type === 'IP' ? 'bg-[#D4A373]/10' : 'bg-[#3A5A40]/10'}`}>
                        {bill.bill_type === 'IP' ? <Bed className="w-5 h-5 text-[#D4A373]" /> : <User className="w-5 h-5 text-[#3A5A40]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-[#1A1C18]">{bill.patient_name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bill.bill_type === 'IP' ? 'bg-[#D4A373]/10 text-[#D4A373]' : 'bg-[#3A5A40]/10 text-[#3A5A40]'}`}>
                            {bill.bill_type || 'OP'}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280]">
                          {formatDate(bill.created_at)} | Invoice #{bill.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Total</p>
                        <p className="font-semibold text-[#1A1C18]">₹{(bill.total_amount || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Paid</p>
                        <p className="font-semibold text-[#588157]">₹{(bill.paid_amount || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Balance</p>
                        <p className="font-semibold text-[#BC4749]">₹{((bill.total_amount || 0) - (bill.paid_amount || 0)).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">GST</p>
                        <p className="font-semibold">₹{(bill.gst_amount || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Status</p>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(bill.status)}
                          <span className="capitalize text-sm">{bill.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => openInvoice(bill)} data-testid={`view-invoice-btn-${bill.id}`}>
                      <Printer className="w-4 h-4 mr-1" />
                      Invoice
                    </Button>
                    {bill.status !== 'paid' && (
                      <Button variant="outline" size="sm" className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10" onClick={() => { setSelectedBill(bill); setPaymentDialogOpen(true); }} data-testid={`pay-btn-${bill.id}`}>
                        <IndianRupee className="w-4 h-4 mr-1" />
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="empty-state py-12">
            <Receipt className="empty-state-icon" />
            <p>No bills found</p>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <form onSubmit={handlePayment} className="space-y-4 mt-4">
              <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium">{selectedBill.patient_name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedBill.bill_type === 'IP' ? 'bg-[#D4A373]/10 text-[#D4A373]' : 'bg-[#3A5A40]/10 text-[#3A5A40]'}`}>
                    {selectedBill.bill_type || 'OP'}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span>Total Amount:</span>
                  <span className="font-medium">₹{(selectedBill.total_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Already Paid:</span>
                  <span className="text-[#588157]">₹{(selectedBill.paid_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-[#DAD7CD]">
                  <span>Balance Due:</span>
                  <span className="text-[#BC4749]">₹{((selectedBill.total_amount || 0) - (selectedBill.paid_amount || 0)).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required className="rounded-xl" placeholder="Enter amount" data-testid="payment-amount-input" />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="rounded-xl" data-testid="payment-method-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-payment-btn">
                Record Payment
              </Button>
              <Button type="button" variant="outline" className="w-full rounded-full border-[#D4A373] text-[#D4A373] hover:bg-[#D4A373]/10" onClick={() => handleApplyAdvance(selectedBill.id)} data-testid="apply-advance-btn">
                <Wallet className="w-4 h-4 mr-2" /> Apply Advance Deposit
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">Invoice Preview</h2>
              {selectedBill && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedBill.bill_type === 'IP' ? 'bg-[#D4A373]/10 text-[#D4A373]' : 'bg-[#3A5A40]/10 text-[#3A5A40]'}`}>
                  {selectedBill.bill_type || 'OP'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePrint} className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full">
                <Printer className="w-4 h-4 mr-2" />
                Print Invoice
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setInvoiceDialogOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div ref={printRef}>
            {selectedBill && <PrintableInvoice bill={selectedBill} patient={getPatientInfo(selectedBill.patient_id)} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Printable Invoice Component
function PrintableInvoice({ bill, patient }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    num = Math.round(num);
    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

    let words = '';
    if (Math.floor(num / 10000000) > 0) { words += numberToWords(Math.floor(num / 10000000)) + ' Crore '; num %= 10000000; }
    if (Math.floor(num / 100000) > 0) { words += numberToWords(Math.floor(num / 100000)) + ' Lakh '; num %= 100000; }
    if (Math.floor(num / 1000) > 0) { words += numberToWords(Math.floor(num / 1000)) + ' Thousand '; num %= 1000; }
    if (Math.floor(num / 100) > 0) { words += ones[Math.floor(num / 100)] + ' Hundred '; num %= 100; }
    if (num > 0) {
      if (num < 10) words += ones[num];
      else if (num < 20) words += teens[num - 10];
      else { words += tens[Math.floor(num / 10)]; if (num % 10 > 0) words += ' ' + ones[num % 10]; }
    }
    return words.trim();
  };

  const isIP = bill.bill_type === 'IP';
  const itemsTotal = (bill.items || []).reduce((sum, i) => sum + (i.quantity * (i.sale_price || i.price || 0)), 0);
  const consultationCharges = bill.consultation_charges || 0;
  const treatmentCharges = bill.treatment_charges || 0;
  const roomCharges = bill.room_charges || 0;
  const messCharges = bill.mess_charges || 0;
  const otherCharges = bill.other_charges || 0;
  const subtotal = bill.subtotal || (itemsTotal + consultationCharges + treatmentCharges + roomCharges + messCharges + otherCharges);
  const discount = bill.discount || 0;
  const gstAmount = bill.gst_amount || 0;
  const gstRate = bill.gst_rate || (gstAmount > 0 ? 18 : 0);
  const grandTotal = bill.total_amount || 0;

  const themeColor = isIP ? '#D4A373' : '#3A5A40';

  return (
    <div style={{ width: '210mm', minHeight: '297mm', padding: '15mm', fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.5', color: '#333', background: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: `3px solid ${themeColor}`, paddingBottom: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={HOSPITAL_INFO.logo} alt="Tatva Ayurved" style={{ width: '70px', height: '70px', borderRadius: '12px', objectFit: 'cover' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: themeColor, fontFamily: 'Georgia, serif' }}>{HOSPITAL_INFO.name}</h1>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>{HOSPITAL_INFO.address}</p>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>{HOSPITAL_INFO.city}</p>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>Ph: {HOSPITAL_INFO.phone} | Email: {HOSPITAL_INFO.email}</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: themeColor, fontFamily: 'Georgia, serif' }}>TAX INVOICE</h2>
          <p style={{ margin: '5px 0', fontSize: '14px', fontWeight: 'bold', color: themeColor }}>{isIP ? 'IN-PATIENT' : 'OUT-PATIENT'}</p>
          <p style={{ margin: '5px 0', fontSize: '11px', color: '#666' }}>{HOSPITAL_INFO.gstin}</p>
        </div>
      </div>

      {/* Invoice & Patient Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <div>
          <p style={{ margin: '3px 0' }}><strong>Invoice No:</strong> INV-{bill.id.slice(0, 8).toUpperCase()}</p>
          <p style={{ margin: '3px 0' }}><strong>Date:</strong> {formatDate(bill.created_at)}</p>
          <p style={{ margin: '3px 0' }}><strong>Patient Type:</strong> <span style={{ color: themeColor, fontWeight: 'bold' }}>{isIP ? 'In-Patient (IP)' : 'Out-Patient (OP)'}</span></p>
          {isIP && bill.admission_date && <p style={{ margin: '3px 0' }}><strong>Admission:</strong> {formatDate(bill.admission_date)}</p>}
          {isIP && bill.discharge_date && <p style={{ margin: '3px 0' }}><strong>Discharge:</strong> {formatDate(bill.discharge_date)}</p>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '3px 0' }}><strong>Patient Name:</strong> {bill.patient_name || patient.name}</p>
          <p style={{ margin: '3px 0' }}><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
          <p style={{ margin: '3px 0' }}><strong>Address:</strong> {patient.address || 'N/A'}</p>
          {isIP && patient.room_number && <p style={{ margin: '3px 0' }}><strong>Room No:</strong> {patient.room_number}</p>}
        </div>
      </div>

      {/* Charges Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: themeColor, color: 'white' }}>
            <th style={{ padding: '10px', textAlign: 'left', border: `1px solid ${themeColor}` }}>S.No</th>
            <th style={{ padding: '10px', textAlign: 'left', border: `1px solid ${themeColor}` }}>Description</th>
            <th style={{ padding: '10px', textAlign: 'center', border: `1px solid ${themeColor}` }}>Qty</th>
            <th style={{ padding: '10px', textAlign: 'right', border: `1px solid ${themeColor}` }}>Rate (₹)</th>
            <th style={{ padding: '10px', textAlign: 'right', border: `1px solid ${themeColor}` }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {/* Service Charges */}
          {consultationCharges > 0 && (
            <tr style={{ background: '#fff' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{isIP ? 'Consultation Charges' : 'Consultation Fees'}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{consultationCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{consultationCharges.toFixed(2)}</td>
            </tr>
          )}
          {isIP && roomCharges > 0 && (
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Room Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{roomCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{roomCharges.toFixed(2)}</td>
            </tr>
          )}
          {treatmentCharges > 0 && (
            <tr style={{ background: isIP && roomCharges > 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Treatment Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{treatmentCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{treatmentCharges.toFixed(2)}</td>
            </tr>
          )}
          {isIP && messCharges > 0 && (
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Mess/Food Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{messCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{messCharges.toFixed(2)}</td>
            </tr>
          )}
          {otherCharges > 0 && (
            <tr>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Other Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{otherCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{otherCharges.toFixed(2)}</td>
            </tr>
          )}

          {/* Medicines Section Header */}
          {(bill.items || []).length > 0 && (
            <tr style={{ background: '#e8e8e8' }}>
              <td colSpan={5} style={{ padding: '8px', border: '1px solid #ddd', fontWeight: 'bold' }}>Medicine Charges</td>
            </tr>
          )}

          {/* Medicine Items */}
          {(bill.items || []).map((item, index) => (
            <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{index + 1}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.name}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{(item.sale_price || item.price || 0).toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{(item.quantity * (item.sale_price || item.price || 0)).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
          {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee', color: '#BC4749' }}><span>Discount:</span><span>-₹{discount.toFixed(2)}</span></div>}
          {gstAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}><span>GST ({gstRate}%):</span><span>₹{gstAmount.toFixed(2)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', fontWeight: 'bold', fontSize: '16px', background: themeColor, color: 'white', marginTop: '5px', borderRadius: '4px' }}><span>Grand Total:</span><span>₹{grandTotal.toFixed(2)}</span></div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ background: '#f8f9fa', padding: '10px 15px', borderRadius: '4px', marginBottom: '20px' }}>
        <p style={{ margin: 0 }}><strong>Amount in Words:</strong> Rupees {numberToWords(Math.round(grandTotal))} Only</p>
      </div>

      {/* Payment Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div>
          <p style={{ margin: '3px 0' }}><strong>Payment Status:</strong> <span style={{ color: bill.status === 'paid' ? '#588157' : bill.status === 'partial' ? '#D4A373' : '#BC4749', textTransform: 'uppercase', fontWeight: 'bold' }}>{bill.status}</span></p>
          <p style={{ margin: '3px 0' }}><strong>Amount Paid:</strong> ₹{(bill.paid_amount || 0).toFixed(2)}</p>
          <p style={{ margin: '3px 0' }}><strong>Balance Due:</strong> ₹{(grandTotal - (bill.paid_amount || 0)).toFixed(2)}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '3px 0' }}><strong>Payment Mode:</strong> {bill.payment_method || 'N/A'}</p>
        </div>
      </div>

      {/* Terms & Signature */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px' }}>
        <div style={{ width: '60%' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Terms & Conditions:</p>
          <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '10px', color: '#666' }}>
            <li>Payment is due upon receipt of this invoice.</li>
            <li>All medicines once sold are non-refundable.</li>
            <li>This is a computer-generated invoice.</li>
            {isIP && <li>Room charges are calculated based on actual stay duration.</li>}
          </ol>
        </div>
        <div style={{ width: '35%', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #333', marginBottom: '5px', paddingTop: '50px' }}></div>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Authorized Signatory</p>
          <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>{HOSPITAL_INFO.name}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', paddingTop: '15px', borderTop: `2px solid ${themeColor}`, textAlign: 'center', fontSize: '10px', color: '#666' }}>
        <p style={{ margin: '3px 0' }}>Thank you for choosing {HOSPITAL_INFO.name}</p>
        <p style={{ margin: '3px 0' }}>"Healing through the wisdom of Ayurveda"</p>
        <p style={{ margin: '3px 0' }}>For queries, contact us at {HOSPITAL_INFO.phone} | {HOSPITAL_INFO.email}</p>
      </div>
    </div>
  );
}
