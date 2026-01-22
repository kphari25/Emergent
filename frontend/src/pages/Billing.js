import { useState, useEffect } from 'react';
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
import { Plus, Receipt, IndianRupee, Check, Clock, AlertCircle, Trash2 } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Billing() {
  const { getAuthHeaders } = useAuth();
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  const [newBill, setNewBill] = useState({
    patient_id: '',
    items: [],
    treatment_charges: '',
    room_charges: '',
    notes: ''
  });

  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: '' });
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

  const calculateBillProfit = () => {
    return newBill.items.reduce((total, item) => {
      const profit = (item.sale_price - (item.purchase_price || 0)) * item.quantity;
      return total + profit;
    }, 0);
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/bills`, {
        ...newBill,
        treatment_charges: parseFloat(newBill.treatment_charges || 0),
        room_charges: parseFloat(newBill.room_charges || 0)
      }, { headers: getAuthHeaders() });
      toast.success('Bill created successfully');
      setAddDialogOpen(false);
      setNewBill({ patient_id: '', items: [], treatment_charges: '', room_charges: '', notes: '' });
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return <Check className="w-4 h-4 text-[#588157]" />;
      case 'partial': return <Clock className="w-4 h-4 text-[#D4A373]" />;
      default: return <AlertCircle className="w-4 h-4 text-[#BC4749]" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="billing-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Billing</h1>
          <p className="page-subtitle">Manage patient bills and payments</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="create-bill-btn">
              <Plus className="w-5 h-5 mr-2" />
              Create Bill
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      <SelectItem key={p.id} value={p.id}>{p.name} - {p.phone}</SelectItem>
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
                      placeholder="Sale Price"
                      value={newItem.sale_price}
                      onChange={(e) => setNewItem({ ...newItem, sale_price: e.target.value })}
                      className="rounded-xl"
                    />
                    <Button type="button" variant="outline" onClick={addItemToBill} className="rounded-xl">
                      <Plus className="w-4 h-4" />
                    </Button>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {newBill.items.length > 0 && (
                <div className="border border-[#E2E8F0] rounded-xl p-4 space-y-2">
                  {newBill.items.map((item, index) => {
                    const itemTotal = item.quantity * item.sale_price;
                    const itemProfit = (item.sale_price - (item.purchase_price || 0)) * item.quantity;
                    return (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{item.name} x {item.quantity}</span>
                        <div className="flex items-center gap-3">
                          <span>₹{itemTotal.toFixed(2)}</span>
                          <span className="text-[#588157] text-xs">(+₹{itemProfit.toFixed(2)} profit)</span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-[#BC4749]"
                            onClick={() => removeItemFromBill(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-[#E2E8F0] space-y-1">
                    <div className="font-medium flex justify-between">
                      <span>Items Total:</span>
                      <span>₹{newBill.items.reduce((sum, i) => sum + (i.quantity * i.sale_price), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-[#588157]">
                      <span>Items Profit:</span>
                      <span>+₹{calculateBillProfit().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Treatment Charges (₹)</Label>
                  <Input
                    type="number"
                    value={newBill.treatment_charges}
                    onChange={(e) => setNewBill({ ...newBill, treatment_charges: e.target.value })}
                    className="rounded-xl"
                    placeholder="0"
                    data-testid="treatment-charges-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room Charges (₹)</Label>
                  <Input
                    type="number"
                    value={newBill.room_charges}
                    onChange={(e) => setNewBill({ ...newBill, room_charges: e.target.value })}
                    className="rounded-xl"
                    placeholder="0"
                    data-testid="room-charges-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newBill.notes}
                  onChange={(e) => setNewBill({ ...newBill, notes: e.target.value })}
                  className="rounded-xl"
                  placeholder="Any additional notes"
                />
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
                          {new Date(bill.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Total</p>
                        <p className="font-semibold text-[#1A1C18]">₹{bill.total_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Paid</p>
                        <p className="font-semibold text-[#588157]">₹{bill.paid_amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Balance</p>
                        <p className="font-semibold text-[#BC4749]">
                          ₹{(bill.total_amount - bill.paid_amount).toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-[#6B7280] uppercase tracking-wide">Status</p>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(bill.status)}
                          <span className="capitalize text-sm">{bill.status}</span>
                        </div>
                      </div>
                    </div>

                    {bill.items.length > 0 && (
                      <div className="mt-4 text-sm text-[#6B7280]">
                        <span className="font-medium">Items: </span>
                        {bill.items.map(i => i.name).join(', ')}
                      </div>
                    )}
                  </div>

                  {bill.status !== 'paid' && (
                    <Button
                      variant="outline"
                      className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10"
                      onClick={() => {
                        setSelectedBill(bill);
                        setPaymentDialogOpen(true);
                      }}
                      data-testid={`pay-btn-${bill.id}`}
                    >
                      <IndianRupee className="w-4 h-4 mr-1" />
                      Record Payment
                    </Button>
                  )}
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
                  <span className="font-medium">₹{selectedBill.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Already Paid:</span>
                  <span className="text-[#588157]">₹{selectedBill.paid_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium mt-2 pt-2 border-t border-[#DAD7CD]">
                  <span>Balance Due:</span>
                  <span className="text-[#BC4749]">
                    ₹{(selectedBill.total_amount - selectedBill.paid_amount).toFixed(2)}
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
                  max={selectedBill.total_amount - selectedBill.paid_amount}
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
    </div>
  );
}
