import { Dashboard } from './Dashboard';
import { Transactions } from './Transactions';
import { Reports } from './Reports';
import { Analytics } from './Analytics';
import { InteractiveDemo } from './InteractiveDemo';
import { UIShowcase } from '../components/demo/UIShowcase';

// Simple component showcase router
export function ComponentShowcase() {
  return (
    <div className="min-h-screen bg-slate-950">
      <UIShowcase />
    </div>
  );
}

export { Dashboard, Transactions, Reports, Analytics, InteractiveDemo };
