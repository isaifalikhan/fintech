import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Brain, Plus, TrendingUp, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface LogicRule {
  id: number;
  pattern: string;
  category: string;
  confidence: number;
  timesSaved: number;
  lastUsed: string;
  badge: string;
}

const logicRules: LogicRule[] = [
  {
    id: 1,
    pattern: '*AWShosting*gener*',
    category: 'Software & Tools',
    confidence: 98,
    timesSaved: 100,
    lastUsed: '1/1/2025',
    badge: 'AI'
  },
  {
    id: 2,
    pattern: '*salary*large*payroll*',
    category: 'Salaries & Wages',
    confidence: 95,
    timesSaved: 304,
    lastUsed: '12/23/2025',
    badge: 'Automatic'
  },
  {
    id: 3,
    pattern: '*domain*godaddy*namecheap*',
    category: 'Software & Tools',
    confidence: 90,
    timesSaved: 200,
    lastUsed: '12/1/2025',
    badge: 'Automatic'
  },
  {
    id: 4,
    pattern: '*grocery*inperson*set/met*',
    category: 'Personal',
    confidence: 84,
    timesSaved: 123,
    lastUsed: '12/8/2025',
    badge: 'manual'
  },
  {
    id: 5,
    pattern: '*adobe*figma*canva*',
    category: 'Software & Tools',
    confidence: 90,
    timesSaved: 234,
    lastUsed: '12/16/2025',
    badge: 'Automatic'
  }
];

export function LogicLearningCenter() {
  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="size-10 rounded-full bg-cyan-500/10 flex items-center justify-center">
              <Brain className="size-6 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">Logic & Learning Center</h1>
          </div>
          <p className="text-slate-400">Manage narration rules and see how the system learns from your patterns</p>
        </div>
        <Button className="bg-cyan-500 hover:bg-cyan-600">
          <Plus className="size-4 mr-2" />
          Create Rule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-cyan-950/50 to-blue-950/50 border-cyan-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-cyan-300 font-medium">Active Rules</p>
                <Brain className="size-4 text-cyan-400" />
              </div>
              <p className="text-4xl font-bold text-white">294</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-950/50 to-pink-950/50 border-purple-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-purple-300 font-medium">Learning Accuracy</p>
                <TrendingUp className="size-4 text-purple-400" />
              </div>
              <p className="text-4xl font-bold text-white">95%</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-orange-950/50 to-red-950/50 border-orange-500/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-orange-300 font-medium">Confidence Rate</p>
                <TrendingUp className="size-4 text-orange-400" />
              </div>
              <p className="text-4xl font-bold text-white">High</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Logic Rules Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Logic Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {logicRules.map((rule, index) => (
            <motion.div
              key={rule.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-slate-950/80 rounded-lg border border-slate-800 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertCircle className="size-4 text-cyan-400" />
                    <span className="text-white font-mono font-medium">
                      Pattern: "{rule.pattern}"
                    </span>
                    {rule.badge === 'AI' && (
                      <Badge className="bg-cyan-500 text-white text-xs border-0">AI</Badge>
                    )}
                    {rule.badge === 'Automatic' && (
                      <Badge className="bg-blue-500 text-white text-xs border-0">Automatic</Badge>
                    )}
                    {rule.badge === 'manual' && (
                      <Badge className="bg-purple-500 text-white text-xs border-0">manual</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-3">→ Applies to: {rule.category}</p>
                  <div className="flex items-center gap-6 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Confidence:</span>
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full" 
                          style={{ width: `${rule.confidence}%` }}
                        />
                      </div>
                      <span className="text-cyan-400 font-semibold">{rule.confidence}%</span>
                    </div>
                    <span>Time Saved: {rule.timesSaved}</span>
                    <span>Last used: {rule.lastUsed}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                  >
                    Disable
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* How Logic Learning Works */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="size-5 text-cyan-400" />
            <CardTitle className="text-white">How Logic Learning Works</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-cyan-400 font-bold">1</span>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">
                    When you add a transaction or correct a classification, the system extracts the narration pattern
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/80 rounded-lg border border-slate-800">
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 font-bold">2</span>
                </div>
                <div>
                  <p className="text-slate-300 text-sm">
                    Similar narrations in the future are automatically matched to the same category
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
