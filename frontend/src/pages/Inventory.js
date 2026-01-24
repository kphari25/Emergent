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
import { toast } from 'sonner';
import { Plus, Search, Package, Leaf, Pill, AlertTriangle, TrendingUp, TrendingDown, Minus, Upload, Download, FileSpreadsheet } from 'lucide-react';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const categoryIcons = {
  herbs: Leaf,
  medicines: Pill,
  equipment: Package,
  consumables: Package
};

export default function Inventory() {
  const { getAuthHeaders } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const [newItem, setNewItem] = useState({
    name: '', category: 'medicines', quantity: '', unit: 'pieces',
    min_stock: '', purchase_price: '', markup_percentage: '20', supplier: '', batch_number: '', expiry_date: ''
  });

  const [stockUpdate, setStockUpdate] = useState({ quantity_change: '', reason: '' });

  // Calculate sale price from purchase price and markup
  const calculateSalePrice = (purchasePrice, markup) => {
    const pp = parseFloat(purchasePrice) || 0;
    const m = parseFloat(markup) || 0;
    return (pp * (1 + m / 100)).toFixed(2);
  };

  useEffect(() => {
    fetchInventory();
  }, [filterCategory]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory?category=${filterCategory}`, { headers: getAuthHeaders() });
      setItems(res.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/inventory`, {
        ...newItem,
        quantity: parseInt(newItem.quantity),
        min_stock: parseInt(newItem.min_stock),
        purchase_price: parseFloat(newItem.purchase_price),
        markup_percentage: parseFloat(newItem.markup_percentage)
      }, { headers: getAuthHeaders() });
      toast.success('Item added successfully');
      setAddDialogOpen(false);
      setNewItem({
        name: '', category: 'medicines', quantity: '', unit: 'pieces',
        min_stock: '', purchase_price: '', markup_percentage: '20', supplier: '', batch_number: '', expiry_date: ''
      });
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add item');
    }
  };

  const handleStockUpdate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/inventory/${selectedItem.id}/update-stock`, {
        quantity_change: parseInt(stockUpdate.quantity_change),
        reason: stockUpdate.reason
      }, { headers: getAuthHeaders() });
      toast.success('Stock updated successfully');
      setStockDialogOpen(false);
      setStockUpdate({ quantity_change: '', reason: '' });
      fetchInventory();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update stock');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      await axios.delete(`${API_URL}/inventory/${itemId}`, { headers: getAuthHeaders() });
      toast.success('Item deleted');
      fetchInventory();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMovementBadge = (status) => {
    const badges = {
      fast: { class: 'badge-fast', icon: TrendingUp, label: 'Fast Moving' },
      slow: { class: 'badge-slow', icon: TrendingDown, label: 'Slow Moving' },
      dead: { class: 'badge-dead', icon: Minus, label: 'Dead Stock' }
    };
    return badges[status] || badges.slow;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="inventory-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">Manage medicines, herbs, and supplies</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#3A5A40] hover:bg-[#344E41] rounded-full px-6" data-testid="add-item-btn">
              <Plus className="w-5 h-5 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Add Inventory Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    required
                    className="rounded-xl"
                    data-testid="item-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                    <SelectTrigger className="rounded-xl" data-testid="item-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="herbs">Herbs</SelectItem>
                      <SelectItem value="medicines">Medicines</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                      <SelectItem value="consumables">Consumables</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    required
                    className="rounded-xl"
                    data-testid="item-quantity-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={newItem.unit} onValueChange={(v) => setNewItem({ ...newItem, unit: v })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pieces">Pieces</SelectItem>
                      <SelectItem value="bottles">Bottles</SelectItem>
                      <SelectItem value="kg">Kilograms</SelectItem>
                      <SelectItem value="grams">Grams</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="ml">Milliliters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min Stock</Label>
                  <Input
                    type="number"
                    value={newItem.min_stock}
                    onChange={(e) => setNewItem({ ...newItem, min_stock: e.target.value })}
                    required
                    className="rounded-xl"
                    data-testid="item-minstock-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.purchase_price}
                    onChange={(e) => setNewItem({ ...newItem, purchase_price: e.target.value })}
                    required
                    className="rounded-xl"
                    data-testid="item-purchase-price-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Markup %</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newItem.markup_percentage}
                    onChange={(e) => setNewItem({ ...newItem, markup_percentage: e.target.value })}
                    required
                    className="rounded-xl"
                    data-testid="item-markup-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sale Price (₹)</Label>
                  <Input
                    type="text"
                    value={calculateSalePrice(newItem.purchase_price, newItem.markup_percentage)}
                    disabled
                    className="rounded-xl bg-[#DAD7CD]/30"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Input
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({ ...newItem, supplier: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Batch Number</Label>
                  <Input
                    value={newItem.batch_number}
                    onChange={(e) => setNewItem({ ...newItem, batch_number: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={newItem.expiry_date}
                  onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
                  className="rounded-xl w-1/2"
                />
              </div>
              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-item-btn">
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B7280]" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl"
            data-testid="search-inventory"
          />
        </div>
        <Tabs value={filterCategory} onValueChange={setFilterCategory} className="w-full md:w-auto">
          <TabsList className="bg-[#DAD7CD]/30">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="herbs">Herbs</TabsTrigger>
            <TabsTrigger value="medicines">Medicines</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="consumables">Consumables</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Inventory Table */}
      <Card data-testid="inventory-table">
        <CardContent className="p-0">
          {filteredItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Purchase Price</th>
                    <th>Markup</th>
                    <th>Sale Price</th>
                    <th>Movement</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const Icon = categoryIcons[item.category] || Package;
                    const movementBadge = getMovementBadge(item.movement_status);
                    const isLowStock = item.quantity <= item.min_stock;
                    const purchasePrice = item.purchase_price || item.price || 0;
                    const markup = item.markup_percentage || 20;
                    const salePrice = item.sale_price || (purchasePrice * (1 + markup / 100));
                    
                    return (
                      <tr key={item.id} className="table-row-hover">
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#3A5A40]/10 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-[#3A5A40]" />
                            </div>
                            <div>
                              <p className="font-medium text-[#1A1C18]">{item.name}</p>
                              {item.batch_number && (
                                <p className="text-xs text-[#6B7280]">Batch: {item.batch_number}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="capitalize">{item.category}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className={isLowStock ? 'text-[#BC4749] font-medium' : ''}>
                              {item.quantity} {item.unit}
                            </span>
                            {isLowStock && (
                              <AlertTriangle className="w-4 h-4 text-[#BC4749]" />
                            )}
                          </div>
                          <p className="text-xs text-[#6B7280]">Min: {item.min_stock}</p>
                        </td>
                        <td className="text-[#6B7280]">₹{purchasePrice.toFixed(2)}</td>
                        <td>
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-[#588157]/10 text-[#588157]">
                            +{markup}%
                          </span>
                        </td>
                        <td className="font-medium text-[#3A5A40]">₹{salePrice.toFixed(2)}</td>
                        <td>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${movementBadge.class}`}>
                            {movementBadge.label}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => {
                                setSelectedItem(item);
                                setStockDialogOpen(true);
                              }}
                              data-testid={`update-stock-btn-${item.id}`}
                            >
                              Update Stock
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#BC4749] hover:bg-[#BC4749]/10"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              Delete
                            </Button>
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
              <Package className="empty-state-icon" />
              <p>No inventory items found</p>
            </div>
          )}}
        </CardContent>
      </Card>

      {/* Stock Update Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Playfair Display' }}>Update Stock</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleStockUpdate} className="space-y-4 mt-4">
              <div className="p-4 bg-[#DAD7CD]/20 rounded-xl">
                <p className="font-medium">{selectedItem.name}</p>
                <p className="text-sm text-[#6B7280]">Current Stock: {selectedItem.quantity} {selectedItem.unit}</p>
              </div>

              <div className="space-y-2">
                <Label>Quantity Change</Label>
                <Input
                  type="number"
                  value={stockUpdate.quantity_change}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, quantity_change: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="Enter positive to add, negative to remove"
                  data-testid="stock-quantity-input"
                />
                <p className="text-xs text-[#6B7280]">Use positive number to add stock, negative to remove</p>
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Input
                  value={stockUpdate.reason}
                  onChange={(e) => setStockUpdate({ ...stockUpdate, reason: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="e.g., Restocking, Patient treatment, Expired"
                  data-testid="stock-reason-input"
                />
              </div>

              <Button type="submit" className="w-full bg-[#3A5A40] hover:bg-[#344E41] rounded-full" data-testid="submit-stock-btn">
                Update Stock
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
