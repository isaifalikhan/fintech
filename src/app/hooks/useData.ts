import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, transactionsApi, reportsApi, analyticsApi } from '../services/api';

// Generic hook for API calls with loading states
export function useApi<T>(
  apiCall: () => Promise<{ data: T; status: number }>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall();
      setData(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Dashboard hooks
export function useDashboardStats(dateRange: string = '30d') {
  return useApi(() => dashboardApi.getStats(dateRange), [dateRange]);
}

export function useCashFlow(months: number = 6) {
  return useApi(() => dashboardApi.getCashFlow(months), [months]);
}

// Transactions hooks
export function useTransactions(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  status?: string;
} = {}) {
  return useApi(() => transactionsApi.getAll(params), [
    params.page,
    params.pageSize,
    params.search,
    params.category,
    params.status
  ]);
}

export function useTransaction(id: number) {
  return useApi(() => transactionsApi.getById(id), [id]);
}

// Mutation hook for creating/updating/deleting
export function useTransactionMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTransaction = async (data: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.create(data);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTransaction = async (id: number, updates: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.update(id, updates);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await transactionsApi.delete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkCategorize = async (ids: number[], category: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.bulkCategorize(ids, category);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to categorize transactions');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async (ids: number[]) => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionsApi.bulkDelete(ids);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transactions');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTransaction,
    updateTransaction,
    deleteTransaction,
    bulkCategorize,
    bulkDelete,
    loading,
    error
  };
}

// Reports hooks
export function useProfitLoss(dateRange: string = 'ytd') {
  return useApi(() => reportsApi.getProfitLoss(dateRange), [dateRange]);
}

export function useReportExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportReport = async (reportType: string, format: 'pdf' | 'csv' | 'excel') => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsApi.export(reportType, format);
      
      // Trigger download
      const link = document.createElement('a');
      link.href = response.data.downloadUrl;
      link.download = `${reportType}-${Date.now()}.${format}`;
      link.click();
      
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { exportReport, loading, error };
}

// Analytics hooks
export function useForecast(months: number = 3) {
  return useApi(() => analyticsApi.getForecast(months), [months]);
}

export function useCohortAnalysis() {
  return useApi(() => analyticsApi.getCohortAnalysis(), []);
}

// Local storage hook for caching
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  const removeValue = () => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, removeValue] as const;
}

// Debounce hook for search inputs
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Pagination hook
export function usePagination(totalItems: number, itemsPerPage: number = 10) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    startIndex,
    endIndex,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
}

// Filter hook
export function useFilters<T extends Record<string, any>>(initialFilters: T) {
  const [filters, setFilters] = useState<T>(initialFilters);

  const updateFilter = useCallback((key: keyof T, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const updateFilters = useCallback((updates: Partial<T>) => {
    setFilters(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const clearFilter = useCallback((key: keyof T) => {
    setFilters(prev => ({ ...prev, [key]: initialFilters[key] }));
  }, [initialFilters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter
  };
}

// Selection hook for multi-select
export function useSelection<T extends { id: any }>(items: T[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<any>>(new Set());

  const toggleItem = useCallback((id: any) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: any) => selectedIds.has(id), [selectedIds]);

  const selectedItems = items.filter(item => selectedIds.has(item.id));
  const allSelected = items.length > 0 && selectedIds.size === items.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedItems,
    toggleItem,
    selectAll,
    clearSelection,
    isSelected,
    allSelected,
    someSelected,
    count: selectedIds.size
  };
}
