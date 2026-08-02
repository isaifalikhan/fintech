// API Service Layer - Mock implementation with realistic patterns

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock data store
const mockStore = {
  transactions: [] as any[],
  categories: [] as any[],
  clients: [] as any[],
  dashboardStats: null as any
};

/**
 * Dashboard API
 */
export const dashboardApi = {
  async getStats(dateRange: string = '30d'): Promise<ApiResponse<any>> {
    await delay(800);
    
    return {
      data: {
        revenue: {
          current: 178000,
          previous: 158000,
          change: 12.7,
          sparkline: [125, 142, 138, 165, 158, 178]
        },
        profit: {
          current: 70000,
          previous: 60000,
          change: 16.7,
          sparkline: [36, 47, 46, 63, 60, 70]
        },
        clients: {
          current: 48,
          previous: 44,
          change: 9.1
        },
        profitMargin: {
          current: 39.3,
          previous: 38.0,
          change: 3.4
        }
      },
      status: 200
    };
  },

  async getCashFlow(months: number = 6): Promise<ApiResponse<any[]>> {
    await delay(600);
    
    return {
      data: [
        { name: 'Jan', inflow: 125000, outflow: 89000, net: 36000 },
        { name: 'Feb', inflow: 142000, outflow: 95000, net: 47000 },
        { name: 'Mar', inflow: 138000, outflow: 92000, net: 46000 },
        { name: 'Apr', inflow: 165000, outflow: 102000, net: 63000 },
        { name: 'May', inflow: 158000, outflow: 98000, net: 60000 },
        { name: 'Jun', inflow: 178000, outflow: 108000, net: 70000 }
      ].slice(0, months),
      status: 200
    };
  }
};

/**
 * Transactions API
 */
export const transactionsApi = {
  async getAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
  } = {}): Promise<ApiResponse<PaginatedResponse<any>>> {
    await delay(500);

    const { page = 1, pageSize = 10, search, category, status } = params;

    // Mock transactions
    let transactions = [
      {
        id: 1,
        date: '2024-01-28',
        description: 'Client Payment - ABC Corp Project',
        category: 'Revenue',
        amount: 15000,
        type: 'income',
        status: 'completed',
        account: 'HBL Current',
        confidence: 98
      },
      {
        id: 2,
        date: '2024-01-27',
        description: 'AWS Monthly Invoice',
        category: 'Cloud Infrastructure',
        amount: -1250,
        type: 'expense',
        status: 'completed',
        account: 'HBL Current',
        confidence: 95
      },
      {
        id: 3,
        date: '2024-01-27',
        description: 'Salary - Engineering Team',
        category: 'Salaries',
        amount: -45000,
        type: 'expense',
        status: 'completed',
        account: 'HBL Payroll',
        confidence: 100
      },
      // Add more mock data...
    ];

    // Apply filters
    if (search) {
      transactions = transactions.filter(t =>
        t.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category) {
      transactions = transactions.filter(t => t.category === category);
    }

    if (status) {
      transactions = transactions.filter(t => t.status === status);
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginatedData = transactions.slice(start, end);

    return {
      data: {
        data: paginatedData,
        pagination: {
          page,
          pageSize,
          total: transactions.length,
          totalPages: Math.ceil(transactions.length / pageSize)
        }
      },
      status: 200
    };
  },

  async getById(id: number): Promise<ApiResponse<any>> {
    await delay(300);
    
    return {
      data: {
        id,
        date: '2024-01-28',
        description: 'Client Payment - ABC Corp Project',
        category: 'Revenue',
        amount: 15000,
        type: 'income',
        status: 'completed',
        account: 'HBL Current',
        confidence: 98,
        metadata: {
          clientId: 123,
          projectId: 456,
          invoiceNumber: 'INV-2024-001'
        }
      },
      status: 200
    };
  },

  async create(transaction: any): Promise<ApiResponse<any>> {
    await delay(600);
    
    const newTransaction = {
      id: Date.now(),
      ...transaction,
      createdAt: new Date().toISOString()
    };

    return {
      data: newTransaction,
      status: 201,
      message: 'Transaction created successfully'
    };
  },

  async update(id: number, updates: any): Promise<ApiResponse<any>> {
    await delay(500);
    
    return {
      data: { id, ...updates, updatedAt: new Date().toISOString() },
      status: 200,
      message: 'Transaction updated successfully'
    };
  },

  async delete(id: number): Promise<ApiResponse<null>> {
    await delay(400);
    
    return {
      data: null,
      status: 200,
      message: 'Transaction deleted successfully'
    };
  },

  async bulkCategorize(ids: number[], category: string): Promise<ApiResponse<any>> {
    await delay(1000);
    
    return {
      data: { updated: ids.length },
      status: 200,
      message: `${ids.length} transactions categorized as ${category}`
    };
  },

  async bulkDelete(ids: number[]): Promise<ApiResponse<any>> {
    await delay(800);
    
    return {
      data: { deleted: ids.length },
      status: 200,
      message: `${ids.length} transactions deleted`
    };
  }
};

/**
 * AI Categorization API
 */
export const aiApi = {
  async categorizeTransaction(narration: string): Promise<ApiResponse<{
    category: string;
    confidence: number;
    alternatives: Array<{ category: string; confidence: number }>;
  }>> {
    await delay(400);

    // Mock AI categorization logic
    const categories: Record<string, { category: string; keywords: string[] }> = {
      'Cloud Infrastructure': { category: 'Cloud Infrastructure', keywords: ['aws', 'azure', 'google cloud', 'digitalocean'] },
      'Marketing': { category: 'Marketing', keywords: ['facebook', 'google ads', 'linkedin', 'marketing'] },
      'Salaries': { category: 'Salaries', keywords: ['salary', 'payroll', 'wages'] },
      'Office Expenses': { category: 'Office Expenses', keywords: ['office', 'supplies', 'rent', 'utilities'] },
      'Software & Tools': { category: 'Software & Tools', keywords: ['slack', 'zoom', 'github', 'software'] }
    };

    let bestMatch = { category: 'Uncategorized', confidence: 0 };
    const alternatives: Array<{ category: string; confidence: number }> = [];

    const lowerNarration = narration.toLowerCase();

    for (const [cat, data] of Object.entries(categories)) {
      const matches = data.keywords.filter(kw => lowerNarration.includes(kw)).length;
      const confidence = Math.min(95, 60 + matches * 15);

      if (matches > 0) {
        if (confidence > bestMatch.confidence) {
          if (bestMatch.confidence > 0) {
            alternatives.push(bestMatch);
          }
          bestMatch = { category: cat, confidence };
        } else {
          alternatives.push({ category: cat, confidence });
        }
      }
    }

    return {
      data: {
        category: bestMatch.category,
        confidence: bestMatch.confidence,
        alternatives: alternatives.slice(0, 2)
      },
      status: 200
    };
  },

  async trainModel(corrections: Array<{ narration: string; correctCategory: string }>): Promise<ApiResponse<any>> {
    await delay(2000);
    
    return {
      data: {
        modelVersion: '1.2.3',
        accuracy: 94.2,
        trainingExamples: corrections.length
      },
      status: 200,
      message: 'Model retrained successfully'
    };
  }
};

/**
 * Reports API
 */
export const reportsApi = {
  async getProfitLoss(dateRange: string): Promise<ApiResponse<any>> {
    await delay(1000);
    
    return {
      data: {
        revenue: 906000,
        cogs: 319000,
        grossProfit: 587000,
        operatingExpenses: 265000,
        netProfit: 322000,
        margins: {
          gross: 64.8,
          operating: 35.5,
          net: 35.5
        },
        breakdown: [
          { name: 'Jan', revenue: 125000, cogs: 45000, opex: 44000, netProfit: 36000 },
          { name: 'Feb', revenue: 142000, cogs: 52000, opex: 43000, netProfit: 47000 },
          { name: 'Mar', revenue: 138000, cogs: 48000, opex: 44000, netProfit: 46000 },
          { name: 'Apr', revenue: 165000, cogs: 58000, opex: 44000, netProfit: 63000 },
          { name: 'May', revenue: 158000, cogs: 54000, opex: 44000, netProfit: 60000 },
          { name: 'Jun', revenue: 178000, cogs: 62000, opex: 46000, netProfit: 70000 }
        ]
      },
      status: 200
    };
  },

  async export(reportType: string, format: 'pdf' | 'csv' | 'excel'): Promise<ApiResponse<{ downloadUrl: string }>> {
    await delay(2000);
    
    return {
      data: {
        downloadUrl: `/api/downloads/report-${Date.now()}.${format}`
      },
      status: 200,
      message: 'Report generated successfully'
    };
  }
};

/**
 * Analytics API
 */
export const analyticsApi = {
  async getForecast(months: number = 3): Promise<ApiResponse<any[]>> {
    await delay(1200);
    
    const baseData = [
      { name: 'Jan', actual: 125000 },
      { name: 'Feb', actual: 142000 },
      { name: 'Mar', actual: 138000 },
      { name: 'Apr', actual: 165000 },
      { name: 'May', actual: 158000 },
      { name: 'Jun', actual: 178000 }
    ];

    const forecastMonths = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastValue = 178000;

    const forecast = forecastMonths.slice(0, months).map((name) => {
      lastValue = lastValue * (1 + (Math.random() * 0.1 - 0.02)); // 2-8% growth
      return {
        name,
        forecast: Math.round(lastValue),
        lower: Math.round(lastValue * 0.9),
        upper: Math.round(lastValue * 1.1)
      };
    });

    return {
      data: [...baseData, ...forecast],
      status: 200
    };
  },

  async getCohortAnalysis(): Promise<ApiResponse<any>> {
    await delay(1000);
    
    return {
      data: {
        cohorts: [
          { name: 'Jan', month1: 95, month2: 88, month3: 82, month4: 78, month5: 75, month6: 72 },
          { name: 'Feb', month1: 97, month2: 90, month3: 84, month4: 80, month5: 77 },
          { name: 'Mar', month1: 98, month2: 92, month3: 86, month4: 82 },
          { name: 'Apr', month1: 96, month2: 89, month3: 84 },
          { name: 'May', month1: 99, month2: 93 },
          { name: 'Jun', month1: 100 }
        ],
        avgRetention: 85.2
      },
      status: 200
    };
  }
};

/**
 * Import API
 */
export const importApi = {
  async uploadStatement(file: File): Promise<ApiResponse<{ uploadId: string }>> {
    await delay(1500);
    
    return {
      data: {
        uploadId: `upload-${Date.now()}`
      },
      status: 200,
      message: 'File uploaded successfully'
    };
  },

  async detectFormat(uploadId: string): Promise<ApiResponse<any>> {
    await delay(2000);
    
    return {
      data: {
        detected: {
          fileType: 'csv',
          encoding: 'UTF-8',
          delimiter: ',',
          hasHeader: true,
          columns: [
            { name: 'Date', type: 'date', format: 'YYYY-MM-DD', confidence: 99 },
            { name: 'Description', type: 'string', confidence: 98 },
            { name: 'Debit', type: 'number', confidence: 95 },
            { name: 'Credit', type: 'number', confidence: 95 },
            { name: 'Balance', type: 'number', confidence: 92 }
          ],
          totalRows: 247
        },
        suggestedMapping: {
          date: 'Date',
          description: 'Description',
          amountOut: 'Debit',
          amountIn: 'Credit',
          balance: 'Balance'
        }
      },
      status: 200
    };
  },

  async importTransactions(uploadId: string, mapping: any): Promise<ApiResponse<any>> {
    await delay(3000);
    
    return {
      data: {
        imported: 247,
        skipped: 3,
        summary: {
          income: 185000,
          expenses: 124000,
          net: 61000
        }
      },
      status: 200,
      message: '247 transactions imported successfully'
    };
  }
};
