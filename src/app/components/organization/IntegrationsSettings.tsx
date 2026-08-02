import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Download,
  Building2,
  CreditCard,
  Globe,
  Key,
  Zap,
  Shield,
  Brain,
} from 'lucide-react';
import { useOrgServices } from '@/hooks/useOrgServices';
import {
  fetchOrgAiSettings,
  saveOrgAiSettingsResponse,
  clearOrgAiSettingsResponse,
} from '@/services/aiSettingsService';
import {
  getOrgIntegrationStates,
  persistOrgIntegrationStates,
  type IntegrationConnectionPersisted,
} from '@/services/integrationConnectionsService';
import { AXIOM } from '../../../styles/axiom-tokens';
import { toast } from 'sonner';

interface Integration {
  id: string;
  name: string;
  logo: string;
  category: 'payment' | 'bank' | 'accounting';
  status: 'connected' | 'disconnected' | 'pending';
  description: string;
  features: string[];
  lastSync?: string;
}

const INTEGRATION_SEED: Integration[] = [
  {
    id: 'payoneer',
    name: 'Payoneer',
    logo: '💳',
    category: 'payment',
    status: 'disconnected',
    description: 'Receive international payments and auto-import transactions',
    features: [
      'Auto-import transactions',
      'Multi-currency support',
      'Real-time balance sync',
      'Transaction categorization',
    ],
  },
  {
    id: 'meezan',
    name: 'Meezan Bank',
    logo: '🏦',
    category: 'bank',
    status: 'disconnected',
    description: 'Import bank statements and sync account balances',
    features: [
      'Statement auto-import',
      'Balance tracking',
      'Transaction reconciliation',
      'Multi-account support',
    ],
  },
  {
    id: 'hbl',
    name: 'HBL',
    logo: '🏦',
    category: 'bank',
    status: 'disconnected',
    description: 'Connect your HBL accounts for automatic statement imports',
    features: [
      'Auto-import statements',
      'USD account support',
      'Real-time alerts',
      'Transaction history',
    ],
  },
  {
    id: 'ubl',
    name: 'UBL',
    logo: '🏦',
    category: 'bank',
    status: 'disconnected',
    description: 'United Bank Limited integration',
    features: ['Statement downloads', 'Balance sync', 'Transaction import'],
  },
  {
    id: 'wise',
    name: 'Wise (TransferWise)',
    logo: '💸',
    category: 'payment',
    status: 'disconnected',
    description: 'International transfers and multi-currency accounts',
    features: [
      'Multi-currency wallets',
      'Low-cost transfers',
      'Auto-import transactions',
      'Exchange rate tracking',
    ],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    logo: '💰',
    category: 'payment',
    status: 'disconnected',
    description: 'Import PayPal transactions automatically',
    features: ['Transaction import', 'Invoice sync', 'Fee tracking', 'Multi-currency'],
  },
];

function mergeSeedWithStored(
  seed: Integration[],
  stored: Record<string, IntegrationConnectionPersisted>,
): Integration[] {
  return seed.map((row) => {
    const s = stored[row.id];
    if (!s) return row;
    return {
      ...row,
      status: s.status,
      ...(s.lastSync ? { lastSync: s.lastSync } : {}),
    };
  });
}

function toPersistMap(integrations: Integration[]): Record<string, IntegrationConnectionPersisted> {
  return Object.fromEntries(
    integrations.map((i) => [
      i.id,
      {
        status: i.status,
        ...(i.lastSync ? { lastSync: i.lastSync } : {}),
      },
    ]),
  );
}

export function IntegrationsSettings() {
  const { orgId, isReady } = useOrgServices();

  const [useCustomAiKey, setUseCustomAiKey] = useState(false);
  const [aiProviderName, setAiProviderName] = useState('');
  const [aiModelName, setAiModelName] = useState('gpt-4o-mini');
  const [aiApiKey, setAiApiKey] = useState('');

  useEffect(() => {
    if (!isReady || !orgId) return;
    let cancelled = false;
    void (async () => {
      const res = await fetchOrgAiSettings(orgId);
      if (cancelled) return;
      const s = res.success ? res.data : null;
      if (s) {
        setUseCustomAiKey(s.useCustomKey);
        setAiProviderName(s.providerName);
        setAiModelName(s.modelName || 'gpt-4o-mini');
        setAiApiKey(s.apiKey);
      } else {
        setUseCustomAiKey(false);
        setAiProviderName('');
        setAiModelName('gpt-4o-mini');
        setAiApiKey('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, isReady]);

  const handleSaveAiSettings = () => {
    void (async () => {
      const res = await saveOrgAiSettingsResponse(orgId, {
        useCustomKey: useCustomAiKey,
        providerName: aiProviderName.trim(),
        modelName: aiModelName.trim() || 'gpt-4o-mini',
        apiKey: aiApiKey,
      });
      if (res.success) {
        toast.success(res.message ?? 'AI connection settings saved for this organization.');
      } else {
        toast.error(res.error ?? 'Could not save AI settings.');
      }
    })();
  };

  const handleClearAiSettings = () => {
    void (async () => {
      const res = await clearOrgAiSettingsResponse(orgId);
      if (res.success) {
        setUseCustomAiKey(false);
        setAiProviderName('');
        setAiModelName('gpt-4o-mini');
        setAiApiKey('');
        toast.message(res.message ?? 'AI settings cleared.');
      } else {
        toast.error(res.error ?? 'Could not clear AI settings.');
      }
    })();
  };

  const [integrations, setIntegrations] = useState<Integration[]>(() =>
    mergeSeedWithStored(INTEGRATION_SEED, getOrgIntegrationStates('')),
  );

  useEffect(() => {
    setIntegrations(mergeSeedWithStored(INTEGRATION_SEED, getOrgIntegrationStates(orgId)));
  }, [orgId]);

  const [connectingTo, setConnectingTo] = useState<string | null>(null);

  const handleConnect = (integrationId: string) => {
    setConnectingTo(integrationId);

    setTimeout(() => {
      setIntegrations((prev) => {
        const next = prev.map((int) =>
          int.id === integrationId
            ? { ...int, status: 'connected' as const, lastSync: new Date().toISOString() }
            : int,
        );
        if (orgId?.trim()) {
          const r = persistOrgIntegrationStates(orgId, toPersistMap(next));
          if (!r.success) {
            queueMicrotask(() => toast.error(r.error ?? 'Could not save connection state.'));
          } else {
            queueMicrotask(() => toast.success('Integration connected successfully!'));
          }
        } else {
          queueMicrotask(() => toast.success('Integration connected successfully!'));
        }
        return next;
      });
      setConnectingTo(null);
    }, 2000);
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations((prev) => {
      const next = prev.map((int) =>
        int.id === integrationId
          ? { ...int, status: 'disconnected' as const, lastSync: undefined }
          : int,
      );
      if (orgId?.trim()) {
        const r = persistOrgIntegrationStates(orgId, toPersistMap(next));
        if (!r.success) {
          queueMicrotask(() => toast.error(r.error ?? 'Could not save connection state.'));
        } else {
          queueMicrotask(() => toast.success('Integration disconnected'));
        }
      } else {
        queueMicrotask(() => toast.success('Integration disconnected'));
      }
      return next;
    });
  };

  const handleSync = (integrationId: string) => {
    setIntegrations((prev) => {
      const next = prev.map((int) =>
        int.id === integrationId ? { ...int, lastSync: new Date().toISOString() } : int,
      );
      if (orgId?.trim()) {
        const r = persistOrgIntegrationStates(orgId, toPersistMap(next));
        if (!r.success) {
          queueMicrotask(() => toast.error(r.error ?? 'Could not save connection state.'));
        } else {
          queueMicrotask(() => toast.success('Sync completed successfully!'));
        }
      } else {
        queueMicrotask(() => toast.success('Sync completed successfully!'));
      }
      return next;
    });
  };

  const connectedCount = integrations.filter(i => i.status === 'connected').length;
  const paymentPlatforms = integrations.filter(i => i.category === 'payment');
  const banks = integrations.filter(i => i.category === 'bank');

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
              <Plug className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold" style={AXIOM.text.titleStyle}>
                Integrations & Connections
              </h1>
              <p className="text-slate-400 text-sm">Connect payment platforms and banks for automatic data import</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Status Overview */}
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
              <p className="text-slate-400 text-sm mb-1">Connected</p>
              <p className="text-2xl font-bold text-cyan-400">{connectedCount}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.cyan,
                boxShadow: AXIOM.shadows.iconCyan,
              }}
            >
              <Zap className="size-6 text-white" />
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
              <p className="text-slate-400 text-sm mb-1">Payment Platforms</p>
              <p className="text-2xl font-bold text-emerald-400">{paymentPlatforms.length}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.green,
                boxShadow: AXIOM.shadows.iconGreen,
              }}
            >
              <CreditCard className="size-6 text-white" />
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
              <p className="text-slate-400 text-sm mb-1">Banks</p>
              <p className="text-2xl font-bold text-purple-400">{banks.length}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.purple,
                boxShadow: AXIOM.shadows.iconPurple,
              }}
            >
              <Building2 className="size-6 text-white" />
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
              <p className="text-slate-400 text-sm mb-1">Available</p>
              <p className="text-2xl font-bold text-orange-400">{integrations.length}</p>
            </div>
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: AXIOM.iconBoxes.orange,
                boxShadow: AXIOM.shadows.iconOrange,
              }}
            >
              <Globe className="size-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Optional: bring your own AI (provider name + model + API key) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.list}
      >
        <div className="flex items-start gap-4 mb-6">
          <div
            className="p-3 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: AXIOM.iconBoxes.purple,
              boxShadow: AXIOM.shadows.iconPurple,
            }}
          >
            <Brain className="size-6 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white">AI assistant connection</h2>
            <p className="text-sm text-slate-400 mt-1">
              Optional. Name the provider and model you use, and add an API key when you want the in-app assistant to call
              your account. The chat still uses demo replies until a backend is connected to these settings.
            </p>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={useCustomAiKey}
            onChange={(e) => setUseCustomAiKey(e.target.checked)}
            className="rounded border-slate-600 bg-slate-900 text-purple-500 focus:ring-purple-500/40"
          />
          <span className="text-sm text-slate-200">I want to use my own API key for AI (opt-in)</span>
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Provider name</label>
            <input
              type="text"
              value={aiProviderName}
              onChange={(e) => setAiProviderName(e.target.value)}
              placeholder="e.g. OpenAI, Anthropic, Azure OpenAI"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Model name</label>
            <input
              type="text"
              value={aiModelName}
              onChange={(e) => setAiModelName(e.target.value)}
              placeholder="e.g. gpt-4o-mini"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">API key</label>
            <input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder={useCustomAiKey ? 'Paste your secret key' : 'Enable opt-in above to store a key'}
              disabled={!useCustomAiKey}
              autoComplete="off"
              className="w-full rounded-xl border border-slate-600 bg-slate-950/80 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:opacity-45"
            />
          </div>
        </div>

        <div
          className="mt-4 p-4 rounded-xl flex items-start gap-3"
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
          }}
        >
          <Shield className="size-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-100/90 leading-relaxed">
            For this demo, keys are stored in this browser only (localStorage). For production, move keys to your server
            environment and never ship them to the client. Anyone with access to this device could read stored keys.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveAiSettings}
            disabled={!isReady}
            title={!isReady ? 'Choose an organization in the header first' : undefined}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-45 disabled:pointer-events-none"
            style={AXIOM.buttons.action}
          >
            Save AI settings
          </button>
          <button
            type="button"
            onClick={handleClearAiSettings}
            disabled={!isReady}
            title={!isReady ? 'Choose an organization in the header first' : undefined}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-800/80 disabled:opacity-45 disabled:pointer-events-none"
          >
            Clear saved settings
          </button>
        </div>
      </motion.div>

      {/* Payment Platforms */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.cyan,
              boxShadow: AXIOM.shadows.iconCyan,
            }}
          >
            <CreditCard className="size-4 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Payment Platforms</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {paymentPlatforms.map((integration, idx) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + idx * 0.05 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.list}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-5xl">{integration.logo}</div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{integration.name}</h3>
                    <p className="text-sm text-slate-400">{integration.description}</p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                  style={
                    integration.status === 'connected' ? AXIOM.badges.success :
                    integration.status === 'pending' ? AXIOM.badges.warning :
                    AXIOM.badges.danger
                  }
                >
                  {integration.status === 'connected' && <CheckCircle2 className="size-3" />}
                  {integration.status === 'pending' && <RefreshCw className="size-3 animate-spin" />}
                  {integration.status === 'disconnected' && <AlertCircle className="size-3" />}
                  {integration.status}
                </span>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">Features</p>
                <ul className="space-y-2">
                  {integration.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Last Sync */}
              {integration.lastSync && (
                <div className="text-xs text-slate-400 mb-4">
                  Last synced: {new Date(integration.lastSync).toLocaleString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {integration.status === 'disconnected' ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleConnect(integration.id)}
                    disabled={connectingTo === integration.id}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.4), rgba(59, 130, 246, 0.4))',
                      border: '1px solid rgba(6, 182, 212, 0.5)',
                      boxShadow: '0 10px 30px -10px rgba(6, 182, 212, 0.6)',
                      color: '#ffffff',
                      opacity: connectingTo === integration.id ? 0.7 : 1,
                    }}
                  >
                    {connectingTo === integration.id ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Plug className="size-4" />
                        Connect
                      </>
                    )}
                  </motion.button>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSync(integration.id)}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={AXIOM.buttons.primary}
                    >
                      <RefreshCw className="size-4" />
                      Sync Now
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDisconnect(integration.id)}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={AXIOM.buttons.danger}
                    >
                      Disconnect
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Banks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: AXIOM.iconBoxes.purple,
              boxShadow: AXIOM.shadows.iconPurple,
            }}
          >
            <Building2 className="size-4 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Pakistani Banks</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {banks.map((integration, idx) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.55 + idx * 0.05 }}
              className="p-6 rounded-2xl"
              style={AXIOM.containers.list}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-5xl">{integration.logo}</div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{integration.name}</h3>
                    <p className="text-sm text-slate-400">{integration.description}</p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                  style={
                    integration.status === 'connected' ? AXIOM.badges.success :
                    AXIOM.badges.danger
                  }
                >
                  {integration.status === 'connected' && <CheckCircle2 className="size-3" />}
                  {integration.status}
                </span>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 mb-2">Features</p>
                <ul className="space-y-2">
                  {integration.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-center gap-2">
                      <CheckCircle2 className="size-3 text-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {integration.status === 'disconnected' ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleConnect(integration.id)}
                      disabled={connectingTo === integration.id}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={AXIOM.buttons.primary}
                    >
                      {connectingTo === integration.id ? (
                        <>
                          <RefreshCw className="size-4 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Plug className="size-4" />
                          Connect via API
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2"
                      style={AXIOM.buttons.secondary}
                      onClick={() => toast.info('Manual import feature coming soon')}
                    >
                      <Download className="size-4" />
                      Manual
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSync(integration.id)}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={AXIOM.buttons.primary}
                    >
                      <RefreshCw className="size-4" />
                      Sync
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDisconnect(integration.id)}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={AXIOM.buttons.danger}
                    >
                      Disconnect
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Integration Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="p-6 rounded-2xl"
        style={AXIOM.containers.chartBlue}
      >
        <div className="flex items-start gap-4">
          <div 
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: AXIOM.iconBoxes.blue,
              boxShadow: AXIOM.shadows.iconBlue,
            }}
          >
            <Key className="size-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-4">How to Connect Integrations</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-0.5">1.</span>
                <span><strong className="text-white">Click "Connect"</strong> on any integration card</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-0.5">2.</span>
                <span><strong className="text-white">Authorize access:</strong> You'll be redirected to log in to the service</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-0.5">3.</span>
                <span><strong className="text-white">Grant permissions:</strong> Allow Finance OS to read transactions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-0.5">4.</span>
                <span><strong className="text-white">Auto-sync:</strong> Transactions import automatically (daily or real-time)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-400 font-bold mt-0.5">5.</span>
                <span><strong className="text-white">Manual sync:</strong> Click "Sync Now" anytime to refresh data</span>
              </li>
            </ul>
            <div 
              className="mt-4 p-4 rounded-xl flex items-start gap-3"
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <Shield className="size-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                <strong>Security:</strong> We use bank-level encryption and never store your passwords. 
                Connections use OAuth 2.0 or read-only API keys.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}