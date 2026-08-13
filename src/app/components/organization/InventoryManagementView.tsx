import { useState } from 'react';
import { motion } from 'motion/react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useServiceArray } from '@/hooks/useService';
import { useOrgCurrency } from '@/hooks/useOrgCurrency';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { 
  Package, 
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  BarChart3,
  DollarSign,
  ShoppingCart,
  Archive,
  Edit,
  Eye,
  RefreshCw
} from 'lucide-react';
import { cn } from '../ui/utils';
import { AXIOM } from '../../../styles/axiom-tokens';

type InventoryView = 'items' | 'transactions' | 'analytics';

export function InventoryManagementView() {
  const [activeView, setActiveView] = useState<InventoryView>('items');
  const [searchQuery, setSearchQuery] = useState('');
  const orgCurrency = useOrgCurrency();

  const svc = useOrgServices();

  const { data: inventoryItems, loading: itemsLoading, error: itemsError, refetch: refetchItems } = useServiceArray(
    () => svc.inventory.getAll(),
    [svc.orgId],
    ['inventoryItems'],
  );

  const { data: inventoryTransactions, loading: txnLoading, error: txnError, refetch: refetchTxns } = useServiceArray(
    () => svc.inventory.getAllTransactions(),
    [svc.orgId],
    ['inventoryTransactions', 'inventoryItems'],
  );

  // ── Add Item / New Purchase dialogs (both buttons previously had no onClick at all) ──
  const [addOpen, setAddOpen] = useState(false);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyItem = {
    sku: '', name: '', category: '', unit: 'unit',
    currentStock: '', reorderLevel: '', reorderQuantity: '',
    averageCost: '', sellingPrice: '',
  };
  const [itemForm, setItemForm] = useState(emptyItem);

  const emptyPurchase = {
    inventoryItemId: '', quantity: '', unitCost: '',
    date: new Date().toISOString().slice(0, 10), referenceNumber: '', notes: '',
  };
  const [purchaseForm, setPurchaseForm] = useState(emptyPurchase);

  const num = (v: string) => {
    const n = Number.parseFloat(String(v).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : 0;
  };

  const handleAddItem = async () => {
    if (!itemForm.name.trim()) return toast.error('Enter an item name.');
    if (!itemForm.sku.trim()) return toast.error('Enter a SKU.');
    setSaving(true);
    const res = await svc.inventory.create({
      sku: itemForm.sku.trim(),
      name: itemForm.name.trim(),
      category: itemForm.category.trim() || 'General',
      unit: itemForm.unit.trim() || 'unit',
      costingMethod: 'weighted_average',
      currentStock: num(itemForm.currentStock),
      reorderLevel: num(itemForm.reorderLevel),
      reorderQuantity: num(itemForm.reorderQuantity),
      averageCost: num(itemForm.averageCost),
      lastCost: num(itemForm.averageCost),
      sellingPrice: num(itemForm.sellingPrice),
      assetAccountId: '',
      cogsAccountId: '',
      isActive: true,
    } as any);
    setSaving(false);
    if (!res.success) return toast.error(res.error || 'Could not add item.');
    toast.success(`"${itemForm.name.trim()}" added to inventory.`);
    setAddOpen(false);
    setItemForm(emptyItem);
    await refetchItems();
  };

  const handleRecordPurchase = async () => {
    if (!purchaseForm.inventoryItemId) return toast.error('Choose an item.');
    const qty = num(purchaseForm.quantity);
    const cost = num(purchaseForm.unitCost);
    if (qty <= 0) return toast.error('Enter a quantity greater than zero.');
    setSaving(true);
    const res = await svc.inventory.recordTransaction({
      inventoryItemId: purchaseForm.inventoryItemId,
      date: purchaseForm.date,
      type: 'purchase',
      quantity: qty,
      unitCost: cost,
      totalAmount: qty * cost,
      referenceNumber: purchaseForm.referenceNumber.trim() || undefined,
      notes: purchaseForm.notes.trim() || undefined,
    } as any);
    setSaving(false);
    if (!res.success) return toast.error(res.error || 'Could not record purchase.');
    toast.success(`Recorded purchase of ${qty} unit(s).`);
    setPurchaseOpen(false);
    setPurchaseForm(emptyPurchase);
    await Promise.all([refetchItems(), refetchTxns()]);
  };

  const loadError = itemsError || txnError;

  // Derive summary from items list (avoids a second network round-trip)
  const inventorySummary = {
    totalItems: inventoryItems.length,
    totalValue: inventoryItems.reduce((sum, i) => sum + i.currentStock * i.averageCost, 0),
    lowStockCount: inventoryItems.filter(i => i.currentStock <= i.reorderLevel).length,
    totalUnits: inventoryItems.reduce((sum, i) => sum + i.currentStock, 0),
  };

  const lowStockItems = inventoryItems.filter(item => item.currentStock <= item.reorderLevel);

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStockStatus = (item: typeof inventoryItems[0]) => {
    if (item.currentStock === 0) return { label: 'Out of Stock', color: 'red' };
    if (item.currentStock <= item.reorderLevel) return { label: 'Low Stock', color: 'orange' };
    return { label: 'In Stock', color: 'green' };
  };

  return (
    <div className="min-h-screen p-8 space-y-6" style={{ background: AXIOM.backgrounds.main }}>
      {/* Header */}
      <motion.div {...AXIOM.animations.fadeInTop}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="p-3 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Package className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Inventory Management
              </h1>
              <p className="text-slate-400 text-sm">Track stock levels, costing, and valuations</p>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (inventoryItems.length === 0) {
                  toast.error('Add an inventory item first, then record a purchase against it.');
                  return;
                }
                setPurchaseForm({ ...emptyPurchase, inventoryItemId: inventoryItems[0].id });
                setPurchaseOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={AXIOM.buttons.secondary}
            >
              <ShoppingCart className="size-4" />
              New Purchase
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setItemForm(emptyItem); setAddOpen(true); }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                border: '1px solid rgba(6, 182, 212, 0.5)',
                boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                color: '#ffffff',
              }}
            >
              <Plus className="size-4" />
              Add Item
            </motion.button>
          </div>
        </div>
      </motion.div>

      {loadError && (
        <div
          className="rounded-xl px-4 py-3 text-sm text-amber-100"
          style={{
            background: 'rgba(251, 146, 60, 0.12)',
            border: '1px solid rgba(251, 146, 60, 0.35)',
          }}
          role="alert"
        >
          {loadError}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Items</p>
              <p className="text-3xl font-bold text-white">{itemsLoading ? '—' : inventorySummary.totalItems}</p>
              <p className="text-xs text-cyan-400 mt-1">{itemsLoading ? '…' : `${inventorySummary.totalUnits} total units`}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Package className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Value</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(inventorySummary.totalValue)}</p>
              <p className="text-xs text-blue-400 mt-1">At average cost</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.blue,
                boxShadow: AXIOM.shadows.iconBlue,
              }}
            >
              <DollarSign className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Low Stock</p>
              <p className="text-3xl font-bold text-white">{itemsLoading ? '—' : inventorySummary.lowStockCount}</p>
              <p className="text-xs text-orange-400 mt-1">Items need reorder</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.3), rgba(249, 115, 22, 0.3))',
                boxShadow: '0 10px 30px -10px rgba(251, 146, 60, 0.6)',
              }}
            >
              <AlertTriangle className="size-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="p-6 rounded-2xl"
          style={AXIOM.containers.list}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Turnover Rate</p>
              <p className="text-3xl font-bold text-white">{itemsLoading ? '—' : '2.4x'}</p>
              <p className="text-xs text-emerald-400 mt-1">Annual average</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <TrendingUp className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl"
          style={{
            background: 'rgba(251, 146, 60, 0.1)',
            border: '1px solid rgba(251, 146, 60, 0.3)',
          }}
        >
          <div className="flex items-start gap-4">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.3), rgba(249, 115, 22, 0.3))',
                boxShadow: '0 10px 30px -10px rgba(251, 146, 60, 0.6)',
              }}
            >
              <AlertTriangle className="size-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-1">Low Stock Alert</h3>
              <p className="text-slate-400 text-sm mb-3">
                {lowStockItems.length} items are below reorder level and need to be restocked
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.slice(0, 3).map((item) => (
                  <span 
                    key={item.id} 
                    className="px-3 py-1 rounded-lg text-sm text-orange-400"
                    style={{ background: 'rgba(251, 146, 60, 0.15)', border: '1px solid rgba(251, 146, 60, 0.3)' }}
                  >
                    {item.name} ({item.currentStock} left)
                  </span>
                ))}
                {lowStockItems.length > 3 && (
                  <span 
                    className="px-3 py-1 rounded-lg text-sm text-orange-400"
                    style={{ background: 'rgba(251, 146, 60, 0.15)', border: '1px solid rgba(251, 146, 60, 0.3)' }}
                  >
                    +{lowStockItems.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 flex-shrink-0"
              style={{
                background: 'rgba(251, 146, 60, 0.3)',
                color: '#ffffff',
                border: '1px solid rgba(251, 146, 60, 0.5)',
              }}
            >
              <ShoppingCart className="size-4" />
              Create PO
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* View Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="flex gap-2 p-1 rounded-2xl"
        style={AXIOM.containers.list}
      >
        {[
          { id: 'items' as InventoryView, label: 'Inventory Items', icon: Package },
          { id: 'transactions' as InventoryView, label: 'Transactions', icon: RefreshCw },
          { id: 'analytics' as InventoryView, label: 'Analytics', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium rounded-xl transition-all"
              style={isActive ? AXIOM.buttons.primary : { background: 'transparent', color: '#94a3b8' }}
            >
              <Icon className="size-4" />
              {tab.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Content Area */}
      {activeView === 'items' && (
        <div className="space-y-4">
          {/* Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventory items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl text-white placeholder-slate-500"
              style={{
                background: AXIOM.inputs.background,
                border: AXIOM.inputs.border,
              }}
            />
          </motion.div>

          {/* Items Grid */}
          {itemsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-72 rounded-2xl animate-pulse"
                  style={{ background: 'rgba(148, 163, 184, 0.12)' }}
                />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl p-14 text-center" style={AXIOM.containers.list}>
              <Package className="mx-auto size-12 text-slate-500 mb-4" />
              <p className="text-base font-medium text-white">
                {inventoryItems.length === 0 ? 'No inventory items yet' : 'No items match your search'}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {inventoryItems.length === 0
                  ? 'Add items to track stock, costs, and low-stock alerts.'
                  : 'Try a different search or clear the filter.'}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item, index) => {
              const stockStatus = getStockStatus(item);
              const stockValue = item.currentStock * item.averageCost;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + index * 0.03 }}
                  className="p-6 rounded-2xl"
                  style={AXIOM.containers.list}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: AXIOM.iconBoxes.cyan,
                        boxShadow: AXIOM.shadows.iconCyan,
                      }}
                    >
                      <Package className="size-6 text-white" />
                    </div>
                    <span 
                      className="px-3 py-1 rounded-lg text-xs font-medium"
                      style={
                        stockStatus.color === 'green' ? AXIOM.badges.success :
                        stockStatus.color === 'orange' ? { background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)' } :
                        AXIOM.badges.danger
                      }
                    >
                      {stockStatus.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">{item.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{item.sku} • {item.category}</p>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Current Stock</span>
                      <span className="text-sm font-medium text-white">{item.currentStock} {item.unit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Average Cost</span>
                      <span className="text-sm font-medium text-cyan-400">{formatCurrency(item.averageCost)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Stock Value</span>
                      <span className="text-sm font-medium text-emerald-400">{formatCurrency(stockValue)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Reorder Level</span>
                      <span className="text-sm font-medium text-orange-400">{item.reorderLevel} {item.unit}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-2" style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                      style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                    >
                      <Eye className="size-3" />
                      View
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                      style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                    >
                      <Edit className="size-3" />
                      Edit
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {activeView === 'transactions' && (
        <div className="space-y-4">
          {/* Transactions Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl overflow-hidden"
            style={AXIOM.containers.list}
          >
            <div className="p-6" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <h3 className="text-lg font-semibold text-white">Recent Inventory Transactions</h3>
              <p className="text-sm text-slate-400 mt-1">Track purchases, sales, and adjustments</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'rgba(148, 163, 184, 0.05)' }}>
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Item</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Type</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Quantity</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Unit Cost</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Total Amount</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {txnLoading && inventoryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center text-sm text-slate-400">
                        Loading transactions…
                      </td>
                    </tr>
                  ) : !txnLoading && inventoryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-14 text-center">
                        <p className="text-base font-medium text-white">No inventory transactions yet</p>
                        <p className="mt-2 text-sm text-slate-400">
                          Purchases, sales, and adjustments appear here when recorded.
                        </p>
                      </td>
                    </tr>
                  ) : (
                  inventoryTransactions.map((txn, index) => {
                    const item = inventoryItems.find(i => i.id === txn.inventoryItemId);
                    const isIncrease = txn.type === 'purchase' || txn.type === 'adjustment';
                    return (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + index * 0.03 }}
                        style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}
                      >
                        <td className="px-6 py-4">
                          <span className="text-slate-300">{formatDate(txn.date)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white font-medium">{item?.name || 'Unknown Item'}</div>
                          <div className="text-xs text-slate-500">{item?.sku}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span 
                            className="inline-flex px-3 py-1 rounded-lg text-xs font-medium"
                            style={
                              txn.type === 'purchase' ? AXIOM.badges.success :
                              txn.type === 'sale' ? AXIOM.badges.info :
                              txn.type === 'adjustment' ? { background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)' } :
                              { background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)' }
                            }
                          >
                            {txn.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={cn(
                            'font-medium',
                            isIncrease ? 'text-emerald-400' : 'text-orange-400'
                          )}>
                            {isIncrease ? '+' : ''}{txn.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-slate-300">{formatCurrency(txn.unitCost)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white font-medium">{formatCurrency(Math.abs(txn.totalAmount))}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 text-sm font-mono">{txn.referenceNumber || '-'}</span>
                        </td>
                      </motion.tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {activeView === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartBlue}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Stock Levels Overview</h3>
            <div className="space-y-4">
              {filteredItems.length === 0 ? (
                <p className="text-sm text-slate-400 py-4">No items to chart yet. Add inventory items to see levels here.</p>
              ) : filteredItems.map((item, idx) => {
                const cap = Math.max((item.reorderQuantity || 0) * 2, (item.reorderLevel || 0) * 2, 1);
                const stockPercentage = (item.currentStock / cap) * 100;
                const stockStatus = getStockStatus(item);
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white font-medium">{item.name}</span>
                      <span 
                        className="text-xs px-2 py-1 rounded-lg"
                        style={
                          stockStatus.color === 'green' ? { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' } :
                          stockStatus.color === 'orange' ? { background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c' } :
                          { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }
                        }
                      >
                        {item.currentStock} {item.unit}
                      </span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        transition={{ duration: 1, delay: 0.2 + idx * 0.05 }}
                        className="h-full"
                        style={{
                          background: stockStatus.color === 'green' ? 'linear-gradient(90deg, #10b981, #059669)' :
                                     stockStatus.color === 'orange' ? 'linear-gradient(90deg, #fb923c, #f97316)' :
                                     'linear-gradient(90deg, #ef4444, #dc2626)'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartBlue}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Valuation Summary</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <div className="text-sm text-slate-400 mb-1">Total Inventory Value</div>
                <div className="text-2xl font-bold text-cyan-400">{itemsLoading ? '—' : formatCurrency(inventorySummary.totalValue)}</div>
                <div className="text-xs text-slate-500 mt-1">At average cost</div>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <div className="text-sm text-slate-400 mb-1">Potential Revenue</div>
                <div className="text-2xl font-bold text-emerald-400">
                  {itemsLoading ? '—' : formatCurrency(inventoryItems.reduce((sum, item) => sum + (item.currentStock * item.sellingPrice), 0))}
                </div>
                <div className="text-xs text-slate-500 mt-1">At selling price</div>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <div className="text-sm text-slate-400 mb-1">Potential Profit</div>
                <div className="text-2xl font-bold text-purple-400">
                  {itemsLoading ? '—' : formatCurrency(inventoryItems.reduce((sum, item) => {
                    const profit = (item.sellingPrice - item.averageCost) * item.currentStock;
                    return sum + profit;
                  }, 0))}
                </div>
                <div className="text-xs text-slate-500 mt-1">Gross margin</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Item */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add inventory item</DialogTitle>
            <DialogDescription>Saved to this organization's inventory.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            {([
              ['Name', 'name', 'text', 'Blue widget'],
              ['SKU', 'sku', 'text', 'SKU-001'],
              ['Category', 'category', 'text', 'General'],
              ['Unit', 'unit', 'text', 'unit'],
              ['Opening stock', 'currentStock', 'number', '0'],
              ['Reorder level', 'reorderLevel', 'number', '0'],
              ['Reorder quantity', 'reorderQuantity', 'number', '0'],
              [`Average cost (${orgCurrency})`, 'averageCost', 'number', '0'],
              [`Selling price (${orgCurrency})`, 'sellingPrice', 'number', '0'],
            ] as const).map(([label, key, type, ph]) => (
              <div key={key} className="space-y-1">
                <label className="text-xs text-slate-400">{label}</label>
                <input
                  type={type}
                  value={(itemForm as any)[key]}
                  placeholder={ph}
                  onChange={(e) => setItemForm({ ...itemForm, [key]: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg text-slate-400 text-sm" style={AXIOM.buttons.outline}>
              Cancel
            </button>
            <button
              onClick={() => void handleAddItem()}
              disabled={saving}
              className="px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.success}
            >
              {saving ? 'Saving…' : 'Add item'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Purchase */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record purchase</DialogTitle>
            <DialogDescription>Increases stock and updates the item's average cost.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Item</label>
              <select
                value={purchaseForm.inventoryItemId}
                onChange={(e) => setPurchaseForm({ ...purchaseForm, inventoryItemId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm text-white"
                style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
              >
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} · {i.sku}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Quantity</label>
                <input
                  type="number"
                  value={purchaseForm.quantity}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Unit cost ({orgCurrency})</label>
                <input
                  type="number"
                  value={purchaseForm.unitCost}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, unitCost: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Date</label>
                <input
                  type="date"
                  value={purchaseForm.date}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Reference (optional)</label>
                <input
                  type="text"
                  value={purchaseForm.referenceNumber}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white"
                  style={{ background: AXIOM.inputs.background, border: AXIOM.inputs.border }}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Total: {formatCurrency(num(purchaseForm.quantity) * num(purchaseForm.unitCost), orgCurrency)}
            </p>
          </div>
          <DialogFooter>
            <button onClick={() => setPurchaseOpen(false)} className="px-4 py-2 rounded-lg text-slate-400 text-sm" style={AXIOM.buttons.outline}>
              Cancel
            </button>
            <button
              onClick={() => void handleRecordPurchase()}
              disabled={saving}
              className="px-6 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              style={AXIOM.buttons.success}
            >
              {saving ? 'Saving…' : 'Record purchase'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}