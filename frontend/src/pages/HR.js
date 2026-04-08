import { useState, useEffect } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Users, IndianRupee, Search, User, Wallet, Calendar, Check, Clock, Pencil, CalendarOff, Trash2 } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const departments = ['Ayurveda', 'Panchakarma', 'Pharmacy', 'Reception', 'Administration', 'Accounts', 'Housekeeping', 'Other'];
const roles = ['doctor', 'nurse', 'receptionist', 'pharmacist', 'accountant', 'therapist', 'manager', 'other'];
const leaveTypes = ['casual', 'sick', 'earned', 'other'];

export default function HR() {
  const { getAuthHeaders } = useAuth();
  const [staff, setStaff] = useState([]);
  const [hrSummary, setHrSummary] = useState(null);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [leaveSummary, setLeaveSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [addStaffDialogOpen, setAddStaffDialogOpen] = useState(false);
  const [editStaffDialogOpen, setEditStaffDialogOpen] = useState(false);
  const [salaryDialogOpen, setSalaryDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [leaveSearchTerm, setLeaveSearchTerm] = useState('');

  const emptyStaff = {
    name: '', email: '', phone: '', role: 'other', department: 'Other',
    designation: '', salary: '', join_date: '', address: ''
  };

  const [newStaff, setNewStaff] = useState({ ...emptyStaff });
  const [editStaff, setEditStaff] = useState({ ...emptyStaff });

  const [salaryPayment, setSalaryPayment] = useState({
    month: new Date().toISOString().slice(0, 7),
    amount: '', bonus: '0', deductions: '0',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer', notes: ''
  });

  const [newLeave, setNewLeave] = useState({
    staff_id: '', leave_date: new Date().toISOString().slice(0, 10),
    leave_type: 'casual', from_time: '', to_time: '', is_half_day: false, reason: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterDepartment]);

  const fetchData = async () => {
    try {
      const [staffRes, summaryRes, paymentsRes, leavesRes, leaveSumRes] = await Promise.all([
        axios.get(`${API_URL}/staff?department=${filterDepartment}`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/reports/hr-summary`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/salary-payments`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/leaves`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/leaves/summary`, { headers: getAuthHeaders() })
      ]);
      setStaff(staffRes.data);
      setHrSummary(summaryRes.data);
      setSalaryPayments(paymentsRes.data);
      setLeaves(leavesRes.data);
      setLeaveSummary(leaveSumRes.data);
    } catch (error) {
      toast.error('Failed to load HR data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/staff`, {
        ...newStaff,
        salary: parseFloat(newStaff.salary)
      }, { headers: getAuthHeaders() });
      toast.success('Staff member added successfully');
      setAddStaffDialogOpen(false);
      setNewStaff({ ...emptyStaff });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add staff');
    }
  };

  const handleEditStaff = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/staff/${selectedStaff.id}`, {
        ...editStaff,
        salary: parseFloat(editStaff.salary)
      }, { headers: getAuthHeaders() });
      toast.success('Staff details updated');
      setEditStaffDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update staff');
    }
  };

  const openEditDialog = (staffMember) => {
    setSelectedStaff(staffMember);
    setEditStaff({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      role: staffMember.role,
      department: staffMember.department,
      designation: staffMember.designation,
      salary: staffMember.salary.toString(),
      join_date: staffMember.join_date,
      address: staffMember.address || ''
    });
    setEditStaffDialogOpen(true);
  };

  const handlePaySalary = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/staff/salary-payment`, {
        staff_id: selectedStaff.id,
        month: salaryPayment.month,
        amount: parseFloat(salaryPayment.amount),
        bonus: parseFloat(salaryPayment.bonus || 0),
        deductions: parseFloat(salaryPayment.deductions || 0),
        payment_date: salaryPayment.payment_date,
        payment_method: salaryPayment.payment_method,
        notes: salaryPayment.notes
      }, { headers: getAuthHeaders() });
      toast.success('Salary payment recorded');
      setSalaryDialogOpen(false);
      setSalaryPayment({
        month: new Date().toISOString().slice(0, 7),
        amount: '', bonus: '0', deductions: '0',
        payment_date: new Date().toISOString().slice(0, 10),
        payment_method: 'bank_transfer', notes: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleAddLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.staff_id) {
      toast.error('Please select a staff member');
      return;
    }
    try {
      await axios.post(`${API_URL}/leaves`, newLeave, { headers: getAuthHeaders() });
      toast.success('Leave recorded');
      setLeaveDialogOpen(false);
      setNewLeave({
        staff_id: '', leave_date: new Date().toISOString().slice(0, 10),
        leave_type: 'casual', from_time: '', to_time: '', is_half_day: false, reason: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record leave');
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!window.confirm('Delete this leave record?')) return;
    try {
      await axios.delete(`${API_URL}/leaves/${leaveId}`, { headers: getAuthHeaders() });
      toast.success('Leave record deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete leave');
    }
  };

  const openSalaryDialog = (staffMember) => {
    setSelectedStaff(staffMember);
    setSalaryPayment(prev => ({ ...prev, amount: staffMember.salary.toString() }));
    setSalaryDialogOpen(true);
  };

  const filteredStaff = staff.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLeaves = leaves.filter(l =>
    l.staff_name?.toLowerCase().includes(leaveSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  const StaffForm = ({ data, setData, onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required className="rounded-xl" data-testid="staff-name-input" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} required className="rounded-xl" data-testid="staff-email-input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} required className="rounded-xl" data-testid="staff-phone-input" />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={data.role} onValueChange={(v) => setData({ ...data, role: v })}>
            <SelectTrigger className="rounded-xl" data-testid="staff-role-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roles.map(r => (<SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Department</Label>
          <Select value={data.department} onValueChange={(v) => setData({ ...data, department: v })}>
            <SelectTrigger className="rounded-xl" data-testid="staff-department-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Designation</Label>
          <Input value={data.designation} onChange={(e) => setData({ ...data, designation: e.target.value })} required className="rounded-xl" placeholder="e.g., Senior Doctor" data-testid="staff-designation-input" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Monthly Salary (₹)</Label>
          <Input type="number" value={data.salary} onChange={(e) => setData({ ...data, salary: e.target.value })} required className="rounded-xl" data-testid="staff-salary-input" />
        </div>
        <div className="space-y-2">
          <Label>Join Date</Label>
          <Input type="date" value={data.join_date} onChange={(e) => setData({ ...data, join_date: e.target.value })} required className="rounded-xl" data-testid="staff-joindate-input" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address (Optional)</Label>
        <Textarea value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} className="rounded-xl" />
      </div>
      <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-staff-btn">
        {submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="animate-fade-in" data-testid="hr-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">HR Management</h1>
          <p className="page-subtitle">Manage staff, salary, and leave records</p>
        </div>
        <Dialog open={addStaffDialogOpen} onOpenChange={setAddStaffDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-staff-btn">
              <Plus className="w-5 h-5 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <StaffForm data={newStaff} setData={setNewStaff} onSubmit={handleAddStaff} submitLabel="Add Staff Member" />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="metric-card card-hover" data-testid="total-staff-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Total Staff</p>
                <p className="metric-value">{hrSummary?.total_staff || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-[#3A5A40]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="monthly-salary-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Monthly Salary</p>
                <p className="metric-value">₹{(hrSummary?.total_monthly_salary || 0).toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#588157]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="paid-month-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Paid This Month</p>
                <p className="metric-value text-[#588157]">{hrSummary?.paid_this_month || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#588157]/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-[#588157]" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="pending-month-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="metric-label">Pending Payments</p>
                <p className="metric-value text-[#D4A373]">{hrSummary?.pending_this_month || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#D4A373]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#D4A373]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="staff" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="staff" data-testid="tab-staff">Staff List</TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">Salary Payments</TabsTrigger>
          <TabsTrigger value="leaves" data-testid="tab-leaves">Leave Tracker</TabsTrigger>
        </TabsList>

        {/* ===== STAFF LIST TAB ===== */}
        <TabsContent value="staff">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <Input
                placeholder="Search staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
                data-testid="search-staff"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-48 rounded-xl" data-testid="filter-department">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <Card data-testid="staff-table">
            <CardContent className="p-0">
              {filteredStaff.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Staff Member</th>
                        <th>Department</th>
                        <th>Designation</th>
                        <th>Phone</th>
                        <th>Salary</th>
                        <th>Join Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStaff.map((s) => (
                        <tr key={s.id} className="table-row-hover">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#3A5A40]/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-[#3A5A40]" />
                              </div>
                              <div>
                                <p className="font-medium text-[#1A1C18]">{s.name}</p>
                                <p className="text-xs text-[#6B7280] capitalize">{s.role}</p>
                              </div>
                            </div>
                          </td>
                          <td>{s.department}</td>
                          <td>{s.designation}</td>
                          <td>{s.phone}</td>
                          <td className="font-medium">₹{s.salary?.toLocaleString()}</td>
                          <td>{s.join_date}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-[#588157] text-[#588157] hover:bg-[#588157]/10"
                                onClick={() => openEditDialog(s)}
                                data-testid={`edit-staff-btn-${s.id}`}
                              >
                                <Pencil className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10"
                                onClick={() => openSalaryDialog(s)}
                                data-testid={`pay-salary-btn-${s.id}`}
                              >
                                <IndianRupee className="w-4 h-4 mr-1" />
                                Pay
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-12">
                  <Users className="empty-state-icon" />
                  <p>No staff members found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== SALARY PAYMENTS TAB ===== */}
        <TabsContent value="payments">
          <Card data-testid="payments-table">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Recent Salary Payments</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {salaryPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Month</th>
                        <th>Base Amount</th>
                        <th>Bonus</th>
                        <th>Deductions</th>
                        <th>Net Amount</th>
                        <th>Payment Date</th>
                        <th>Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salaryPayments.map((p) => (
                        <tr key={p.id} className="table-row-hover">
                          <td className="font-medium">{p.staff_name}</td>
                          <td>{p.month}</td>
                          <td>₹{p.base_amount?.toLocaleString()}</td>
                          <td className="text-[#588157]">+₹{p.bonus?.toLocaleString()}</td>
                          <td className="text-[#BC4749]">-₹{p.deductions?.toLocaleString()}</td>
                          <td className="font-semibold">₹{p.net_amount?.toLocaleString()}</td>
                          <td>{p.payment_date}</td>
                          <td className="capitalize">{p.payment_method?.replace('_', ' ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-12">
                  <Wallet className="empty-state-icon" />
                  <p>No salary payments recorded yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LEAVE TRACKER TAB ===== */}
        <TabsContent value="leaves">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
              <Input
                placeholder="Search by staff name..."
                value={leaveSearchTerm}
                onChange={(e) => setLeaveSearchTerm(e.target.value)}
                className="pl-10 rounded-xl"
                data-testid="search-leaves"
              />
            </div>
            <Button
              className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6"
              onClick={() => setLeaveDialogOpen(true)}
              data-testid="add-leave-btn"
            >
              <Plus className="w-5 h-5 mr-2" />
              Record Leave
            </Button>
          </div>

          {/* Leave Summary Cards */}
          {leaveSummary.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#6B7280] mb-3 uppercase tracking-wide">Year-to-Date Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {leaveSummary.filter(s => s.total_leaves > 0).map(s => (
                  <div key={s.staff_id} className="p-3 rounded-xl border border-[#E2E8F0] bg-white" data-testid={`leave-summary-${s.staff_id}`}>
                    <p className="font-medium text-sm text-[#1A1C18] truncate">{s.staff_name}</p>
                    <p className="text-xs text-[#6B7280]">{s.department}</p>
                    <p className="text-lg font-bold text-[#D4A373] mt-1">{s.total_leaves} days</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card data-testid="leaves-table">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Playfair Display' }}>Leave Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredLeaves.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Staff</th>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Time</th>
                        <th>Duration</th>
                        <th>Reason</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeaves.map((l) => (
                        <tr key={l.id} className="table-row-hover">
                          <td className="font-medium">{l.staff_name}</td>
                          <td>{l.leave_date}</td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                              l.leave_type === 'sick' ? 'bg-red-100 text-red-700' :
                              l.leave_type === 'casual' ? 'bg-blue-100 text-blue-700' :
                              l.leave_type === 'earned' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {l.leave_type}
                            </span>
                          </td>
                          <td className="text-sm text-[#6B7280]">
                            {l.from_time && l.to_time ? `${l.from_time} - ${l.to_time}` : 'Full Day'}
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${l.is_half_day ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                              {l.is_half_day ? 'Half Day' : 'Full Day'}
                            </span>
                          </td>
                          <td className="text-sm text-[#6B7280] max-w-[200px] truncate">{l.reason || '-'}</td>
                          <td>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => handleDeleteLeave(l.id)}
                              data-testid={`delete-leave-${l.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state py-12">
                  <CalendarOff className="empty-state-icon" />
                  <p>No leave records found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Staff Dialog */}
      <Dialog open={editStaffDialogOpen} onOpenChange={setEditStaffDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Edit Staff Details</DialogTitle>
          </DialogHeader>
          <StaffForm data={editStaff} setData={setEditStaff} onSubmit={handleEditStaff} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Pay Salary Dialog */}
      <Dialog open={salaryDialogOpen} onOpenChange={setSalaryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Record Salary Payment</DialogTitle>
          </DialogHeader>
          {selectedStaff && (
            <form onSubmit={handlePaySalary} className="space-y-4 mt-4">
              <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                <p className="font-medium">{selectedStaff.name}</p>
                <p className="text-sm text-[#6B7280]">{selectedStaff.designation} - {selectedStaff.department}</p>
                <p className="text-sm text-[#3A5A40] mt-1">Monthly Salary: ₹{selectedStaff.salary?.toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Input type="month" value={salaryPayment.month} onChange={(e) => setSalaryPayment({ ...salaryPayment, month: e.target.value })} required className="rounded-xl" data-testid="salary-month-input" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Date</Label>
                  <Input type="date" value={salaryPayment.payment_date} onChange={(e) => setSalaryPayment({ ...salaryPayment, payment_date: e.target.value })} required className="rounded-xl" data-testid="salary-date-input" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Base Amount (₹)</Label>
                  <Input type="number" value={salaryPayment.amount} onChange={(e) => setSalaryPayment({ ...salaryPayment, amount: e.target.value })} required className="rounded-xl" data-testid="salary-amount-input" />
                </div>
                <div className="space-y-2">
                  <Label>Bonus (₹)</Label>
                  <Input type="number" value={salaryPayment.bonus} onChange={(e) => setSalaryPayment({ ...salaryPayment, bonus: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Deductions (₹)</Label>
                  <Input type="number" value={salaryPayment.deductions} onChange={(e) => setSalaryPayment({ ...salaryPayment, deductions: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="p-3 bg-[#588157]/10 rounded-xl text-center">
                <p className="text-sm text-[#6B7280]">Net Payment</p>
                <p className="text-xl font-bold text-[#588157]">
                  ₹{(parseFloat(salaryPayment.amount || 0) + parseFloat(salaryPayment.bonus || 0) - parseFloat(salaryPayment.deductions || 0)).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={salaryPayment.payment_method} onValueChange={(v) => setSalaryPayment({ ...salaryPayment, payment_method: v })}>
                  <SelectTrigger className="rounded-xl" data-testid="salary-method-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea value={salaryPayment.notes} onChange={(e) => setSalaryPayment({ ...salaryPayment, notes: e.target.value })} className="rounded-xl" placeholder="Any additional notes" />
              </div>
              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-salary-btn">
                Record Payment
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Record Leave Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Record Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLeave} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={newLeave.staff_id} onValueChange={(v) => setNewLeave({ ...newLeave, staff_id: v })}>
                <SelectTrigger className="rounded-xl" data-testid="leave-staff-select">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map(s => (<SelectItem key={s.id} value={s.id}>{s.name} - {s.department}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Leave Date</Label>
                <Input type="date" value={newLeave.leave_date} onChange={(e) => setNewLeave({ ...newLeave, leave_date: e.target.value })} required className="rounded-xl" data-testid="leave-date-input" />
              </div>
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={newLeave.leave_type} onValueChange={(v) => setNewLeave({ ...newLeave, leave_type: v })}>
                  <SelectTrigger className="rounded-xl" data-testid="leave-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(t => (<SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E2E8F0]">
              <Checkbox
                id="half-day"
                checked={newLeave.is_half_day}
                onCheckedChange={(checked) => setNewLeave({ ...newLeave, is_half_day: checked })}
                data-testid="leave-halfday-check"
              />
              <label htmlFor="half-day" className="cursor-pointer text-sm font-medium">Half Day Leave</label>
            </div>
            {newLeave.is_half_day && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Time</Label>
                  <Input type="time" value={newLeave.from_time} onChange={(e) => setNewLeave({ ...newLeave, from_time: e.target.value })} className="rounded-xl" data-testid="leave-from-time" />
                </div>
                <div className="space-y-2">
                  <Label>To Time</Label>
                  <Input type="time" value={newLeave.to_time} onChange={(e) => setNewLeave({ ...newLeave, to_time: e.target.value })} className="rounded-xl" data-testid="leave-to-time" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })} className="rounded-xl" placeholder="Reason for leave" data-testid="leave-reason-input" />
            </div>
            <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-leave-btn">
              Record Leave
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
