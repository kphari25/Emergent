import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Users, Search, User, Trash2, Key, Shield, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roleLabels = {
  admin: 'Administrator',
  doctor: 'Doctor',
  front_desk: 'Front Desk',
  hr: 'HR Manager',
  therapist: 'Therapist'
};

const roleIcons = {
  admin: ShieldCheck,
  doctor: User,
  front_desk: User,
  hr: Shield,
  therapist: User
};

const roleColors = {
  admin: 'bg-[#BC4749]/10 text-[#BC4749]',
  doctor: 'bg-[#3A5A40]/10 text-[#3A5A40]',
  front_desk: 'bg-[#588157]/10 text-[#588157]',
  hr: 'bg-[#D4A373]/10 text-[#D4A373]',
  therapist: 'bg-[#588157]/10 text-[#588157]'
};

export default function UserManagement() {
  const { getAuthHeaders, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'front_desk'
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/users`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/auth/roles`, { headers: getAuthHeaders() })
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data.roles);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/users`, newUser, { headers: getAuthHeaders() });
      toast.success('User created successfully');
      setAddUserDialogOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'front_desk' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/users/${selectedUser.id}/reset-password`, 
        { new_password: newPassword }, 
        { headers: getAuthHeaders() }
      );
      toast.success('Password reset successfully');
      setResetPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await axios.delete(`${API_URL}/users/${selectedUser.id}`, { headers: getAuthHeaders() });
      toast.success('User deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const openResetDialog = (user) => {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="user-management-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage system users and their access roles</p>
        </div>
        <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-user-btn">
              <Plus className="w-5 h-5 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Create New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="Enter full name"
                  data-testid="new-user-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="Enter email address"
                  data-testid="new-user-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  required
                  minLength={6}
                  className="rounded-xl"
                  placeholder="Min 6 characters"
                  data-testid="new-user-password"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                  <SelectTrigger className="rounded-xl" data-testid="new-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map(r => (
                      <SelectItem key={r} value={r}>{roleLabels[r] || r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-[#DAD7CD]/30 rounded-xl text-sm text-[#6B7280]">
                <p><strong>Role Permissions:</strong></p>
                <ul className="mt-1 space-y-1">
                  <li>• Admin: Full access to all modules</li>
                  <li>• HR: Access to HR module + reports</li>
                  <li>• Doctor/Front Desk/Therapist: Core modules only</li>
                </ul>
              </div>
              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-user-btn">
                Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="metric-card card-hover mb-8" data-testid="users-summary-card">
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-[#3A5A40]" />
            </div>
            <div>
              <p className="metric-label">Total Users</p>
              <p className="metric-value">{users.length}</p>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {roles.map(r => {
                const count = users.filter(u => u.role === r).length;
                if (count === 0) return null;
                return (
                  <span key={r} className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[r] || 'bg-gray-100 text-gray-600'}`}>
                    {roleLabels[r] || r}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
            data-testid="search-users"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48 rounded-xl" data-testid="filter-role">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map(r => (
              <SelectItem key={r} value={r}>{roleLabels[r] || r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card data-testid="users-table">
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const RoleIcon = roleIcons[u.role] || User;
                    const isCurrentUser = u.id === currentUser?.id;
                    return (
                      <tr key={u.id} className="table-row-hover">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleColors[u.role] || 'bg-gray-100'}`}>
                              <RoleIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-[#1A1C18]">{u.name}</p>
                              {isCurrentUser && (
                                <span className="text-xs text-[#3A5A40]">(You)</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-[#6B7280]">{u.email}</td>
                        <td>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-600'}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            u.is_active !== false ? 'bg-[#588157]/10 text-[#588157]' : 'bg-[#BC4749]/10 text-[#BC4749]'
                          }`}>
                            {u.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full border-[#D4A373] text-[#D4A373] hover:bg-[#D4A373]/10"
                              onClick={() => openResetDialog(u)}
                              data-testid={`reset-pwd-btn-${u.id}`}
                            >
                              <Key className="w-4 h-4 mr-1" />
                              Reset
                            </Button>
                            {!isCurrentUser && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-[#BC4749] text-[#BC4749] hover:bg-[#BC4749]/10"
                                onClick={() => openDeleteDialog(u)}
                                data-testid={`delete-user-btn-${u.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
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
              <Users className="empty-state-icon" />
              <p>No users found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Reset Password</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
              <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-[#6B7280]">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="rounded-xl"
                  placeholder="Min 6 characters"
                  data-testid="reset-password-input"
                />
              </div>
              <Button type="submit" className="w-full bg-[#D4A373] hover:bg-[#D4A373]/90 rounded-full" data-testid="confirm-reset-pwd-btn">
                Reset Password
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#BC4749]">
              <AlertTriangle className="w-5 h-5" />
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 mt-4">
              <p className="text-[#6B7280]">
                Are you sure you want to delete user <strong>{selectedUser.name}</strong>? This action cannot be undone.
              </p>
              <DialogFooter className="flex gap-2">
                <Button variant="outline" className="rounded-full flex-1" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-[#BC4749] hover:bg-[#BC4749]/90 rounded-full flex-1" 
                  onClick={handleDeleteUser}
                  data-testid="confirm-delete-user-btn"
                >
                  Delete User
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
