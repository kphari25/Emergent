import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Receipt, IndianRupee, Check, Clock, AlertCircle, Trash2, Printer, Eye, X } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hospital Details
const HOSPITAL_INFO = {
  name: 'Tatva Ayurved Hospital',
  address: 'Thekkuveedu Lane, Kannur Rd., Near Christian College',
  city: 'Kozhikode, Kerala - 673001',
  phone: '+91 9895112264',
  email: 'info@tatvaayurved.com',
  gstin: 'GSTIN: 32XXXXX1234X1ZX' // Add your actual GSTIN
};

// GST Rate (18% is common for healthcare services in India)
const GST_RATE = 18;

export default function Billing() {
  const { getAuthHeaders } = useAuth();
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const printRef = useRef();

  const [newBill, setNewBill] = useState({
    patient_id: '',
    items: [],
    treatment_charges: '',
    room_charges: '',
    consultation_charges: '',
    therapy_charges: '',
    other_charges: '',
    discount: '',
    notes: '',
    include_gst: true
  });

  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: '', purchase_price: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const [billsRes, patientsRes, inventoryRes] = await Promise.all([
        axios.get(`${API_URL}/bills?status=${filterStatus}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/patients`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/inventory`, { headers: getAuthHeaders() })
      ]);
      setBills(billsRes.data);
      setPatients(patientsRes.data);
      setInventory(inventoryRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addItemToBill = () => {
    if (!newItem.name || !newItem.sale_price) return;
    setNewBill({
      ...newBill,
      items: [...newBill.items, { 
        ...newItem, 
        quantity: parseInt(newItem.quantity), 
        sale_price: parseFloat(newItem.sale_price),
        purchase_price: parseFloat(newItem.purchase_price || 0)
      }]
    });
    setNewItem({ name: '', quantity: 1, sale_price: '', purchase_price: '' });
  };

  const removeItemFromBill = (index) => {
    setNewBill({
      ...newBill,
      items: newBill.items.filter((_, i) => i !== index)
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

  // Calculate bill totals
  const calculateBillTotals = (bill = newBill) => {
    const itemsTotal = bill.items.reduce((sum, i) => sum + (i.quantity * (i.sale_price || i.price || 0)), 0);
    const treatmentCharges = parseFloat(bill.treatment_charges) || 0;
    const roomCharges = parseFloat(bill.room_charges) || 0;
    const consultationCharges = parseFloat(bill.consultation_charges) || 0;
    const therapyCharges = parseFloat(bill.therapy_charges) || 0;
    const otherCharges = parseFloat(bill.other_charges) || 0;
    const discount = parseFloat(bill.discount) || 0;

    const subtotal = itemsTotal + treatmentCharges + roomCharges + consultationCharges + therapyCharges + otherCharges;
    const discountedTotal = subtotal - discount;
    const gstAmount = bill.include_gst ? (discountedTotal * GST_RATE / 100) : 0;
    const grandTotal = discountedTotal + gstAmount;

    const itemsProfit = bill.items.reduce((total, item) => {
      const profit = ((item.sale_price || item.price || 0) - (item.purchase_price || 0)) * item.quantity;
      return total + profit;
    }, 0);

    return {
      itemsTotal,
      treatmentCharges,
      roomCharges,
      consultationCharges,
      therapyCharges,
      otherCharges,
      subtotal,
      discount,
      discountedTotal,
      gstAmount,
      grandTotal,
      itemsProfit
    };
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    const totals = calculateBillTotals();
    try {
      await axios.post(`${API_URL}/bills`, {
        ...newBill,
        treatment_charges: parseFloat(newBill.treatment_charges || 0),
        room_charges: parseFloat(newBill.room_charges || 0),
        consultation_charges: parseFloat(newBill.consultation_charges || 0),
        therapy_charges: parseFloat(newBill.therapy_charges || 0),
        other_charges: parseFloat(newBill.other_charges || 0),
        discount: parseFloat(newBill.discount || 0),
        gst_rate: newBill.include_gst ? GST_RATE : 0,
        gst_amount: totals.gstAmount,
        subtotal: totals.subtotal,
        total_amount: totals.grandTotal
      }, { headers: getAuthHeaders() });
      toast.success('Bill created successfully');
      setAddDialogOpen(false);
      setNewBill({ 
        patient_id: '', items: [], treatment_charges: '', room_charges: '', 
        consultation_charges: '', therapy_charges: '', other_charges: '',
        discount: '', notes: '', include_gst: true 
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
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

    let words = '';
    
    if (Math.floor(num / 10000000) > 0) {
      words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
      words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
      words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (num < 10) words += ones[num];
      else if (num < 20) words += teens[num - 10];
      else {
        words += tens[Math.floor(num / 10)];
        if (num % 10 > 0) words += ' ' + ones[num % 10];
      }
    }
    return words.trim();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const totals = calculateBillTotals();

  return (
    <div className="animate-fade-in" data-testid="billing-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Manage patient bills, GST invoices and payments</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="create-bill-btn">
              <Plus className="w-5 h-5 mr-2" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Create New Bill</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBill} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Patient</Label>
                <Select
                  value={newBill.patient_id}
                  onValueChange={(v) => setNewBill({ ...newBill, patient_id: v })}
                >
                  <SelectTrigger className="rounded-xl" data-testid="bill-patient-select">
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} - {p.phone} ({p.patient_type || 'N/A'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Items */}
              <div className="space-y-2">
                <Label>Add Items (Medicines/Services)</Label>
                <div className="flex gap-2">
                  <Select onValueChange={selectInventoryItem}>
                    <SelectTrigger className="rounded-xl flex-1">
                      <SelectValue placeholder="Select from inventory" />
                    </SelectTrigger>
                    <SelectContent>
                      {inventory.map((item) => {
                        const salePrice = item.sale_price || item.price || 0;
                        return (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} - ₹{salePrice.toFixed(2)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2">
                  <Input
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    className="rounded-xl col-span-2"
                  />
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    className="rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newItem.sale_price}
                      onChange={(e) => setNewItem({ ...newItem, sale_price: e.target.value })}
                      className="rounded-xl"
                    />
                    <Button type="button" variant="outline" onClick={addItemToBill} className="rounded-xl">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {newBill.items.length > 0 && (
                <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Item</th>
                        <th className="text-center py-1">Qty</th>
                        <th className="text-right py-1">Rate</th>
                        <th className="text-right py-1">Amount</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {newBill.items.map((item, index) => (
                        <tr key={index} className="border-b border-dashed">
                          <td className="py-1">{item.name}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-right">₹{(item.sale_price || 0).toFixed(2)}</td>
                          <td className="text-right">₹{(item.quantity * (item.sale_price || 0)).toFixed(2)}</td>
                          <td>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-[#BC4749]" onClick={() => removeItemFromBill(index)}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Charges */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Consultation (₹)</Label>
                  <Input type="number" value={newBill.consultation_charges} onChange={(e) => setNewBill({ ...newBill, consultation_charges: e.target.value })} className="rounded-xl" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Treatment (₹)</Label>
                  <Input type="number" value={newBill.treatment_charges} onChange={(e) => setNewBill({ ...newBill, treatment_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="treatment-charges-input" />
                </div>
                <div className="space-y-2">
                  <Label>Therapy (₹)</Label>
                  <Input type="number" value={newBill.therapy_charges} onChange={(e) => setNewBill({ ...newBill, therapy_charges: e.target.value })} className="rounded-xl" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Room Charges (₹)</Label>
                  <Input type="number" value={newBill.room_charges} onChange={(e) => setNewBill({ ...newBill, room_charges: e.target.value })} className="rounded-xl" placeholder="0" data-testid="room-charges-input" />
                </div>
                <div className="space-y-2">
                  <Label>Other Charges (₹)</Label>
                  <Input type="number" value={newBill.other_charges} onChange={(e) => setNewBill({ ...newBill, other_charges: e.target.value })} className="rounded-xl" placeholder="0" />
                </div>
                <div className="space-y-2">
                  <Label>Discount (₹)</Label>
                  <Input type="number" value={newBill.discount} onChange={(e) => setNewBill({ ...newBill, discount: e.target.value })} className="rounded-xl" placeholder="0" />
                </div>
              </div>

              {/* GST Toggle */}
              <div className="flex items-center gap-3 p-3 bg-[#DAD7CD]/20 rounded-xl">
                <input
                  type="checkbox"
                  id="include_gst"
                  checked={newBill.include_gst}
                  onChange={(e) => setNewBill({ ...newBill, include_gst: e.target.checked })}
                  className="w-4 h-4 accent-[#3A5A40]"
                />
                <Label htmlFor="include_gst" className="cursor-pointer">Include GST ({GST_RATE}%)</Label>
              </div>

              {/* Bill Summary */}
              <div className="border border-[#3A5A40] rounded-xl p-4 bg-[#3A5A40]/5">
                <h4 className="font-semibold mb-3">Bill Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Items Total:</span><span>₹{totals.itemsTotal.toFixed(2)}</span></div>
                  {totals.consultationCharges > 0 && <div className="flex justify-between"><span>Consultation:</span><span>₹{totals.consultationCharges.toFixed(2)}</span></div>}
                  {totals.treatmentCharges > 0 && <div className="flex justify-between"><span>Treatment:</span><span>₹{totals.treatmentCharges.toFixed(2)}</span></div>}
                  {totals.therapyCharges > 0 && <div className="flex justify-between"><span>Therapy:</span><span>₹{totals.therapyCharges.toFixed(2)}</span></div>}
                  {totals.roomCharges > 0 && <div className="flex justify-between"><span>Room:</span><span>₹{totals.roomCharges.toFixed(2)}</span></div>}
                  {totals.otherCharges > 0 && <div className="flex justify-between"><span>Other:</span><span>₹{totals.otherCharges.toFixed(2)}</span></div>}
                  <div className="flex justify-between border-t pt-1"><span>Subtotal:</span><span>₹{totals.subtotal.toFixed(2)}</span></div>
                  {totals.discount > 0 && <div className="flex justify-between text-[#BC4749]"><span>Discount:</span><span>-₹{totals.discount.toFixed(2)}</span></div>}
                  {newBill.include_gst && <div className="flex justify-between"><span>GST ({GST_RATE}%):</span><span>₹{totals.gstAmount.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-lg border-t pt-2 text-[#3A5A40]">
                    <span>Grand Total:</span><span>₹{totals.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={newBill.notes} onChange={(e) => setNewBill({ ...newBill, notes: e.target.value })} className="rounded-xl" placeholder="Any additional notes" />
              </div>

              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-bill-btn">
                Create Bill
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 rounded-xl" data-testid="filter-status">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bills</SelectItem>
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
                      <div className="w-10 h-10 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-[#3A5A40]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-[#1A1C18]">{bill.patient_name}</h3>
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
                        <p className="font-semibold text-[#BC4749]">
                          ₹{((bill.total_amount || 0) - (bill.paid_amount || 0)).toFixed(2)}
                        </p>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => openInvoice(bill)}
                      data-testid={`view-invoice-btn-${bill.id}`}
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Invoice
                    </Button>
                    {bill.status !== 'paid' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10"
                        onClick={() => {
                          setSelectedBill(bill);
                          setPaymentDialogOpen(true);
                        }}
                        data-testid={`pay-btn-${bill.id}`}
                      >
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
                <p className="font-medium">{selectedBill.patient_name}</p>
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
                  <span className="text-[#BC4749]">
                    ₹{((selectedBill.total_amount || 0) - (selectedBill.paid_amount || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment Amount (₹)</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  required
                  className="rounded-xl"
                  placeholder="Enter amount"
                  data-testid="payment-amount-input"
                />
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
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0">
          <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Invoice Preview</h2>
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
          
          {/* Printable Invoice */}
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
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const numberToWords = (num) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    num = Math.round(num);
    if (num === 0) return 'Zero';
    if (num < 0) return 'Minus ' + numberToWords(Math.abs(num));

    let words = '';
    
    if (Math.floor(num / 10000000) > 0) {
      words += numberToWords(Math.floor(num / 10000000)) + ' Crore ';
      num %= 10000000;
    }
    if (Math.floor(num / 100000) > 0) {
      words += numberToWords(Math.floor(num / 100000)) + ' Lakh ';
      num %= 100000;
    }
    if (Math.floor(num / 1000) > 0) {
      words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
      words += ones[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (num < 10) words += ones[num];
      else if (num < 20) words += teens[num - 10];
      else {
        words += tens[Math.floor(num / 10)];
        if (num % 10 > 0) words += ' ' + ones[num % 10];
      }
    }
    return words.trim();
  };

  // Calculate totals from bill data
  const itemsTotal = (bill.items || []).reduce((sum, i) => sum + (i.quantity * (i.sale_price || i.price || 0)), 0);
  const treatmentCharges = bill.treatment_charges || 0;
  const roomCharges = bill.room_charges || 0;
  const consultationCharges = bill.consultation_charges || 0;
  const therapyCharges = bill.therapy_charges || 0;
  const otherCharges = bill.other_charges || 0;
  const subtotal = bill.subtotal || (itemsTotal + treatmentCharges + roomCharges + consultationCharges + therapyCharges + otherCharges);
  const discount = bill.discount || 0;
  const gstAmount = bill.gst_amount || 0;
  const gstRate = bill.gst_rate || (gstAmount > 0 ? 18 : 0);
  const grandTotal = bill.total_amount || 0;

  return (
    <div style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '15mm', 
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px',
      lineHeight: '1.5',
      color: '#333',
      background: '#fff'
    }}>
      {/* Header with Logo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #3A5A40', paddingBottom: '15px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* Logo */}
          <div style={{ 
            width: '70px', 
            height: '70px', 
            background: 'linear-gradient(135deg, #3A5A40 0%, #588157 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            fontFamily: 'Georgia, serif'
          }}>
            TA
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#3A5A40', fontFamily: 'Georgia, serif' }}>
              {HOSPITAL_INFO.name}
            </h1>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>{HOSPITAL_INFO.address}</p>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>{HOSPITAL_INFO.city}</p>
            <p style={{ margin: '2px 0', fontSize: '11px', color: '#666' }}>
              Ph: {HOSPITAL_INFO.phone} | Email: {HOSPITAL_INFO.email}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, fontSize: '28px', color: '#3A5A40', fontFamily: 'Georgia, serif' }}>TAX INVOICE</h2>
          <p style={{ margin: '5px 0', fontSize: '11px', color: '#666' }}>{HOSPITAL_INFO.gstin}</p>
        </div>
      </div>

      {/* Invoice Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
        <div>
          <p style={{ margin: '3px 0' }}><strong>Invoice No:</strong> INV-{bill.id.slice(0, 8).toUpperCase()}</p>
          <p style={{ margin: '3px 0' }}><strong>Date:</strong> {formatDate(bill.created_at)}</p>
          <p style={{ margin: '3px 0' }}><strong>Patient Type:</strong> {patient.patient_type || 'General'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: '3px 0' }}><strong>Patient Name:</strong> {bill.patient_name || patient.name}</p>
          <p style={{ margin: '3px 0' }}><strong>Phone:</strong> {patient.phone || 'N/A'}</p>
          <p style={{ margin: '3px 0' }}><strong>Address:</strong> {patient.address || 'N/A'}</p>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
        <thead>
          <tr style={{ background: '#3A5A40', color: 'white' }}>
            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #3A5A40' }}>S.No</th>
            <th style={{ padding: '10px', textAlign: 'left', border: '1px solid #3A5A40' }}>Description</th>
            <th style={{ padding: '10px', textAlign: 'center', border: '1px solid #3A5A40' }}>Qty</th>
            <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #3A5A40' }}>Rate (₹)</th>
            <th style={{ padding: '10px', textAlign: 'right', border: '1px solid #3A5A40' }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {/* Medicine/Items */}
          {(bill.items || []).map((item, index) => (
            <tr key={index} style={{ background: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{index + 1}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{item.name}</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{(item.sale_price || item.price || 0).toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{(item.quantity * (item.sale_price || item.price || 0)).toFixed(2)}</td>
            </tr>
          ))}
          
          {/* Service Charges */}
          {consultationCharges > 0 && (
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>{(bill.items || []).length + 1}</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Consultation Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{consultationCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{consultationCharges.toFixed(2)}</td>
            </tr>
          )}
          {treatmentCharges > 0 && (
            <tr>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Treatment Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{treatmentCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{treatmentCharges.toFixed(2)}</td>
            </tr>
          )}
          {therapyCharges > 0 && (
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Therapy Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{therapyCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{therapyCharges.toFixed(2)}</td>
            </tr>
          )}
          {roomCharges > 0 && (
            <tr>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Room Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{roomCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{roomCharges.toFixed(2)}</td>
            </tr>
          )}
          {otherCharges > 0 && (
            <tr style={{ background: '#f8f9fa' }}>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>-</td>
              <td style={{ padding: '8px', border: '1px solid #ddd' }}>Other Charges</td>
              <td style={{ padding: '8px', textAlign: 'center', border: '1px solid #ddd' }}>1</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{otherCharges.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'right', border: '1px solid #ddd' }}>{otherCharges.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee', color: '#BC4749' }}>
              <span>Discount:</span>
              <span>-₹{discount.toFixed(2)}</span>
            </div>
          )}
          {gstAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #eee' }}>
              <span>GST ({gstRate}%):</span>
              <span>₹{gstAmount.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', fontSize: '16px', background: '#3A5A40', color: 'white', paddingLeft: '10px', paddingRight: '10px', marginTop: '5px', borderRadius: '4px' }}>
            <span>Grand Total:</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div style={{ background: '#f8f9fa', padding: '10px 15px', borderRadius: '4px', marginBottom: '20px' }}>
        <p style={{ margin: 0 }}><strong>Amount in Words:</strong> Rupees {numberToWords(Math.round(grandTotal))} Only</p>
      </div>

      {/* Payment Status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <div>
          <p style={{ margin: '3px 0' }}><strong>Payment Status:</strong> <span style={{ 
            color: bill.status === 'paid' ? '#588157' : bill.status === 'partial' ? '#D4A373' : '#BC4749',
            textTransform: 'uppercase',
            fontWeight: 'bold'
          }}>{bill.status}</span></p>
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
          </ol>
        </div>
        <div style={{ width: '35%', textAlign: 'center' }}>
          <div style={{ borderBottom: '1px solid #333', marginBottom: '5px', paddingTop: '50px' }}></div>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Authorized Signatory</p>
          <p style={{ margin: 0, fontSize: '10px', color: '#666' }}>{HOSPITAL_INFO.name}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '40px', paddingTop: '15px', borderTop: '2px solid #3A5A40', textAlign: 'center', fontSize: '10px', color: '#666' }}>
        <p style={{ margin: '3px 0' }}>Thank you for choosing {HOSPITAL_INFO.name}</p>
        <p style={{ margin: '3px 0' }}>"Healing through the wisdom of Ayurveda"</p>
        <p style={{ margin: '3px 0' }}>For queries, contact us at {HOSPITAL_INFO.phone} | {HOSPITAL_INFO.email}</p>
      </div>
    </div>
  );
}
