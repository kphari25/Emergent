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
import { toast } from 'sonner';
import { Plus, Bed, User, Home, Pencil, Trash2, DoorOpen, Package, IndianRupee, Users } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const roomTypes = [
  { value: 'general', label: 'General Ward', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'semi_private', label: 'Semi-Private', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { value: 'private', label: 'Private', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'deluxe', label: 'Deluxe', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'icu', label: 'ICU', color: 'bg-red-100 text-red-700 border-red-200' },
];

const floors = ['Ground', '1st Floor', '2nd Floor', '3rd Floor'];

const getRoomTypeColor = (type) => roomTypes.find(r => r.value === type)?.color || 'bg-gray-100 text-gray-700 border-gray-200';

export default function RoomManagement() {
  const { getAuthHeaders } = useAuth();
  const [overview, setOverview] = useState(null);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addRoomOpen, setAddRoomOpen] = useState(false);
  const [editRoomOpen, setEditRoomOpen] = useState(false);
  const [addPackageOpen, setAddPackageOpen] = useState(false);
  const [editPackageOpen, setEditPackageOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);

  const emptyRoom = { room_number: '', room_type: 'general', floor: 'Ground', daily_rate: '', description: '' };
  const [newRoom, setNewRoom] = useState({ ...emptyRoom });
  const [editRoom, setEditRoom] = useState({ ...emptyRoom });

  const emptyPkg = { name: '', duration_days: '', therapies: '', description: '', room_type: 'general', total_cost: '', includes_room: true, includes_food: true, includes_medicines: false };
  const [newPackage, setNewPackage] = useState({ ...emptyPkg });
  const [editPkg, setEditPkg] = useState({ ...emptyPkg });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [overviewRes, pkgRes] = await Promise.all([
        axios.get(`${API_URL}/rooms/overview`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/treatment-packages`, { headers: getAuthHeaders() })
      ]);
      setOverview(overviewRes.data);
      setPackages(pkgRes.data);
    } catch (error) {
      toast.error('Failed to load room data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/rooms`, {
        ...newRoom,
        daily_rate: parseFloat(newRoom.daily_rate)
      }, { headers: getAuthHeaders() });
      toast.success('Room added');
      setAddRoomOpen(false);
      setNewRoom({ ...emptyRoom });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add room');
    }
  };

  const handleEditRoom = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/rooms/${selectedRoom.id}`, {
        ...editRoom,
        daily_rate: parseFloat(editRoom.daily_rate)
      }, { headers: getAuthHeaders() });
      toast.success('Room updated');
      setEditRoomOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update room');
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await axios.delete(`${API_URL}/rooms/${roomId}`, { headers: getAuthHeaders() });
      toast.success('Room deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Cannot delete occupied room');
    }
  };

  const openEditRoom = (room) => {
    setSelectedRoom(room);
    setEditRoom({
      room_number: room.room_number,
      room_type: room.room_type,
      floor: room.floor || 'Ground',
      daily_rate: room.daily_rate.toString(),
      description: room.description || ''
    });
    setEditRoomOpen(true);
  };

  const handleAddPackage = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/treatment-packages`, {
        ...newPackage,
        duration_days: parseInt(newPackage.duration_days),
        total_cost: parseFloat(newPackage.total_cost),
        therapies: newPackage.therapies.split(',').map(t => t.trim()).filter(Boolean)
      }, { headers: getAuthHeaders() });
      toast.success('Package created');
      setAddPackageOpen(false);
      setNewPackage({ ...emptyPkg });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create package');
    }
  };

  const handleEditPackage = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/treatment-packages/${selectedPackage.id}`, {
        ...editPkg,
        duration_days: parseInt(editPkg.duration_days),
        total_cost: parseFloat(editPkg.total_cost),
        therapies: typeof editPkg.therapies === 'string' ? editPkg.therapies.split(',').map(t => t.trim()).filter(Boolean) : editPkg.therapies
      }, { headers: getAuthHeaders() });
      toast.success('Package updated');
      setEditPackageOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update package');
    }
  };

  const handleDeletePackage = async (pkgId) => {
    if (!window.confirm('Deactivate this package?')) return;
    try {
      await axios.delete(`${API_URL}/treatment-packages/${pkgId}`, { headers: getAuthHeaders() });
      toast.success('Package deactivated');
      fetchData();
    } catch (error) {
      toast.error('Failed to deactivate package');
    }
  };

  const openEditPackage = (pkg) => {
    setSelectedPackage(pkg);
    setEditPkg({
      name: pkg.name,
      duration_days: pkg.duration_days.toString(),
      therapies: Array.isArray(pkg.therapies) ? pkg.therapies.join(', ') : pkg.therapies,
      description: pkg.description || '',
      room_type: pkg.room_type,
      total_cost: pkg.total_cost.toString(),
      includes_room: pkg.includes_room,
      includes_food: pkg.includes_food,
      includes_medicines: pkg.includes_medicines
    });
    setEditPackageOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="spinner"></div></div>;
  }

  const RoomForm = ({ data, setData, onSubmit, label }) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Room Number</Label>
          <Input value={data.room_number} onChange={e => setData({ ...data, room_number: e.target.value })} required className="rounded-xl" data-testid="room-number-input" />
        </div>
        <div className="space-y-2">
          <Label>Room Type</Label>
          <Select value={data.room_type} onValueChange={v => setData({ ...data, room_type: v })}>
            <SelectTrigger className="rounded-xl" data-testid="room-type-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roomTypes.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Floor</Label>
          <Select value={data.floor} onValueChange={v => setData({ ...data, floor: v })}>
            <SelectTrigger className="rounded-xl" data-testid="room-floor-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {floors.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Daily Rate (INR)</Label>
          <Input type="number" value={data.daily_rate} onChange={e => setData({ ...data, daily_rate: e.target.value })} required className="rounded-xl" data-testid="room-rate-input" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description (Optional)</Label>
        <Input value={data.description} onChange={e => setData({ ...data, description: e.target.value })} className="rounded-xl" placeholder="e.g., AC, Attached bathroom" />
      </div>
      <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-room-btn">{label}</Button>
    </form>
  );

  const PackageForm = ({ data, setData, onSubmit, label }) => (
    <form onSubmit={onSubmit} className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Package Name</Label>
          <Input value={data.name} onChange={e => setData({ ...data, name: e.target.value })} required className="rounded-xl" placeholder="e.g., 7-Day Panchakarma" data-testid="pkg-name-input" />
        </div>
        <div className="space-y-2">
          <Label>Duration (Days)</Label>
          <Input type="number" value={data.duration_days} onChange={e => setData({ ...data, duration_days: e.target.value })} required className="rounded-xl" data-testid="pkg-duration-input" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Therapies (comma separated)</Label>
        <Input value={data.therapies} onChange={e => setData({ ...data, therapies: e.target.value })} className="rounded-xl" placeholder="Abhyanga, Shirodhara, Pizhichil" data-testid="pkg-therapies-input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Room Type</Label>
          <Select value={data.room_type} onValueChange={v => setData({ ...data, room_type: v })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {roomTypes.map(rt => <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Total Cost (INR)</Label>
          <Input type="number" value={data.total_cost} onChange={e => setData({ ...data, total_cost: e.target.value })} required className="rounded-xl" data-testid="pkg-cost-input" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={data.description} onChange={e => setData({ ...data, description: e.target.value })} className="rounded-xl" placeholder="Package details and inclusions" />
      </div>
      <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-pkg-btn">{label}</Button>
    </form>
  );

  return (
    <div className="animate-fade-in" data-testid="rooms-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Rooms & Packages</h1>
          <p className="page-subtitle">Manage beds, rooms, and treatment packages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-full border-[#3A5A40] text-[#3A5A40] hover:bg-[#3A5A40]/10" onClick={() => setAddPackageOpen(true)} data-testid="add-package-btn">
            <Package className="w-4 h-4 mr-2" /> New Package
          </Button>
          <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" onClick={() => setAddRoomOpen(true)} data-testid="add-room-btn">
            <Plus className="w-5 h-5 mr-2" /> Add Room
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="metric-card card-hover" data-testid="total-rooms-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div><p className="metric-label">Total Rooms</p><p className="metric-value">{overview?.total_rooms || 0}</p></div>
              <div className="w-10 h-10 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center"><Home className="w-5 h-5 text-[#3A5A40]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="occupied-rooms-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div><p className="metric-label">Occupied</p><p className="metric-value text-[#BC4749]">{overview?.occupied || 0}</p></div>
              <div className="w-10 h-10 rounded-xl bg-[#BC4749]/10 flex items-center justify-center"><Bed className="w-5 h-5 text-[#BC4749]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="available-rooms-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div><p className="metric-label">Available</p><p className="metric-value text-[#588157]">{overview?.available || 0}</p></div>
              <div className="w-10 h-10 rounded-xl bg-[#588157]/10 flex items-center justify-center"><DoorOpen className="w-5 h-5 text-[#588157]" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="metric-card card-hover" data-testid="occupancy-rate-card">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div><p className="metric-label">Occupancy Rate</p><p className="metric-value">{overview?.occupancy_rate || 0}%</p></div>
              <div className="w-10 h-10 rounded-xl bg-[#D4A373]/10 flex items-center justify-center"><Users className="w-5 h-5 text-[#D4A373]" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="floor-map" className="space-y-6">
        <TabsList className="bg-[#DAD7CD]/30">
          <TabsTrigger value="floor-map" data-testid="tab-floor-map">Floor Map</TabsTrigger>
          <TabsTrigger value="packages" data-testid="tab-packages">Treatment Packages</TabsTrigger>
        </TabsList>

        {/* Floor Map */}
        <TabsContent value="floor-map">
          {overview?.by_floor && Object.keys(overview.by_floor).length > 0 ? (
            <div className="space-y-6">
              {Object.entries(overview.by_floor).map(([floor, rooms]) => (
                <Card key={floor} data-testid={`floor-${floor}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">{floor}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {rooms.map((room) => (
                        <div
                          key={room.id}
                          className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                            room.is_occupied
                              ? 'bg-red-50 border-red-200'
                              : 'bg-green-50 border-green-200 hover:border-green-400'
                          }`}
                          data-testid={`room-card-${room.room_number}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">#{room.room_number}</span>
                            <div className="flex gap-1">
                              <button onClick={() => openEditRoom(room)} className="text-[#6B7280] hover:text-[#3A5A40]" data-testid={`edit-room-${room.id}`}>
                                <Pencil className="w-3 h-3" />
                              </button>
                              {!room.is_occupied && (
                                <button onClick={() => handleDeleteRoom(room.id)} className="text-[#6B7280] hover:text-red-500" data-testid={`delete-room-${room.id}`}>
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getRoomTypeColor(room.room_type)}`}>
                            {roomTypes.find(rt => rt.value === room.room_type)?.label || room.room_type}
                          </span>
                          <p className="text-xs text-[#6B7280] mt-1">₹{room.daily_rate}/day</p>
                          {room.is_occupied ? (
                            <div className="mt-2 pt-2 border-t border-red-200">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-red-500" />
                                <span className="text-[10px] font-medium text-red-700 truncate">{room.patient_name || 'Patient'}</span>
                              </div>
                              {room.patient_pid && <span className="text-[9px] text-red-500 font-mono">{room.patient_pid}</span>}
                            </div>
                          ) : (
                            <div className="mt-2 pt-2 border-t border-green-200">
                              <span className="text-[10px] font-medium text-green-700">Available</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="empty-state py-12">
              <Bed className="empty-state-icon" />
              <p>No rooms configured yet. Add your first room above.</p>
            </div>
          )}

          {/* Room type legend */}
          <div className="mt-6 flex flex-wrap gap-3">
            {roomTypes.map(rt => (
              <div key={rt.value} className="flex items-center gap-2">
                <span className={`inline-block w-3 h-3 rounded ${rt.color.split(' ')[0]}`}></span>
                <span className="text-xs text-[#6B7280]">{rt.label}</span>
              </div>
            ))}
            <span className="mx-2 text-[#E2E8F0]">|</span>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-green-200"></span>
              <span className="text-xs text-[#6B7280]">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded bg-red-200"></span>
              <span className="text-xs text-[#6B7280]">Occupied</span>
            </div>
          </div>
        </TabsContent>

        {/* Treatment Packages */}
        <TabsContent value="packages">
          {packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map(pkg => (
                <Card key={pkg.id} className="hover:shadow-md transition-shadow" data-testid={`package-card-${pkg.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#1A1C18]">{pkg.name}</h3>
                        <p className="text-sm text-[#6B7280]">{pkg.duration_days} days</p>
                      </div>
                      <p className="text-lg font-bold text-[#3A5A40]">₹{pkg.total_cost.toLocaleString()}</p>
                    </div>
                    {pkg.description && <p className="text-xs text-[#6B7280] mb-3">{pkg.description}</p>}
                    {pkg.therapies?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pkg.therapies.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#3A5A40]/10 text-[#3A5A40]">{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 text-[10px] text-[#6B7280] mb-3">
                      {pkg.includes_room && <span className="bg-green-50 px-1.5 py-0.5 rounded">Room</span>}
                      {pkg.includes_food && <span className="bg-green-50 px-1.5 py-0.5 rounded">Food</span>}
                      {pkg.includes_medicines && <span className="bg-green-50 px-1.5 py-0.5 rounded">Medicines</span>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-full text-xs" onClick={() => openEditPackage(pkg)} data-testid={`edit-pkg-${pkg.id}`}>
                        <Pencil className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full text-xs text-red-500 border-red-200 hover:bg-red-50" onClick={() => handleDeletePackage(pkg.id)} data-testid={`delete-pkg-${pkg.id}`}>
                        <Trash2 className="w-3 h-3 mr-1" /> Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="empty-state py-12">
              <Package className="empty-state-icon" />
              <p>No treatment packages created yet</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Room Dialog */}
      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Add New Room</DialogTitle></DialogHeader>
          <RoomForm data={newRoom} setData={setNewRoom} onSubmit={handleAddRoom} label="Add Room" />
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={editRoomOpen} onOpenChange={setEditRoomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Edit Room</DialogTitle></DialogHeader>
          <RoomForm data={editRoom} setData={setEditRoom} onSubmit={handleEditRoom} label="Save Changes" />
        </DialogContent>
      </Dialog>

      {/* Add Package Dialog */}
      <Dialog open={addPackageOpen} onOpenChange={setAddPackageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Create Treatment Package</DialogTitle></DialogHeader>
          <PackageForm data={newPackage} setData={setNewPackage} onSubmit={handleAddPackage} label="Create Package" />
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={editPackageOpen} onOpenChange={setEditPackageOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle style={{ fontFamily: 'Playfair Display' }}>Edit Treatment Package</DialogTitle></DialogHeader>
          <PackageForm data={editPkg} setData={setEditPkg} onSubmit={handleEditPackage} label="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
