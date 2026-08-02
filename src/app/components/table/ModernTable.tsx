import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Search,
  Filter,
  Download
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export interface Column<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableAction<T = any> {
  label: string;
  icon: any;
  onClick: (row: T) => void;
  variant?: 'default' | 'destructive';
}

interface ModernTableProps<T = any> {
  columns: Column<T>[];
  data: T[];
  actions?: TableAction<T>[];
  selectable?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  rowsPerPage?: number;
  hoverable?: boolean;
  striped?: boolean;
}

export function ModernTable<T extends { id: string | number }>({
  columns,
  data,
  actions,
  selectable = false,
  onSelectionChange,
  searchable = false,
  filterable = false,
  exportable = false,
  rowsPerPage = 10,
  hoverable = true,
  striped = false
}: ModernTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | number | null>(null);

  // Sorting
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aVal = (a as any)[sortColumn];
    const bVal = (b as any)[sortColumn];
    
    if (aVal === bVal) return 0;
    
    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedData = sortedData.slice(startIndex, startIndex + rowsPerPage);

  // Selection
  const toggleRowSelection = (id: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(data.filter(row => newSelected.has(row.id)));
  };

  const toggleAllRows = () => {
    if (selectedRows.size === data.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(data.map(row => row.id));
      setSelectedRows(allIds);
      onSelectionChange?.(data);
    }
  };

  const allSelected = selectedRows.size === data.length && data.length > 0;
  const someSelected = selectedRows.size > 0 && selectedRows.size < data.length;

  return (
    <Card className="bg-slate-900 border-white/10 overflow-hidden">
      <CardContent className="p-0">
        {/* Toolbar */}
        {(searchable || filterable || exportable || selectedRows.size > 0) && (
          <div className="p-4 border-b border-white/10 bg-slate-950">
            <div className="flex items-center justify-between gap-4">
              {/* Search */}
              {searchable && (
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                {selectedRows.size > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <span className="text-sm text-blue-400 font-medium">
                      {selectedRows.size} selected
                    </span>
                  </div>
                )}
                {filterable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                )}
                {exportable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-white/10 hover:bg-white/5 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-slate-950 border-b border-white/10">
              <tr>
                {selectable && (
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={toggleAllRows}
                      className="w-4 h-4 rounded border-2 border-white/20 bg-slate-800 checked:bg-blue-500 checked:border-blue-500 cursor-pointer"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-${column.align || 'left'}`}
                    style={{ width: column.width }}
                  >
                    {column.sortable ? (
                      <button
                        onClick={() => handleSort(column.key)}
                        className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider hover:text-white transition-colors"
                      >
                        {column.label}
                        {sortColumn === column.key ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-4 h-4 opacity-50" />
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                        {column.label}
                      </span>
                    )}
                  </th>
                ))}
                {actions && actions.length > 0 && (
                  <th className="w-12 px-4 py-3">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                      Actions
                    </span>
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              <AnimatePresence mode="popLayout">
                {paginatedData.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`border-b border-white/5 ${
                      hoverable ? 'hover:bg-white/5' : ''
                    } ${striped && index % 2 === 1 ? 'bg-white/[0.02]' : ''} ${
                      selectedRows.has(row.id) ? 'bg-blue-500/10' : ''
                    } transition-colors`}
                  >
                    {selectable && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={() => toggleRowSelection(row.id)}
                          className="w-4 h-4 rounded border-2 border-white/20 bg-slate-800 checked:bg-blue-500 checked:border-blue-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`px-4 py-3 text-${column.align || 'left'} text-sm`}
                      >
                        {column.render ? (
                          column.render((row as any)[column.key], row)
                        ) : (
                          <span className="text-white">
                            {(row as any)[column.key]}
                          </span>
                        )}
                      </td>
                    ))}
                    {actions && actions.length > 0 && (
                      <td className="px-4 py-3">
                        <TableRowActions row={row} actions={actions} />
                      </td>
                    )}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {/* Empty State */}
          {data.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No data available</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 bg-slate-950">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-400">
                Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, data.length)} of{' '}
                {data.length} results
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="border-white/10 hover:bg-white/5 text-white disabled:opacity-50"
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? 'default' : 'outline'}
                    onClick={() => setCurrentPage(page)}
                    className={
                      currentPage === page
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'border-white/10 hover:bg-white/5 text-white'
                    }
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="border-white/10 hover:bg-white/5 text-white disabled:opacity-50"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Row Actions Component
function TableRowActions<T>({
  row,
  actions
}: {
  row: T;
  actions: TableAction<T>[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-slate-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute right-0 mt-1 w-48 bg-slate-900 border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick(row);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      action.variant === 'destructive'
                        ? 'hover:bg-red-500/10 text-red-400'
                        : 'hover:bg-white/5 text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Sample table data
export const SAMPLE_TABLE_DATA = [
  {
    id: 1,
    transaction: 'AWS Invoice',
    date: '2024-01-15',
    amount: -450,
    category: 'Cloud Infrastructure',
    status: 'completed'
  },
  {
    id: 2,
    transaction: 'Client Payment - ABC Corp',
    date: '2024-01-14',
    amount: 5000,
    category: 'Revenue',
    status: 'completed'
  },
  {
    id: 3,
    transaction: 'Office Rent',
    date: '2024-01-10',
    amount: -2000,
    category: 'Office Expenses',
    status: 'pending'
  }
];
