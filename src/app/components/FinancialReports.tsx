import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
// ── Inline financial statement types + data ─────────────────────────────────
// Types were previously imported from enhancedMockData; now inlined.
// Will be replaced by reportService.getPLStatement() / getBalanceSheet() / getCashflow()

interface PLStatement {
  period: string;
  revenue: { category: string; amount: number }[];
  totalRevenue: number;
  directCosts: { category: string; amount: number }[];
  totalDirectCosts: number;
  grossProfit: number;
  grossMargin: number;
  overheadExpenses: { category: string; amount: number }[];
  totalOverhead: number;
  netProfit: number;
  netMargin: number;
}

interface BalanceSheet {
  period: string;
  assets: {
    current: { category: string; amount: number }[];
    fixed: { category: string; amount: number }[];
  };
  totalAssets: number;
  liabilities: {
    current: { category: string; amount: number }[];
    longTerm: { category: string; amount: number }[];
  };
  totalLiabilities: number;
  equity: { category: string; amount: number }[];
  totalEquity: number;
}

interface CashflowStatement {
  period: string;
  operating: { category: string; amount: number }[];
  totalOperating: number;
  investing: { category: string; amount: number }[];
  totalInvesting: number;
  financing: { category: string; amount: number }[];
  totalFinancing: number;
  netCashflow: number;
  openingBalance: number;
  closingBalance: number;
}

const mockPLStatement: PLStatement = {
  period: 'December 2025',
  revenue: [
    { category: 'Design Services', amount: 680000 },
    { category: 'Development Services', amount: 985600 },
    { category: 'Marketing Services', amount: 375000 },
    { category: 'Consulting', amount: 256000 },
  ],
  totalRevenue: 2296600,
  directCosts: [
    { category: 'Designer Salaries', amount: 448000 },
    { category: 'Developer Salaries', amount: 738000 },
    { category: 'Marketing Team Salaries', amount: 300000 },
    { category: 'Sales Team Salaries', amount: 204800 },
  ],
  totalDirectCosts: 1690800,
  grossProfit: 605800,
  grossMargin: 26.4,
  overheadExpenses: [
    { category: 'Office Rent', amount: 200000 },
    { category: 'Utilities', amount: 45000 },
    { category: 'Software & Tools', amount: 85000 },
    { category: 'Admin Salaries', amount: 90000 },
  ],
  totalOverhead: 420000,
  netProfit: 185800,
  netMargin: 8.1,
};

const mockBalanceSheet: BalanceSheet = {
  period: 'As of December 31, 2025',
  assets: {
    current: [
      { category: 'Cash & Bank', amount: 2590000 },
      { category: 'Accounts Receivable', amount: 850000 },
      { category: 'Inventory', amount: 0 },
    ],
    fixed: [
      { category: 'Equipment', amount: 450000 },
      { category: 'Furniture', amount: 280000 },
    ],
  },
  totalAssets: 4170000,
  liabilities: {
    current: [
      { category: 'Accounts Payable', amount: 320000 },
      { category: 'Accrued Expenses', amount: 180000 },
    ],
    longTerm: [
      { category: 'Equipment Loan', amount: 250000 },
    ],
  },
  totalLiabilities: 750000,
  equity: [
    { category: 'Owner Equity', amount: 2500000 },
    { category: 'Retained Earnings', amount: 920000 },
  ],
  totalEquity: 3420000,
};

const mockCashflowStatement: CashflowStatement = {
  period: 'December 2025',
  operating: [
    { category: 'Collections from Clients', amount: 2150000 },
    { category: 'Salary Payments', amount: -1690800 },
    { category: 'Overhead Payments', amount: -420000 },
  ],
  totalOperating: 39200,
  investing: [
    { category: 'Equipment Purchase', amount: -120000 },
  ],
  totalInvesting: -120000,
  financing: [
    { category: 'Loan Repayment', amount: -25000 },
    { category: 'Owner Drawings', amount: -150000 },
  ],
  totalFinancing: -175000,
  netCashflow: -255800,
  openingBalance: 2845800,
  closingBalance: 2590000,
};

import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  ArrowLeft
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router';
import { NeuralBackground } from './ui/NeuralBackground';

export function FinancialReports() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#000000' }}>
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                className="border-white/20 text-white hover:bg-white/10"
                onClick={() => navigate('/organization')}
              >
                <ArrowLeft className="size-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold" style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #60a5fa 50%, #a855f7 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>Financial Reports</h1>
                <p className="text-slate-400 text-sm">Standard accounting statements</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                <Calendar className="size-4 mr-2" />
                Change Period
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Download className="size-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="pl" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10 backdrop-blur-sm">
            <TabsTrigger value="pl" className="data-[state=active]:bg-white/10">
              <FileText className="size-4 mr-2" />
              P&L Statement
            </TabsTrigger>
            <TabsTrigger value="balance" className="data-[state=active]:bg-white/10">
              <FileText className="size-4 mr-2" />
              Balance Sheet
            </TabsTrigger>
            <TabsTrigger value="cashflow" className="data-[state=active]:bg-white/10">
              <FileText className="size-4 mr-2" />
              Cashflow
            </TabsTrigger>
            <TabsTrigger value="networth" className="data-[state=active]:bg-white/10">
              <FileText className="size-4 mr-2" />
              Net Worth
            </TabsTrigger>
          </TabsList>

          {/* P&L Statement */}
          <TabsContent value="pl">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-2xl">Profit & Loss Statement</CardTitle>
                    <CardDescription className="text-blue-200">{mockPLStatement.period}</CardDescription>
                  </div>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Download className="size-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Revenue Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-r from-green-600/20 to-green-700/20 rounded-lg border border-green-500/30"
                  >
                    <h3 className="text-lg font-bold text-white mb-4">Revenue</h3>
                    <div className="space-y-2">
                      {mockPLStatement.revenue.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-green-100">
                          <span>{item.category}</span>
                          <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="h-px bg-green-500/30 my-3" />
                      <div className="flex justify-between items-center text-white text-xl font-bold">
                        <span>Total Revenue</span>
                        <span>PKR {mockPLStatement.totalRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Direct Costs Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 bg-gradient-to-r from-orange-600/20 to-orange-700/20 rounded-lg border border-orange-500/30"
                  >
                    <h3 className="text-lg font-bold text-white mb-4">Direct Costs (COGS)</h3>
                    <div className="space-y-2">
                      {mockPLStatement.directCosts.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-orange-100">
                          <span>{item.category}</span>
                          <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="h-px bg-orange-500/30 my-3" />
                      <div className="flex justify-between items-center text-white text-xl font-bold">
                        <span>Total Direct Costs</span>
                        <span>PKR {mockPLStatement.totalDirectCosts.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Gross Profit */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 bg-gradient-to-r from-blue-600/30 to-blue-700/30 rounded-lg border-2 border-blue-500/50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Gross Profit</h3>
                        <p className="text-blue-200">Gross Margin: {mockPLStatement.grossMargin.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-green-400">
                          PKR {mockPLStatement.grossProfit.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-green-400 text-sm">
                          <TrendingUp className="size-4" />
                          <span>Healthy margin</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Overhead Expenses */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-5 bg-gradient-to-r from-purple-600/20 to-purple-700/20 rounded-lg border border-purple-500/30"
                  >
                    <h3 className="text-lg font-bold text-white mb-4">Overhead Expenses</h3>
                    <div className="space-y-2">
                      {mockPLStatement.overheadExpenses.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-purple-100">
                          <span>{item.category}</span>
                          <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="h-px bg-purple-500/30 my-3" />
                      <div className="flex justify-between items-center text-white text-xl font-bold">
                        <span>Total Overhead</span>
                        <span>PKR {mockPLStatement.totalOverhead.toLocaleString()}</span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Net Profit */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="p-6 bg-gradient-to-r from-green-600 to-green-700 rounded-lg shadow-2xl"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-2xl font-bold text-white mb-1">Net Profit</h3>
                        <p className="text-green-100">Net Margin: {mockPLStatement.netMargin.toFixed(1)}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-white">
                          PKR {mockPLStatement.netProfit.toLocaleString()}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-green-100 text-sm">
                          <DollarSign className="size-4" />
                          <span>Bottom line profit</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-2xl">Balance Sheet</CardTitle>
                    <CardDescription className="text-blue-200">{mockBalanceSheet.period}</CardDescription>
                  </div>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Download className="size-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Assets */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <div className="p-5 bg-gradient-to-br from-blue-600/20 to-blue-700/20 rounded-lg border border-blue-500/30">
                      <h3 className="text-xl font-bold text-white mb-4">Assets</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-blue-200 mb-2">Current Assets</h4>
                          <div className="space-y-2">
                            {mockBalanceSheet.assets.current.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-blue-100">
                                <span>{item.category}</span>
                                <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-blue-500/30" />

                        <div>
                          <h4 className="font-semibold text-blue-200 mb-2">Fixed Assets</h4>
                          <div className="space-y-2">
                            {mockBalanceSheet.assets.fixed.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-blue-100">
                                <span>{item.category}</span>
                                <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-blue-500/30" />

                        <div className="flex justify-between items-center text-white text-xl font-bold pt-2">
                          <span>Total Assets</span>
                          <span>PKR {mockBalanceSheet.totalAssets.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Liabilities & Equity */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    {/* Liabilities */}
                    <div className="p-5 bg-gradient-to-br from-red-600/20 to-red-700/20 rounded-lg border border-red-500/30">
                      <h3 className="text-xl font-bold text-white mb-4">Liabilities</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-red-200 mb-2">Current Liabilities</h4>
                          <div className="space-y-2">
                            {mockBalanceSheet.liabilities.current.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-red-100">
                                <span>{item.category}</span>
                                <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-red-500/30" />

                        <div>
                          <h4 className="font-semibold text-red-200 mb-2">Long-term Liabilities</h4>
                          <div className="space-y-2">
                            {mockBalanceSheet.liabilities.longTerm.map((item, index) => (
                              <div key={index} className="flex justify-between items-center text-red-100">
                                <span>{item.category}</span>
                                <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="h-px bg-red-500/30" />

                        <div className="flex justify-between items-center text-white text-xl font-bold pt-2">
                          <span>Total Liabilities</span>
                          <span>PKR {mockBalanceSheet.totalLiabilities.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="p-5 bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-lg border border-green-500/30">
                      <h3 className="text-xl font-bold text-white mb-4">Owner's Equity</h3>
                      
                      <div className="space-y-2">
                        {mockBalanceSheet.equity.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-green-100">
                            <span>{item.category}</span>
                            <span className="font-semibold">PKR {item.amount.toLocaleString()}</span>
                          </div>
                        ))}

                        <div className="h-px bg-green-500/30 my-3" />

                        <div className="flex justify-between items-center text-white text-xl font-bold">
                          <span>Total Equity</span>
                          <span>PKR {mockBalanceSheet.totalEquity.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Accounting Equation Verification */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 p-5 bg-gradient-to-r from-purple-600/30 to-purple-700/30 rounded-lg border-2 border-purple-500/50"
                >
                  <h3 className="text-lg font-bold text-white mb-3">Accounting Equation</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-purple-200 mb-1">Total Assets</p>
                      <p className="text-2xl font-bold text-white">PKR {mockBalanceSheet.totalAssets.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-3xl text-purple-300 font-bold">=</span>
                    </div>
                    <div>
                      <p className="text-sm text-purple-200 mb-1">Liabilities + Equity</p>
                      <p className="text-2xl font-bold text-white">
                        PKR {(mockBalanceSheet.totalLiabilities + mockBalanceSheet.totalEquity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="inline-flex items-center gap-2 text-green-400 bg-green-950/30 px-3 py-1 rounded-full text-sm">
                      <span className="size-2 bg-green-400 rounded-full" />
                      Balanced
                    </span>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cashflow Statement */}
          <TabsContent value="cashflow">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-2xl">Cashflow Statement</CardTitle>
                    <CardDescription className="text-blue-200">{mockCashflowStatement.period}</CardDescription>
                  </div>
                  <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                    <Download className="size-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Operating Activities */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-lg border border-blue-500/30"
                  >
                    <h3 className="text-lg font-bold text-white mb-4">Operating Activities</h3>
                    <div className="space-y-2">
                      {mockCashflowStatement.operating.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-blue-100">
                          <span>{item.category}</span>
                          <span className={`font-semibold ${item.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            PKR {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="h-px bg-blue-500/30 my-3" />
                      <div className="flex justify-between items-center text-white text-xl font-bold">
                        <span>Net Operating Cashflow</span>
                        <span className={mockCashflowStatement.totalOperating >= 0 ? 'text-green-400' : 'text-red-400'}>
                          PKR {mockCashflowStatement.totalOperating.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Investing Activities */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-5 bg-gradient-to-r from-purple-600/20 to-purple-700/20 rounded-lg border border-purple-500/30"
                  >
                    <h3 className="text-lg font-bold text-white mb-4">Investing Activities</h3>
                    <div className="space-y-2">
                      {mockCashflowStatement.investing.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-purple-100">
                          <span>{item.category}</span>
                          <span className={`font-semibold ${item.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            PKR {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="h-px bg-purple-500/30 my-3" />
                      <div className="flex justify-between items-center text-white text-xl font-bold">
                        <span>Net Investing Cashflow</span>
                        <span className={mockCashflowStatement.totalInvesting >= 0 ? 'text-green-400' : 'text-red-400'}>
                          PKR {mockCashflowStatement.totalInvesting.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Financing Activities */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-5 bg-gradient-to-r from-orange-600/20 to-orange-700/20 rounded-lg border border-orange-500/30"
                  >
                    <h3 className="text-lg font-bold text-white mb-4">Financing Activities</h3>
                    <div className="space-y-2">
                      {mockCashflowStatement.financing.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-orange-100">
                          <span>{item.category}</span>
                          <span className={`font-semibold ${item.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                            PKR {item.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                      <div className="h-px bg-orange-500/30 my-3" />
                      <div className="flex justify-between items-center text-white text-xl font-bold">
                        <span>Net Financing Cashflow</span>
                        <span className={mockCashflowStatement.totalFinancing >= 0 ? 'text-green-400' : 'text-red-400'}>
                          PKR {mockCashflowStatement.totalFinancing.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  {/* Net Cashflow Summary */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="p-6 bg-gradient-to-r from-green-600/30 to-green-700/30 rounded-lg border-2 border-green-500/50"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-green-200 mb-1">Opening Cash Balance</p>
                        <p className="text-2xl font-bold text-white">PKR {mockCashflowStatement.openingBalance.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-green-200 mb-1">Net Cashflow</p>
                        <p className={`text-2xl font-bold ${mockCashflowStatement.netCashflow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          PKR {mockCashflowStatement.netCashflow.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-200 mb-1">Closing Cash Balance</p>
                        <p className="text-2xl font-bold text-white">PKR {mockCashflowStatement.closingBalance.toLocaleString()}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Net Worth */}
          <TabsContent value="networth">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Net Worth Statement</CardTitle>
                <CardDescription className="text-blue-200">Assets minus liabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-2xl text-center"
                >
                  <p className="text-blue-100 mb-2">Current Net Worth</p>
                  <p className="text-5xl font-bold text-white mb-4">
                    PKR {mockBalanceSheet.totalEquity.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-green-300">
                    <TrendingUp className="size-5" />
                    <span>Strong financial position</span>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}