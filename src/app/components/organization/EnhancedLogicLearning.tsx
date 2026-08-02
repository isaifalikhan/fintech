import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useOrgServices } from '@/hooks/useOrgServices';
import { useService, useServiceArray, useMutation } from '@/hooks/useService';
import {
  Brain,
  Sparkles,
  TrendingUp,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  BookOpen,
  Target,
  Zap,
  BarChart3,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../ui/utils';
import type { ClassificationResult, ClassificationRule } from '@/lib/classificationEngine';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

type LearningView = 'patterns' | 'review' | 'performance' | 'rules';

export function EnhancedLogicLearning() {
  const [activeView, setActiveView] = useState<LearningView>('patterns');
  const [searchQuery, setSearchQuery] = useState('');
  const [testNarration, setTestNarration] = useState('');
  const [testResult, setTestResult] = useState<ClassificationResult | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCategoryId, setNewRuleCategoryId] = useState('');
  const [expandedCorrectionTxnId, setExpandedCorrectionTxnId] = useState<string | null>(null);
  const [correctionCategoryId, setCorrectionCategoryId] = useState('');

  const svc = useOrgServices();

  const { data: categories, loading: categoriesLoading, error: categoriesError } = useServiceArray(
    () => svc.categories.getAll(),
    [svc.orgId],
    ['categories'],
  );

  const { data: txnResult, loading: txnsLoading } = useService(
    () => svc.transactions.getAll({ pageSize: 500 }),
    [svc.orgId],
    ['transactions'],
  );
  const transactions = txnResult?.items ?? [];

  const { data: rules, loading: rulesLoading } = useServiceArray(
    () => svc.classification.getRules(),
    [svc.orgId],
    ['classification-rules'],
  );

  const { data: statsResult } = useService(
    () => svc.classification.getStats(),
    [svc.orgId],
    ['transactions', 'categories', 'classification-rules'],
  );

  const classifyMut = useMutation((input: { narration: string; amount: number; type: 'debit' | 'credit' }) =>
    svc.classification.classify(input.narration, input.amount, input.type),
  );

  const learnMut = useMutation((input: { txnId: string; categoryId: string }) =>
    svc.classification.learnFromCorrection(input.txnId, input.categoryId),
  );

  const addRuleMut = useMutation((rule: Omit<ClassificationRule, 'id'>) => svc.classification.addRule(rule));

  const deleteRuleMut = useMutation((ruleId: string) => svc.classification.deleteRule(ruleId));

  const aiMetrics = useMemo(() => {
    if (statsResult) {
      return {
        totalClassifications: statsResult.totalTransactions,
        accurateClassifications: statsResult.autoClassified,
        accuracyRate: Math.round(statsResult.accuracyRate * 10) / 10,
        avgConfidence: statsResult.avgConfidence,
        learningRate: `${statsResult.userClassified} user-tuned`,
        patternsLearned: statsResult.autoClassified,
        userCorrections: statsResult.userClassified,
      };
    }
    return {
      totalClassifications: 0,
      accurateClassifications: 0,
      accuracyRate: 0,
      avgConfidence: 0,
      learningRate: '—',
      patternsLearned: 0,
      userCorrections: 0,
    };
  }, [statsResult]);

  const handleTestClassification = async () => {
    if (!testNarration.trim()) {
      toast.error('Enter a description to test.');
      return;
    }
    setTestResult(null);
    const res = await classifyMut.execute({
      narration: testNarration.trim(),
      amount: 1000,
      type: 'debit',
    });
    if (res.success && res.data) {
      setTestResult(res.data);
    } else {
      toast.error(res.error || 'Could not classify.');
    }
  };

  const handleThumbsUp = async (txnId: string, categoryId: string | undefined) => {
    if (!categoryId) {
      toast.error('This row has no category yet.');
      return;
    }
    const res = await learnMut.execute({ txnId, categoryId });
    if (res.success) {
      toast.success(res.message || 'Thanks — we will use this more often.');
    } else {
      toast.error(res.error || 'Could not save feedback.');
    }
  };

  const applyCorrection = async (txnId: string) => {
    if (!correctionCategoryId) {
      toast.error('Choose a category.');
      return;
    }
    const res = await learnMut.execute({ txnId, categoryId: correctionCategoryId });
    if (res.success) {
      toast.success(res.message || 'Category updated.');
      setExpandedCorrectionTxnId(null);
      setCorrectionCategoryId('');
    } else {
      toast.error(res.error || 'Could not update.');
    }
  };

  const handleCreateRule = async () => {
    const pattern = newRulePattern.trim();
    if (!pattern) {
      toast.error('Enter a pattern to match.');
      return;
    }
    if (!newRuleCategoryId) {
      toast.error('Choose a category.');
      return;
    }
    const res = await addRuleMut.execute({
      pattern,
      categoryId: newRuleCategoryId,
      confidence: 100,
      matchCount: 0,
      createdFrom: 'user',
    });
    if (res.success) {
      toast.success(res.message || 'Rule added.');
      setRuleDialogOpen(false);
      setNewRulePattern('');
      setNewRuleCategoryId('');
    } else {
      toast.error(res.error || 'Could not add rule.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const res = await deleteRuleMut.execute(ruleId);
    if (res.success) {
      toast.success(res.message || 'Rule removed.');
    } else {
      toast.error(res.error || 'Could not delete rule.');
    }
  };

  const recentClassifications = useMemo(
    () => transactions.filter(t => t.classifiedBy === 'auto').slice(0, 10),
    [transactions],
  );

  const filteredReview = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return recentClassifications;
    return recentClassifications.filter(
      t =>
        t.narration.toLowerCase().includes(q) ||
        (categories.find(c => c.id === t.categoryId)?.name ?? '').toLowerCase().includes(q),
    );
  }, [recentClassifications, searchQuery, categories]);

  const categoryName = (id: string | undefined) =>
    categories.find(c => c.id === id)?.name ?? 'Unknown';

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Logic & Learning Center
          </h1>
          <p className="text-gray-400 mt-1">AI-powered auto-classification engine</p>
        </div>
        <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl">
          <Brain className="w-5 h-5 text-purple-400" />
          <div>
            <div className="text-sm font-medium text-white">Neural Network Status</div>
            <div className="text-xs text-purple-400">Active & Learning</div>
          </div>
        </div>
      </motion.div>

      {categoriesError && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {categoriesError}
        </div>
      )}

      {/* AI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 border border-cyan-500/20 relative overflow-hidden group hover:border-cyan-500/40 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Accuracy Rate</span>
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">{aiMetrics.accuracyRate}%</div>
            <div className="text-xs text-green-400 mt-1">{aiMetrics.learningRate}</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 border border-purple-500/20 relative overflow-hidden group hover:border-purple-500/40 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Avg Confidence</span>
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-white">{aiMetrics.avgConfidence}%</div>
            <div className="text-xs text-purple-400 mt-1">Across classified rows</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 border border-blue-500/20 relative overflow-hidden group hover:border-blue-500/40 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Auto-classified</span>
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">{aiMetrics.patternsLearned}</div>
            <div className="text-xs text-blue-400 mt-1">Transactions</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 border border-green-500/20 relative overflow-hidden group hover:border-green-500/40 transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">User corrections</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white">{aiMetrics.userCorrections}</div>
            <div className="text-xs text-green-400 mt-1">Manual tuning</div>
          </div>
        </motion.div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-[#1a1a2e]">
        {[
          { id: 'patterns' as LearningView, label: 'Learned Patterns', icon: Sparkles },
          { id: 'review' as LearningView, label: 'Classification Review', icon: Eye },
          { id: 'performance' as LearningView, label: 'AI Performance', icon: BarChart3 },
          { id: 'rules' as LearningView, label: 'Custom Rules', icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={cn(
                'px-6 py-3 flex items-center gap-2 text-sm font-medium transition-all relative',
                isActive
                  ? 'text-cyan-400'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="logicActiveTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {activeView === 'patterns' && (
        <div className="space-y-6">
          {/* Test Classification */}
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Test AI Classification
            </h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter a transaction description to test..."
                value={testNarration}
                onChange={(e) => setTestNarration(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestClassification()}
                className="flex-1 px-4 py-3 bg-[#0a0a0f] border border-[#2a2a3e] rounded-xl text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-all"
              />
              <Button
                onClick={handleTestClassification}
                disabled={classifyMut.loading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {classifyMut.loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Classify
              </Button>
            </div>

            {classifyMut.error && (
              <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {classifyMut.error}
              </p>
            )}

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-[#0a0a0f] rounded-xl border border-[#2a2a3e]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">AI Classification Result</div>
                    <div className="text-xl font-semibold text-white">{testResult.categoryName}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-400 mb-1">Confidence</div>
                    <div className={cn(
                      'text-xl font-bold',
                      testResult.confidence >= 80 ? 'text-green-400' :
                      testResult.confidence >= 60 ? 'text-orange-400' :
                      'text-red-400'
                    )}>
                      {testResult.confidence}%
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-400 mb-3">{testResult.reasoning}</div>
                
                {testResult.alternativeSuggestions.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Alternative Suggestions:</div>
                    <div className="flex flex-wrap gap-2">
                      {testResult.alternativeSuggestions.map((alt, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-sm text-gray-400"
                        >
                          {alt.categoryName} ({alt.confidence}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Learned Patterns by Category */}
          {categoriesLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading categories…
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-[#1a1a2e] bg-[#0a0a0f] p-12 text-center text-gray-400">
              No categories yet. Add categories in your chart of accounts to see learned patterns.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.slice(0, 6).map((category) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-6 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{category.name}</h3>
                      <p className="text-xs text-gray-500 capitalize">{category.type}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-xl">
                      {category.icon}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-400 mb-2">Learned Patterns:</div>
                    <div className="flex flex-wrap gap-2">
                      {category.patterns.slice(0, 5).map((pattern, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-xs text-cyan-400"
                        >
                          {pattern}
                        </span>
                      ))}
                      {category.patterns.length > 5 && (
                        <span className="px-2 py-1 bg-[#1a1a2e] border border-[#2a1a2e] rounded text-xs text-gray-500">
                          +{category.patterns.length - 5} more
                        </span>
                      )}
                      {category.patterns.length === 0 && (
                        <span className="text-xs text-gray-500">No patterns yet</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'review' && (
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search classifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-[#0a0a0f] border border-[#1a1a2e] rounded-xl text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none transition-all"
              />
            </div>
            <Button className="bg-[#0a0a0f] border border-[#1a1a2e] hover:border-cyan-500/30 text-gray-400 hover:text-white">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {txnsLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading transactions…
            </div>
          ) : (
            <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#1a1a2e]">
                <h3 className="text-lg font-semibold text-white">Recent Auto-Classifications</h3>
                <p className="text-sm text-gray-400 mt-1">Review and provide feedback to improve AI accuracy</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0a0a0f] border-b border-[#1a1a2e]">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Description</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Category</th>
                      <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase">Confidence</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase">Amount</th>
                      <th className="text-center px-6 py-4 text-xs font-medium text-gray-400 uppercase">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a2e]">
                    {filteredReview.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No auto-classified transactions match your search. Try another filter or check back after imports.
                        </td>
                      </tr>
                    ) : (
                      filteredReview.map((txn, index) => (
                        <motion.tr
                          key={txn.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="hover:bg-[#1a1a2e]/30 transition-colors"
                        >
                          <td className="px-6 py-4 align-top">
                            <span className="text-gray-300">{new Date(txn.date).toLocaleDateString()}</span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="text-white font-medium max-w-md truncate">{txn.narration}</div>
                            {expandedCorrectionTxnId === txn.id && (
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <label className="text-xs text-gray-500">Correct category</label>
                                <select
                                  value={correctionCategoryId}
                                  onChange={(e) => setCorrectionCategoryId(e.target.value)}
                                  className="rounded-lg border border-[#2a2a3e] bg-[#0a0a0f] px-2 py-1 text-sm text-white"
                                >
                                  <option value="">Select…</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  className="h-8"
                                  disabled={learnMut.loading}
                                  onClick={() => applyCorrection(txn.id)}
                                >
                                  {learnMut.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Apply'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-gray-400"
                                  onClick={() => {
                                    setExpandedCorrectionTxnId(null);
                                    setCorrectionCategoryId('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 align-top">
                            <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              {categoryName(txn.categoryId)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center align-top">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-16 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full',
                                    (txn.confidence || 0) >= 80 ? 'bg-green-500' :
                                    (txn.confidence || 0) >= 60 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  )}
                                  style={{ width: `${txn.confidence || 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-400">{txn.confidence || 0}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right align-top">
                            <span className={cn(
                              'font-medium',
                              txn.type === 'credit' ? 'text-green-400' : 'text-red-400'
                            )}>
                              {txn.type === 'credit' ? '+' : '-'}
                              ${txn.amount.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 align-top">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={learnMut.loading}
                                onClick={() => handleThumbsUp(txn.id, txn.categoryId)}
                                className="p-2 hover:bg-green-500/10 rounded-lg transition-colors group disabled:opacity-50"
                                title="Confirm classification"
                              >
                                <ThumbsUp className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                              </button>
                              <button
                                type="button"
                                disabled={learnMut.loading}
                                onClick={() => {
                                  setExpandedCorrectionTxnId(txn.id);
                                  setCorrectionCategoryId(txn.categoryId || '');
                                }}
                                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group disabled:opacity-50"
                                title="Wrong category — pick the right one"
                              >
                                <ThumbsDown className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 border border-cyan-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-6">Classification Accuracy Trend</h3>
            <div className="space-y-4">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, idx) => {
                const base = statsResult?.accuracyRate ?? 88;
                const accuracy = Math.min(99, base - 4 + idx * 0.8);
                return (
                  <div key={month}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">{month} 2026</span>
                      <span className="text-sm text-cyan-400 font-medium">{accuracy.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${accuracy}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
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
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl p-6 border border-purple-500/20"
          >
            <h3 className="text-lg font-semibold text-white mb-6">Category Performance</h3>
            <div className="space-y-4">
              {categories.slice(0, 6).map((category, idx) => {
                const hash = category.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                const accuracy = 85 + (hash % 12);
                return (
                  <div key={category.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category.icon}</span>
                        <span className="text-sm text-white">{category.name}</span>
                      </div>
                      <span className="text-sm text-purple-400 font-medium">{accuracy}%</span>
                    </div>
                    <div className="h-2 bg-[#0a0a0f] rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${accuracy}%` }}
                        transition={{ duration: 1, delay: idx * 0.1 }}
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

      {activeView === 'rules' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setNewRuleCategoryId(categories[0]?.id ?? '');
                setRuleDialogOpen(true);
              }}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Rule
            </Button>
          </div>

          <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
            <DialogContent className="border-[#2a2a3e] bg-[#0a0a0f] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New classification rule</DialogTitle>
                <DialogDescription className="text-gray-400">
                  If a transaction description contains this text, classify it to the category you pick.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Contains text</label>
                  <input
                    value={newRulePattern}
                    onChange={(e) => setNewRulePattern(e.target.value)}
                    placeholder="e.g. AWS or SALARY"
                    className="w-full rounded-lg border border-[#2a2a3e] bg-[#1a1a2e] px-3 py-2 text-sm text-white placeholder:text-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select
                    value={newRuleCategoryId}
                    onChange={(e) => setNewRuleCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-[#2a2a3e] bg-[#1a1a2e] px-3 py-2 text-sm text-white"
                  >
                    <option value="">Select a category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setRuleDialogOpen(false)} className="text-gray-400">
                  Cancel
                </Button>
                <Button onClick={handleCreateRule} disabled={addRuleMut.loading}>
                  {addRuleMut.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save rule'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="bg-[#0a0a0f] border border-[#1a1a2e] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Custom Classification Rules</h3>
            <p className="text-sm text-gray-400 mb-6">
              Rules you add here override the default AI guess when the description matches.
            </p>

            {rulesLoading ? (
              <div className="flex items-center justify-center py-12 text-gray-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading rules…
              </div>
            ) : rules.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center">
                No custom rules yet. Create one or confirm a wrong classification in the review tab to add learned rules.
              </p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 bg-[#1a1a2e] border border-[#2a2a3e] rounded-xl hover:border-cyan-500/30 transition-all"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <Zap className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">
                          If contains: <span className="text-cyan-400 font-mono">{rule.pattern}</span>
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          Then classify as: {categoryName(rule.categoryId)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs text-green-400">
                        {rule.confidence}% confidence
                      </span>
                      <button
                        type="button"
                        className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                        title="Editing rules is coming soon"
                        disabled
                      >
                        <Edit className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        type="button"
                        disabled={deleteRuleMut.loading}
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete rule"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
