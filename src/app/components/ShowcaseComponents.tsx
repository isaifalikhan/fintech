import { useState } from 'react';
import { motion } from 'motion/react';
import {
  HolographicCard,
  NeuralBackground,
  LiquidOrb,
  DataStreamingEffect,
  GlassCard,
  FloatingParticles,
  HolographicOverlay,
  DataMatrix,
  NeonButton,
  PulseButton,
  HolographicLoader,
  QuantumLoader,
  MetricParticles,
  DataOrbs,
  SpotlightCursor,
  InteractiveCard,
  AnimatedMetric,
  EnhancedChart
} from './ui';
import { TrendingUp, Zap, Target, Activity } from 'lucide-react';

export function ShowcaseComponents() {
  const [showParticles, setShowParticles] = useState(false);

  return (
    <div className="min-h-screen p-8" style={{ background: '#0a0a0a' }}>
      {/* Background effects */}
      <NeuralBackground />
      <SpotlightCursor />
      
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1
            className="text-6xl font-bold mb-4"
            style={{
              background: 'linear-gradient(135deg, #2dd4ff, #a855f7, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Finance OS 2070
          </h1>
          <p className="text-slate-400 text-xl">Revolutionary UI Component Showcase</p>
        </motion.div>

        {/* Section 1: Cards & Overlays */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Advanced Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Holographic Card */}
            <HolographicCard
              glowColor="#2dd4ff"
              intensity="high"
              className="p-6 rounded-2xl"
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(45, 212, 255, 0.3)',
              }}
            >
              <div className="relative">
                <h3 className="text-xl font-bold text-white mb-2">Holographic Card</h3>
                <p className="text-slate-400 text-sm mb-4">
                  3D tilt effect with mouse tracking
                </p>
                <div className="flex items-center gap-2">
                  <LiquidOrb size={60} colors={['#2dd4ff', '#a855f7']} />
                </div>
              </div>
            </HolographicCard>

            {/* Glass Card */}
            <GlassCard
              depth="deep"
              glow
              glowColor="#a855f7"
              className="p-6 rounded-2xl"
            >
              <h3 className="text-xl font-bold text-white mb-2">Glass Morphism</h3>
              <p className="text-slate-400 text-sm mb-4">
                Advanced glassmorphism with depth
              </p>
              <DataStreamingEffect height={40} color="#a855f7" />
            </GlassCard>

            {/* Interactive Card */}
            <InteractiveCard
              glowColor="#ec4899"
              className="p-6 rounded-2xl glass-medium"
            >
              <h3 className="text-xl font-bold text-white mb-2">Interactive Card</h3>
              <p className="text-slate-400 text-sm mb-4">
                Dynamic spotlight with 3D rotation
              </p>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-pink-500 glow-pink-medium" />
                <div className="w-8 h-8 rounded-full bg-purple-500 glow-purple-medium" />
                <div className="w-8 h-8 rounded-full bg-cyan-500 glow-cyan-medium" />
              </div>
            </InteractiveCard>
          </div>
        </section>

        {/* Section 2: Buttons */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Revolutionary Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <NeonButton variant="primary" icon={<Zap className="w-4 h-4" />}>
              Primary Action
            </NeonButton>
            <NeonButton variant="secondary" icon={<Target className="w-4 h-4" />}>
              Secondary Action
            </NeonButton>
            <NeonButton variant="success" icon={<TrendingUp className="w-4 h-4" />}>
              Success Action
            </NeonButton>
            <NeonButton variant="danger" icon={<Activity className="w-4 h-4" />}>
              Danger Action
            </NeonButton>
            <PulseButton color="#2dd4ff">
              Pulse Effect
            </PulseButton>
            <PulseButton color="#10b981">
              Another Pulse
            </PulseButton>
          </div>
        </section>

        {/* Section 3: Loaders */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Futuristic Loaders</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-8 rounded-2xl flex flex-col items-center gap-4">
              <HolographicLoader size={80} color="#2dd4ff" />
              <p className="text-slate-400 text-sm">Holographic Loader</p>
            </GlassCard>

            <GlassCard className="p-8 rounded-2xl flex flex-col items-center gap-4">
              <QuantumLoader size={80} colors={['#2dd4ff', '#a855f7', '#ec4899']} />
              <p className="text-slate-400 text-sm">Quantum Loader</p>
            </GlassCard>

            <GlassCard className="p-8 rounded-2xl flex flex-col items-center gap-4">
              <div className="relative">
                <LiquidOrb size={80} colors={['#10b981', '#06b6d4']} intensity="high" />
              </div>
              <p className="text-slate-400 text-sm">Liquid Orb</p>
            </GlassCard>
          </div>
        </section>

        {/* Section 4: Animated Metrics */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Animated Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <AnimatedMetric
              label="Total Revenue"
              value={2847650}
              prefix="PKR "
              trend="up"
              trendValue="+12.5%"
              icon={<TrendingUp className="w-8 h-8" />}
              color="#10b981"
              formatValue={(v) => v.toLocaleString()}
              delay={0}
            />
            <AnimatedMetric
              label="Active Users"
              value={15847}
              trend="up"
              trendValue="+8.2%"
              icon={<Activity className="w-8 h-8" />}
              color="#2dd4ff"
              delay={0.1}
            />
            <AnimatedMetric
              label="Conversion Rate"
              value={34.7}
              suffix="%"
              trend="down"
              trendValue="-2.1%"
              icon={<Target className="w-8 h-8" />}
              color="#ec4899"
              delay={0.2}
            />
            <AnimatedMetric
              label="Performance"
              value={94.3}
              suffix="/100"
              trend="up"
              trendValue="+5.6%"
              icon={<Zap className="w-8 h-8" />}
              color="#a855f7"
              delay={0.3}
            />
          </div>
        </section>

        {/* Section 5: Overlays & Effects */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Overlay Effects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Holographic Overlay */}
            <HolographicOverlay intensity="high" animated>
              <GlassCard className="p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">
                  Holographic Overlay
                </h3>
                <p className="text-slate-400 text-sm mb-4">
                  Scanning grid with animated sweep effect
                </p>
                <div className="h-32 flex items-center justify-center">
                  <p className="text-cyan-400 font-mono text-sm">SYSTEM ACTIVE</p>
                </div>
              </GlassCard>
            </HolographicOverlay>

            {/* Data Matrix */}
            <div className="relative p-8 rounded-2xl overflow-hidden glass-medium">
              <DataMatrix density={0.98} speed={80} characters="01" color="#10b981" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-2">Data Matrix</h3>
                <p className="text-slate-400 text-sm mb-4">
                  Matrix-style streaming data effect
                </p>
                <div className="h-32 flex items-center justify-center">
                  <p className="text-green-400 font-mono text-sm">PROCESSING DATA...</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 6: Particle Effects */}
        <section>
          <h2 className="text-3xl font-bold text-white mb-6">Particle Systems</h2>
          <div className="relative p-12 rounded-2xl glass-medium overflow-hidden">
            <FloatingParticles
              count={40}
              colors={['#2dd4ff', '#a855f7', '#ec4899', '#10b981']}
              speed={0.8}
            />
            <DataOrbs count={6} colors={['#2dd4ff', '#a855f7']} />
            <div className="relative z-10 text-center">
              <h3 className="text-3xl font-bold text-white mb-4">
                Floating Particles & Data Orbs
              </h3>
              <p className="text-slate-400 mb-8">
                Ambient particle effects for enhanced atmosphere
              </p>
              <NeonButton
                variant="primary"
                onClick={() => setShowParticles(!showParticles)}
              >
                {showParticles ? 'Hide' : 'Show'} Metric Particles
              </NeonButton>
              {showParticles && (
                <div className="mt-8 relative inline-block">
                  <div className="text-5xl font-bold gradient-text-holographic">
                    1,234,567
                  </div>
                  <MetricParticles value={1234567} prefix="PKR " color="#2dd4ff" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center py-12"
        >
          <p className="text-slate-500 text-sm">
            Finance OS 2070 • Revolutionary UI/UX Design System
          </p>
        </motion.div>
      </div>
    </div>
  );
}
