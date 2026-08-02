import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  TrendingUp, 
  TrendingDown,
  Wallet,
  CreditCard,
  Eye,
  EyeOff,
  ChevronRight,
  DollarSign,
  PiggyBank,
  Building2,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface NetWorthWidgetProps {
  variant?: 'compact' | 'detailed' | 'mini';
  showTrend?: boolean;
  className?: string;
}

// Mock data
const mockNetWorth = {
  current: 4750000,
  previous: 4200000,
  change: 550000,
  changePercent: 13.1,
  assets: {
    total: 7200000,
    breakdown: [
      { name: 'Cash & Bank', amount: 2500000, icon: Wallet },
      { name: 'Accounts Receivable', amount: 1200000, icon: DollarSign },
      { name: 'Fixed Assets', amount: 3500000, icon: Building2 },
    ]
  },
  liabilities: {
    total: 2450000,
    breakdown: [
      { name: 'Accounts Payable', amount: 450000, icon: CreditCard },
      { name: 'Short-term Loans', amount: 500000, icon: CreditCard },
      { name: 'Long-term Loans', amount: 1500000, icon: Building2 },
    ]
  },
  trend: [
    { month: 'Aug', value: 3800000 },
    { month: 'Sep', value: 3950000 },
    { month: 'Oct', value: 4100000 },
    { month: 'Nov', value: 4200000 },
    { month: 'Dec', value: 4500000 },
    { month: 'Jan', value: 4750000 },
  ]
};

export function NetWorthWidget({ 
  variant = 'compact', 
  showTrend = true,
  className = '' 
}: NetWorthWidgetProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const isPositive = mockNetWorth.change >= 0;
  const percentChange = Math.abs(mockNetWorth.changePercent);

  // Mini variant - for dashboard cards
  if (variant === 'mini') {
    return (
      <div className={`p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 rounded">
              <PiggyBank className="size-4 text-purple-400" />
            </div>
            <span className="text-xs text-purple-400 font-medium uppercase">Net Worth</span>
          </div>
          <button
            onClick={() => setIsHidden(!isHidden)}
            className="text-purple-400 hover:text-purple-300"
          >
            {isHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          </button>
        </div>
        {isHidden ? (
          <div className="text-xl font-bold text-white">••••••</div>
        ) : (
          <div className="text-xl font-bold text-white">
            {formatCurrency(mockNetWorth.current, 'PKR')}
          </div>
        )}
        <div className={`flex items-center gap-1 mt-1 text-xs ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          <span>{isPositive ? '+' : ''}{percentChange}% this month</span>
        </div>
      </div>
    );
  }

  // Compact variant - for sidebar or small spaces
  if (variant === 'compact') {
    return (
      <Card className={`bg-gradient-to-br from-purple-950/20 to-pink-950/20 border-purple-900/50 ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <PiggyBank className="size-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-purple-400 font-medium uppercase">Net Worth</p>
                <p className="text-xs text-slate-500">Assets - Liabilities</p>
              </div>
            </div>
            <button
              onClick={() => setIsHidden(!isHidden)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {isHidden ? (
            <div className="text-3xl font-bold text-white mb-2">••••••••</div>
          ) : (
            <div className="text-3xl font-bold text-white mb-2">
              {formatCurrency(mockNetWorth.current, 'PKR')}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
              <span className="text-sm font-medium">
                {formatCurrency(Math.abs(mockNetWorth.change), 'PKR')}
              </span>
            </div>
            <Badge className={
              isPositive 
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }>
              {isPositive ? '+' : ''}{percentChange}%
            </Badge>
          </div>

          {showTrend && !isHidden && (
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={mockNetWorth.trend}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#a855f7" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-purple-900/30">
            <div>
              <p className="text-xs text-slate-400 mb-1">Assets</p>
              <p className="text-sm font-medium text-green-400">
                {isHidden ? '••••' : formatCurrency(mockNetWorth.assets.total, 'PKR')}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Liabilities</p>
              <p className="text-sm font-medium text-red-400">
                {isHidden ? '••••' : formatCurrency(mockNetWorth.liabilities.total, 'PKR')}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full mt-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
          >
            View Details
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Detailed variant - full breakdown
  return (
    <Card className={`bg-gradient-to-br from-purple-950/20 to-pink-950/20 border-purple-900/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <PiggyBank className="size-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-white">Net Worth</CardTitle>
              <p className="text-sm text-slate-400">Current financial position</p>
            </div>
          </div>
          <button
            onClick={() => setIsHidden(!isHidden)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isHidden ? (
              <EyeOff className="size-5 text-slate-400" />
            ) : (
              <Eye className="size-5 text-slate-400" />
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Net Worth */}
        <div className="text-center p-6 bg-slate-950 rounded-lg border border-slate-800">
          {isHidden ? (
            <div className="text-4xl font-bold text-white mb-2">••••••••••</div>
          ) : (
            <div className="text-4xl font-bold text-white mb-2">
              {formatCurrency(mockNetWorth.current, 'PKR')}
            </div>
          )}
          
          <div className="flex items-center justify-center gap-2 mb-1">
            {isPositive ? (
              <TrendingUp className="size-5 text-green-400" />
            ) : (
              <TrendingDown className="size-5 text-red-400" />
            )}
            <span className={`text-lg font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{formatCurrency(Math.abs(mockNetWorth.change), 'PKR')}
            </span>
            <Badge className={
              isPositive 
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500/20 text-red-400 border-red-500/30'
            }>
              {isPositive ? '+' : ''}{percentChange}%
            </Badge>
          </div>
          <p className="text-sm text-slate-400">vs last month</p>
        </div>

        {/* Trend Chart */}
        {showTrend && !isHidden && (
          <div>
            <h4 className="text-sm font-medium text-white mb-3">6-Month Trend</h4>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={mockNetWorth.trend}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#a855f7" 
                  strokeWidth={3}
                  dot={{ fill: '#a855f7', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex justify-between text-xs text-slate-400 mt-2">
              {mockNetWorth.trend.map((item, idx) => (
                <span key={idx}>{item.month}</span>
              ))}
            </div>
          </div>
        )}

        {/* Assets Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Assets</h4>
            <span className="text-lg font-bold text-green-400">
              {isHidden ? '••••••' : formatCurrency(mockNetWorth.assets.total, 'PKR')}
            </span>
          </div>
          <div className="space-y-2">
            {mockNetWorth.assets.breakdown.map((asset, idx) => {
              const Icon = asset.icon;
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/10 rounded">
                      <Icon className="size-4 text-green-400" />
                    </div>
                    <span className="text-sm text-slate-300">{asset.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {isHidden ? '••••' : formatCurrency(asset.amount, 'PKR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Liabilities Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Liabilities</h4>
            <span className="text-lg font-bold text-red-400">
              {isHidden ? '••••••' : formatCurrency(mockNetWorth.liabilities.total, 'PKR')}
            </span>
          </div>
          <div className="space-y-2">
            {mockNetWorth.liabilities.breakdown.map((liability, idx) => {
              const Icon = liability.icon;
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-500/10 rounded">
                      <Icon className="size-4 text-red-400" />
                    </div>
                    <span className="text-sm text-slate-300">{liability.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {isHidden ? '••••' : formatCurrency(liability.amount, 'PKR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2 pt-4 border-t border-purple-900/30">
          <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
            <Zap className="size-4 mr-2" />
            Update Assets
          </Button>
          <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800">
            <Building2 className="size-4 mr-2" />
            Manage Loans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}