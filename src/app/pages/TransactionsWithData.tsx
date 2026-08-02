import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Upload, Download, Filter, AlertCircle, TrendingUp, DollarSign, Eye, Edit, Trash2, Check } from 'lucide-react';
import { ModernTable, Column, TableAction } from '../components/table/ModernTable';
import { BulkActionsBar } from '../components/bulk-actions/BulkActionsBar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { PremiumStatCard } from '../components/widgets/DataWidgets';
import { SkeletonStatsGrid, SkeletonTable, ContentLoader } from '../components/loading/LoadingStates';
import { useTransactions, useTransactionMutation, useDebounce, useFilters, useSelection } from '../hooks/useData';
import { toast } from 'sonner';

export function TransactionsWithData() {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Filters
  const { filters, updateFilter, resetFilters } = useFilters({
    page: 1,
    pageSize: 10,
    search: '',
    category: '',
    status: ''
  });

  // Update search in filters when debounced
  useEffect(() => {
    updateFilter('search', debouncedSearch);
  }, [debouncedSearch, updateFilter]);

  // Fetch transactions
  const { data: response, loading, error, refetch } = useTransactions(filters);
  const transactions = response?.data || [];
  const pagination = response?.pagination;

  // Selection
  const selection = useSelection(transactions);

  // Mutations
  const {
    deleteTransaction,
    bulkCategorize,
    bulkDelete,
    loading: mutationLoading
  } = useTransactionMutation();

  // Table configuration
  const columns: Column[] = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      width: '120px',
      render: (value) => (
        <span className="text-slate-300 text-sm">
          {new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )
    },
    {
      key: 'description',
      label: 'Description',
      sortable: true,
      render: (value, row: any) => (
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            row.type === 'income'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}>
            {row.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">{value}</p>
            <p className="text-slate-500 text-xs">{row.account}</p>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      width: '180px',
      render: (value) => (
        <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">
          {value}
        </span>
      )
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      align: 'right',
      width: '140px',
      render: (value, row: any) => (
        <span className={`font-semibold ${
          row.type === 'income' ? 'text-green-400' : 'text-red-400'
        }`}>
          {row.type === 'income' ? '+' : '-'}${Math.abs(value).toLocaleString()}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      width: '120px',
      render: (value) => {
        const config: Record<string, any> = {
          completed: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
          pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
          scheduled: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' }
        };
        const c = config[value] || config.completed;
        
        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 ${c.bg} ${c.text} text-xs rounded border ${c.border}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      }
    }
  ];

  // Table actions
  const tableActions: TableAction[] = [
    {
      label: 'View Details',
      icon: Eye,
      onClick: (row) => toast.info(`Viewing transaction ${row.id}`)
    },
    {
      label: 'Edit',
      icon: Edit,
      onClick: (row) => toast.info(`Editing transaction ${row.id}`)
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: async (row) => {
        try {
          await deleteTransaction(row.id);
          toast.success('Transaction deleted successfully');
          refetch();
        } catch (err) {
          toast.error('Failed to delete transaction');
        }
      },
      variant: 'destructive'
    }
  ];

  // Bulk actions
  const handleBulkCategorize = async () => {
    try {
      const ids = selection.selectedItems.map(t => t.id);
      await bulkCategorize(ids, 'Office Expenses');
      toast.success(`${ids.length} transactions categorized`);
      selection.clearSelection();
      refetch();
    } catch (err) {
      toast.error('Failed to categorize transactions');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const ids = selection.selectedItems.map(t => t.id);
      await bulkDelete(ids);
      toast.success(`${ids.length} transactions deleted`);
      selection.clearSelection();
      refetch();
    } catch (err) {
      toast.error('Failed to delete transactions');
    }
  };

  // Calculate stats
  const stats = {
    totalIncome: transactions
      .filter((t: any) => t.type === 'income' && t.status === 'completed')
      .reduce((sum: number, t: any) => sum + t.amount, 0),
    totalExpenses: transactions
      .filter((t: any) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0),
    needsReview: transactions.filter((t: any) => t.needsReview).length
  };

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 flex items-center justify-center">
        <Card className="bg-slate-900 border-red-500/20 max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">Error Loading Transactions</h3>
            <p className="text-slate-400 text-sm mb-4">{error}</p>
            <Button onClick={refetch} className="bg-blue-500 hover:bg-blue-600 text-white">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
          <p className="text-slate-400">Real-time transaction data with API integration</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-white"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 text-white"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>

          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <SkeletonStatsGrid count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <PremiumStatCard
            title="Total Income"
            value={stats.totalIncome}
            change={12.5}
            icon={TrendingUp}
            gradient="from-green-500 to-emerald-500"
            prefix="$"
          />
          
          <PremiumStatCard
            title="Total Expenses"
            value={stats.totalExpenses}
            change={-3.2}
            icon={DollarSign}
            gradient="from-red-500 to-pink-500"
            prefix="$"
          />

          <PremiumStatCard
            title="Net Cash Flow"
            value={stats.totalIncome - stats.totalExpenses}
            change={8.7}
            icon={TrendingUp}
            gradient="from-blue-500 to-cyan-500"
            prefix="$"
          />

          <Card className="bg-slate-900 border-white/10">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Needs Review</p>
                  <h3 className="text-3xl font-bold text-amber-400 mt-2">{stats.needsReview}</h3>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
              <Button className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20">
                Review Now
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions Table */}
      {loading ? (
        <SkeletonTable rows={10} columns={5} />
      ) : (
        <>
          {/* Search Bar */}
          <Card className="bg-slate-900 border-white/10">
            <CardContent className="p-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </CardContent>
          </Card>

          {/* Table */}
          <ModernTable
            columns={columns}
            data={transactions}
            actions={tableActions}
            selectable
            onSelectionChange={(selected) => {
              // Sync with selection hook
              selected.forEach(item => {
                if (!selection.isSelected(item.id)) {
                  selection.toggleItem(item.id);
                }
              });
            }}
            hoverable
            rowsPerPage={filters.pageSize}
          />

          {/* Pagination Info */}
          {pagination && (
            <Card className="bg-slate-900 border-white/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>
                    Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                    {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                    {pagination.total} transactions
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateFilter('page', filters.page - 1)}
                      disabled={filters.page === 1}
                      className="border-white/10 hover:bg-white/5 text-white"
                    >
                      Previous
                    </Button>
                    <span className="text-white px-3">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateFilter('page', filters.page + 1)}
                      disabled={filters.page === pagination.totalPages}
                      className="border-white/10 hover:bg-white/5 text-white"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selection.count}
        totalCount={transactions.length}
        onClearSelection={selection.clearSelection}
        onSelectAll={selection.selectAll}
        onCategorize={handleBulkCategorize}
        onDelete={handleBulkDelete}
        customActions={[
          {
            label: 'Mark as Reviewed',
            icon: Check,
            onClick: () => toast.info(`Marked ${selection.count} as reviewed`)
          }
        ]}
      />

      {/* Loading Overlay */}
      {mutationLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <ContentLoader title="Processing..." subtitle="Please wait" />
        </div>
      )}
    </div>
  );
}
