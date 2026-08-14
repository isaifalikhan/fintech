import { ReactNode, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../ui/button';
import { useTheme } from '../../../contexts/ThemeContext';
import { 
  LayoutDashboard, 
  Plus, 
  Receipt, 
  Wallet, 
  Upload, 
  Brain, 
  Calculator, 
  FileText, 
  CreditCard, 
  Users,
  DollarSign,
  Settings,
  LogOut,
  Building2,
  Sparkles,
  Repeat,
  Target,
  TrendingUp,
  Briefcase,
  Zap,
  LineChart,
  User,
  Plug,
  Cpu,
  Radio,
  ChevronRight,
  Laptop,
  Package,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { OrganizationSwitcher } from '../OrganizationSwitcher';
import { NotificationCenter } from '../notifications/NotificationCenter';
import type { OrgView } from './OrganizationWorkspace';

interface OrganizationLayoutProps {
  children: ReactNode;
  currentView: OrgView;
  onViewChange: (view: OrgView) => void;
}

export function OrganizationLayout({ children, currentView, onViewChange }: OrganizationLayoutProps) {
  const { user, logout, currentOrganization } = useAuth();
  const { theme } = useTheme();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);
  const selectView = (view: OrgView) => {
    onViewChange(view);
    closeMobileNav();
  };
  
  // Use the live org from AuthContext instead of static mock data
  const organization = currentOrganization;

  const navItems: { id: OrgView; label: string; icon: any }[] = [
    { id: 'finance-os', label: 'Finance OS', icon: Cpu },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profit-intelligence', label: 'Profit Intelligence', icon: LineChart },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Brain },
    { id: 'quick-add', label: 'Quick Add', icon: Plus },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'accounts', label: 'Accounts & Wallets', icon: Wallet },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
    { id: 'import', label: 'Import Statements', icon: Upload },
    { id: 'logic', label: 'Logic & Learning', icon: Sparkles },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'budgets', label: 'Budget Planning', icon: Target },
    { id: 'forecast', label: 'Cash Flow Forecast', icon: TrendingUp },
    { id: 'projects', label: 'Project Profitability', icon: Briefcase },
    { id: 'simulator', label: 'What-If Simulator', icon: Zap },
    { id: 'costing', label: 'Costing & Pricing', icon: Calculator },
    { id: 'assets', label: 'Assets & Depreciation', icon: Laptop },
    { id: 'inventory', label: 'Inventory Management', icon: Package },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'loans', label: 'Loans & Liabilities', icon: Building2 },
    { id: 'team', label: 'Team & Permissions', icon: Users },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className={`size-full flex flex-col ${theme === 'dark' ? 'bg-black' : 'bg-gradient-to-br from-slate-50 to-slate-100'} relative overflow-hidden`}>
      {/* Subtle Background Grid */}
      <div className={`absolute inset-0 ${theme === 'dark' ? 'opacity-5' : 'opacity-3'} pointer-events-none`} style={{
        backgroundImage: `
          linear-gradient(${theme === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.15)'} 1px, transparent 1px),
          linear-gradient(90deg, ${theme === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.15)'} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px'
      }}></div>

      {/* Top Header Bar */}
      <div className={`min-h-16 sm:min-h-20 ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl border-b ${theme === 'dark' ? 'border-cyan-500/30' : 'border-cyan-400/30'} flex flex-wrap items-center justify-between gap-y-2 gap-x-2 px-3 sm:px-5 lg:px-8 py-2 sm:py-0 shrink-0 relative z-30`}>
        {/* Glowing Top Border */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>

        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 lg:flex-initial">
          <button
            type="button"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileNavOpen(o => !o)}
            className={`lg:hidden shrink-0 p-2.5 rounded-xl border ${theme === 'dark' ? 'border-cyan-500/30 bg-slate-950/50 text-cyan-300' : 'border-cyan-400/40 bg-slate-50 text-cyan-700'}`}
          >
            {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          {/* Logo */}
          <div className="relative shrink-0">
            <div className="size-10 sm:size-12 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center relative">
              <Cpu className="size-5 sm:size-6 text-white" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-500 blur-lg opacity-50"></div>
            </div>
          </div>

          <div className="min-w-0 hidden min-[400px]:block sm:block">
            <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
              Finance OS
            </h1>
            <div className="hidden md:flex items-center gap-2">
              <div className="size-2 rounded-full bg-green-400 shadow-lg shadow-green-400/50"></div>
              <p className="text-xs text-cyan-400/70 font-mono">Multi-Tenant System</p>
            </div>
          </div>

          {/* Organization Switcher */}
          <div className="ml-auto sm:ml-2 md:ml-6 min-w-0 max-w-[min(100%,11rem)] sm:max-w-none">
            <OrganizationSwitcher />
          </div>
        </div>
        
        {/* User Info and Logout */}
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
          {/* Notification Center */}
          <NotificationCenter />
          
          <div className={`hidden sm:flex items-center gap-2 md:gap-3 px-2 md:px-4 py-2 max-w-[200px] md:max-w-xs ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-100'} backdrop-blur-xl rounded-xl border ${theme === 'dark' ? 'border-cyan-500/20' : 'border-cyan-400/30'} min-w-0`}>
            <User className="size-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <p className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-medium truncate`}>{user?.name}</p>
              <p className="text-xs text-cyan-400/70 font-mono truncate">{user?.email}</p>
            </div>
          </div>
          
          <Button
            onClick={logout}
            title="Log out"
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium px-3 sm:px-6"
          >
            <LogOut className="size-4 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Mobile overlay */}
        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobileNav}
          />
        )}

        {/* Sidebar */}
        <div
          className={cn(
            `w-72 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/70'} backdrop-blur-xl border-r ${theme === 'dark' ? 'border-cyan-500/20' : 'border-cyan-400/30'} flex flex-col shrink-0 relative`,
            'fixed z-50 top-[4.75rem] sm:top-20 bottom-0 left-0 lg:static lg:z-0 lg:top-auto lg:bottom-auto transition-transform duration-200 ease-out',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          )}
        >
          {/* Glowing Edge */}
          <div className="absolute top-0 bottom-0 right-0 w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent"></div>

          {/* Status Indicator */}
          <div className={`p-4 border-b ${theme === 'dark' ? 'border-cyan-500/20' : 'border-cyan-400/30'}`}>
            <div className={`p-3 ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-slate-50'} rounded-lg border ${theme === 'dark' ? 'border-cyan-500/30' : 'border-cyan-400/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cyan-400 font-mono">SYSTEM STATUS</span>
                <Radio className="size-3 text-green-400" />
              </div>
              <div className={`h-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'} rounded-full overflow-hidden`}>
                <div className="h-full bg-gradient-to-r from-cyan-500 to-green-500 w-full"></div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => selectView(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors cursor-pointer',
                  currentView === item.id
                    ? `bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-${theme === 'dark' ? '400' : '600'} font-medium border border-cyan-500/30`
                    : `${theme === 'dark' ? 'text-slate-400 hover:text-white hover:bg-slate-800/30' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'} border border-transparent`
                )}
              >
                <item.icon className="size-4" />
                <span className="flex-1 text-left font-mono">{item.label}</span>
                {currentView === item.id && (
                  <ChevronRight className={`size-4 text-cyan-${theme === 'dark' ? '400' : '600'}`} />
                )}
              </button>
            ))}
          </nav>

          {/* Footer with AI Status */}
          <div className={`p-4 border-t ${theme === 'dark' ? 'border-cyan-500/20' : 'border-cyan-400/30'}`}>
            <div className={`p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30`}>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="size-4 text-purple-400" />
                <span className="text-xs text-purple-400 font-mono">AI ENGINE</span>
              </div>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'} font-mono`}>Neural Network Active</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto relative">
          {children}
        </div>
      </div>
    </div>
  );
}