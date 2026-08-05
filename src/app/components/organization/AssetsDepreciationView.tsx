import { useState } from 'react';
import { motion } from 'motion/react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray } from '@/hooks/useService';
import { dataStore } from '@/services/dataStore';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  Building2,
  Laptop,
  Car,
  Package,
  TrendingDown,
  Plus,
  Search,
  Calendar,
  DollarSign,
  BarChart3,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { AXIOM } from '../../../styles/axiom-tokens';

type AssetView = 'register' | 'depreciation' | 'analytics';

export function AssetsDepreciationView() {
  const [activeView, setActiveView] = useState<AssetView>('register');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const svc = useOrgServices();

  // Fetch assets via service layer
  const { data: assets, loading: assetsLoading } = useServiceArray(
    () => svc.assets.getAll(),
    [svc.orgId]
  );

  // Fetch asset summary (totalCurrentValue, totalPurchaseValue, totalDepreciation, totalAssets)
  const { data: assetSummaryRaw } = useService(
    () => svc.assets.getSummary(),
    [svc.orgId]
  );

  // Depreciation schedules — org-level query direct to dataStore
  // MIGRATION NOTE: Replace with API call when backend is ready
  const { data: depSchedule } = useServiceArray(
    () => Promise.resolve({
      success: true as const,
      data: dataStore.depreciationSchedules.filter(d => d.organizationId === svc.orgId),
    }),
    [svc.orgId]
  );

  // Normalise summary field names to match previous API surface
  const assetSummary = {
    totalAssets: assetSummaryRaw?.totalAssets ?? 0,
    totalValue: assetSummaryRaw?.totalCurrentValue ?? 0,
    totalPurchasePrice: assetSummaryRaw?.totalPurchaseValue ?? 0,
    totalDepreciation: assetSummaryRaw?.totalDepreciation ?? 0,
  };

  const categories = [
    { id: 'all', label: 'All Assets', icon: Package, color: 'cyan' },
    { id: 'equipment', label: 'Equipment', icon: Laptop, color: 'blue' },
    { id: 'vehicle', label: 'Vehicles', icon: Car, color: 'purple' },
    { id: 'furniture', label: 'Furniture', icon: Building2, color: 'green' },
    { id: 'property', label: 'Property', icon: Building2, color: 'orange' },
  ];

  const filteredAssets = assets.filter(asset => {
    const q = searchQuery.toLowerCase();
    const name = (asset.name ?? '').toLowerCase();
    const code = (asset.assetCode ?? '').toLowerCase();
    const matchesSearch = !q || name.includes(q) || code.includes(q);
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || asset.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const avgDepreciationPct =
    assetSummary.totalPurchasePrice > 0
      ? ((assetSummary.totalDepreciation / assetSummary.totalPurchasePrice) * 100).toFixed(1)
      : null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'equipment': return Laptop;
      case 'vehicle': return Car;
      case 'furniture': return Building2;
      case 'property': return Building2;
      default: return Package;
    }
  };

  const getCategoryColor = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return { bg: AXIOM.iconBoxes.cyan, shadow: AXIOM.shadows.iconCyan };
    
    switch (cat.color) {
      case 'blue': return { bg: AXIOM.iconBoxes.blue, shadow: AXIOM.shadows.iconBlue };
      case 'purple': return { bg: AXIOM.iconBoxes.purple, shadow: AXIOM.shadows.iconPurple };
      case 'green': return { bg: AXIOM.iconBoxes.green, shadow: AXIOM.shadows.iconGreen };
      case 'orange': return { bg: 'linear-gradient(135deg, rgba(251, 146, 60, 0.3), rgba(249, 115, 22, 0.3))', shadow: '0 10px 30px -10px rgba(251, 146, 60, 0.6)' };
      default: return { bg: AXIOM.iconBoxes.cyan, shadow: AXIOM.shadows.iconCyan };
    }
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
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Package className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Assets & Depreciation
              </h1>
              <p className="text-slate-400 text-sm">Manage fixed assets and depreciation schedules</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
              border: '1px solid rgba(6, 182, 212, 0.5)',
              boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
              color: '#ffffff',
            }}
          >
            <Plus className="size-4" />
            Add Asset
          </motion.button>
        </div>
      </motion.div>

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
              <p className="text-slate-400 text-sm mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-white">{assetSummary.totalAssets}</p>
              <p className="text-xs text-cyan-400 mt-1">Active assets</p>
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
              <p className="text-slate-400 text-sm mb-1">Current Value</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(assetSummary.totalValue)}</p>
              <p className="text-xs text-blue-400 mt-1">Net book value</p>
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
              <p className="text-slate-400 text-sm mb-1">Purchase Cost</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(assetSummary.totalPurchasePrice)}</p>
              <p className="text-xs text-purple-400 mt-1">Original cost</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <BarChart3 className="size-6 text-white" />
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
              <p className="text-slate-400 text-sm mb-1">Depreciation</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(assetSummary.totalDepreciation)}</p>
              <p className="text-xs text-orange-400 mt-1">Accumulated</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.3), rgba(249, 115, 22, 0.3))',
                boxShadow: '0 10px 30px -10px rgba(251, 146, 60, 0.6)',
              }}
            >
              <TrendingDown className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* View Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-2 p-1 rounded-2xl"
        style={AXIOM.containers.list}
      >
        {[
          { id: 'register' as AssetView, label: 'Asset Register', icon: Package },
          { id: 'depreciation' as AssetView, label: 'Depreciation Schedule', icon: Calendar },
          { id: 'analytics' as AssetView, label: 'Analytics', icon: BarChart3 },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium rounded-xl transition-all relative"
              style={isActive ? AXIOM.buttons.primary : { background: 'transparent', color: '#94a3b8' }}
            >
              <Icon className="size-4" />
              {tab.label}
            </motion.button>
          );
        })}
      </motion.div>

      {/* Content Area */}
      {activeView === 'register' && (
        <div className="space-y-4">
          {/* Filters and Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex gap-4"
          >
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl text-white placeholder-slate-500"
                style={{
                  background: AXIOM.inputs.background,
                  border: AXIOM.inputs.border,
                }}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <motion.button
                    key={cat.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                    className="px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-all"
                    style={isSelected ? AXIOM.buttons.primary : AXIOM.buttons.secondary}
                  >
                    <Icon className="size-4" />
                    {cat.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Assets Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl overflow-hidden"
            style={AXIOM.containers.list}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'rgba(148, 163, 184, 0.05)' }}>
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Asset</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Code</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Category</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Purchase Date</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Purchase Price</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Current Value</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Depreciation</th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assetsLoading && assets.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                        Loading assets…
                      </td>
                    </tr>
                  )}
                  {!assetsLoading && filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-slate-400 text-sm">
                        {assets.length === 0
                          ? 'No assets yet. Add one when you are ready.'
                          : 'No assets match your filters.'}
                      </td>
                    </tr>
                  )}
                  {filteredAssets.map((asset, index) => {
                    const Icon = getCategoryIcon(asset.category);
                    const iconStyle = getCategoryColor(asset.category);
                    return (
                      <motion.tr
                        key={asset.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + index * 0.03 }}
                        className="group"
                        style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ background: iconStyle.bg, boxShadow: iconStyle.shadow }}
                            >
                              <Icon className="size-5 text-white" />
                            </div>
                            <div>
                              <div className="text-white font-medium">{asset.name}</div>
                              {asset.locationDetails && (
                                <div className="text-xs text-slate-500">{asset.locationDetails}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-300 font-mono text-sm">{asset.assetCode}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400 capitalize">{asset.category}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-slate-400">{formatDate(asset.purchaseDate)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-white font-medium">{formatCurrency(asset.purchasePrice)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-cyan-400 font-medium">{formatCurrency(asset.currentValue)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-orange-400 font-medium">{formatCurrency(asset.accumulatedDepreciation)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span 
                            className="inline-flex px-3 py-1 rounded-lg text-xs font-medium"
                            style={
                              asset.status === 'active' ? AXIOM.badges.success :
                              asset.status === 'disposed' ? AXIOM.badges.danger :
                              { background: 'rgba(251, 146, 60, 0.1)', color: '#fb923c', border: '1px solid rgba(251, 146, 60, 0.3)' }
                            }
                          >
                            {(asset.status ?? 'active').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg"
                              style={{ background: 'rgba(6, 182, 212, 0.1)' }}
                            >
                              <Eye className="size-4 text-cyan-400" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg"
                              style={{ background: 'rgba(59, 130, 246, 0.1)' }}
                            >
                              <Edit className="size-4 text-blue-400" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-lg"
                              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                            >
                              <Trash2 className="size-4 text-red-400" />
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      )}

      {activeView === 'depreciation' && (
        <div className="space-y-4">
          {/* Depreciation Schedule Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl overflow-hidden"
            style={AXIOM.containers.list}
          >
            <div className="p-6" style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
              <h3 className="text-lg font-semibold text-white">Monthly Depreciation Schedule</h3>
              <p className="text-sm text-slate-400 mt-1">Review and manage depreciation entries</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ background: 'rgba(148, 163, 184, 0.05)' }}>
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Period</th>
                    <th className="text-left px-6 py-4 text-xs font-medium text-slate-400 uppercase">Asset</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Opening Value</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Depreciation</th>
                    <th className="text-right px-6 py-4 text-xs font-medium text-slate-400 uppercase">Closing Value</th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="text-center px-6 py-4 text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {depSchedule.map((schedule, index) => {
                    const asset = assets.find(a => a.id === schedule.assetId);
                    return (
                      <motion.tr
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.03 }}
                        style={{ borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}
                      >
                        <td className="px-6 py-4">
                          <span className="text-white font-mono">{schedule.period}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-white">{asset?.name || 'Unknown Asset'}</div>
                          <div className="text-xs text-slate-500">{asset?.assetCode}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-slate-300">{formatCurrency(schedule.openingValue ?? 0)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-orange-400 font-medium">{formatCurrency(schedule.depreciationAmount ?? 0)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-cyan-400 font-medium">{formatCurrency(schedule.closingValue ?? 0)}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span 
                            className="inline-flex px-3 py-1 rounded-lg text-xs font-medium"
                            style={
                              schedule.status === 'posted' ? AXIOM.badges.success :
                              schedule.status === 'scheduled' ? AXIOM.badges.info :
                              AXIOM.badges.danger
                            }
                          >
                            {schedule.status ?? '—'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6, 182, 212, 0.3)' }}
                          >
                            {schedule.status === 'scheduled' ? 'Post Entry' : 'View Entry'}
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })}
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
            transition={{ delay: 0.35 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartBlue}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Asset Distribution by Category</h3>
            <div className="space-y-3">
              {categories.filter(c => c.id !== 'all').map((cat) => {
                const count = assets.filter(a => a.category === cat.id).length;
                const percentage = (count / assets.length) * 100;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400 capitalize">{cat.label}</span>
                      <span className="text-sm text-white font-medium">{count} assets</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(148, 163, 184, 0.1)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full"
                        style={{
                          background: cat.color === 'cyan' ? 'linear-gradient(90deg, #06b6d4, #0891b2)' :
                                     cat.color === 'blue' ? 'linear-gradient(90deg, #3b82f6, #2563eb)' :
                                     cat.color === 'purple' ? 'linear-gradient(90deg, #a855f7, #9333ea)' :
                                     cat.color === 'green' ? 'linear-gradient(90deg, #10b981, #059669)' :
                                     'linear-gradient(90deg, #fb923c, #f97316)'
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
            transition={{ delay: 0.4 }}
            className="p-6 rounded-2xl"
            style={AXIOM.containers.chartBlue}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Depreciation Summary</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <div className="text-sm text-slate-400 mb-1">Total Depreciation (YTD)</div>
                <div className="text-2xl font-bold text-orange-400">{formatCurrency(assetSummary.totalDepreciation)}</div>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <div className="text-sm text-slate-400 mb-1">Average Depreciation Rate</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {avgDepreciationPct === null ? '—' : `${avgDepreciationPct}%`}
                </div>
              </div>
              <div className="p-4 rounded-xl" style={AXIOM.containers.item}>
                <div className="text-sm text-slate-400 mb-1">Net Book Value</div>
                <div className="text-2xl font-bold text-emerald-400">{formatCurrency(assetSummary.totalValue)}</div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}