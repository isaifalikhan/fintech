import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Shield, Lock, Mail, ArrowLeft } from 'lucide-react';
import { mockUsers, mockOrganizationMembers } from '@/data/mockDatabase';
import { useTheme } from '@/contexts/ThemeContext';

interface AdminLoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function AdminLoginPage({ onLogin }: AdminLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanProgress, setScanProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading && scanProgress < 100) {
      const timer = setTimeout(() => {
        setScanProgress(prev => Math.min(prev + 10, 100));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isLoading, scanProgress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setScanProgress(0);
    setError('');

    try {
      await onLogin(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid admin credentials.');
    } finally {
      setIsLoading(false);
      setScanProgress(0);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('demo');
    setIsLoading(true);
    setScanProgress(0);
    setError('');

    try {
      await onLogin(demoEmail, 'demo');
      navigate('/dashboard');
    } catch (err) {
      setError('Login failed.');
    } finally {
      setIsLoading(false);
      setScanProgress(0);
    }
  };

  // Filter org admin users (owners and admins in organizations)
  const adminUsers = mockUsers.filter(u => {
    const membership = mockOrganizationMembers.find(m => m.userId === u.id && (m.role === 'owner' || m.role === 'admin'));
    return !!membership;
  });

  const { theme } = useTheme();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-black' : 'bg-gradient-to-br from-slate-50 to-slate-100'} flex items-center justify-center p-4 relative overflow-hidden`}>
      {/* Animated Grid Background */}
      <div className={`absolute inset-0 ${theme === 'dark' ? 'opacity-20' : 'opacity-10'}`} style={{
        backgroundImage: `
          linear-gradient(${theme === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.15)'} 1px, transparent 1px),
          linear-gradient(90deg, ${theme === 'dark' ? 'rgba(6, 182, 212, 0.1)' : 'rgba(6, 182, 212, 0.15)'} 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        animation: 'grid-flow 20s linear infinite'
      }}></div>

      {/* Cyan Glowing Orbs */}
      <div className={`absolute top-20 left-20 w-96 h-96 ${theme === 'dark' ? 'bg-cyan-500/20' : 'bg-cyan-400/10'} rounded-full blur-[120px] animate-pulse`}></div>
      <div className={`absolute bottom-20 right-20 w-96 h-96 ${theme === 'dark' ? 'bg-cyan-600/20' : 'bg-blue-400/10'} rounded-full blur-[120px] animate-pulse`} style={{ animationDelay: '1s' }}></div>

      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate('/')}
        className={`absolute top-8 left-8 flex items-center gap-2 ${theme === 'dark' ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-600 hover:text-cyan-700'} transition-colors font-mono`}
      >
        <ArrowLeft className="size-5" />
        <span>Back to Portal</span>
      </motion.button>

      <div className="w-full max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="size-20 rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center relative shadow-2xl shadow-cyan-500/50">
                <Shield className="size-10 text-white drop-shadow-lg" />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 blur-2xl opacity-60 animate-pulse" />
              </div>
            </div>
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 bg-clip-text text-transparent' : 'text-slate-900'} mb-2`}>Organization Admin</h1>
            <p className={`${theme === 'dark' ? 'text-cyan-400/70' : 'text-cyan-600/90'} font-mono`}>Organization Administration Portal</p>
          </div>

          {/* Login Card */}
          <Card className={`${theme === 'dark' ? 'bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-950/80 border-cyan-500/30' : 'bg-white/80 border-cyan-400/40'} backdrop-blur-xl relative overflow-hidden shadow-2xl shadow-cyan-500/20`}>
            {/* Vibrant Glowing Border Effect */}
            <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20' : 'bg-gradient-to-r from-cyan-400/10 to-blue-400/10'} opacity-60`}></div>
            
            {/* Animated corner accents */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-500/30 to-transparent blur-2xl opacity-70"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-500/30 to-transparent blur-2xl opacity-70"></div>

            <CardHeader className="relative">
              <CardTitle className={`text-2xl ${theme === 'dark' ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
                <Lock className="size-6 text-cyan-400 drop-shadow-lg" />
                Org Admin Authentication
              </CardTitle>
              <CardDescription className={`${theme === 'dark' ? 'text-cyan-400/70' : 'text-cyan-600/80'} font-mono`}>
                Enter organization admin credentials
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 relative">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="space-y-2">
                  <Label className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} font-mono`}>Admin Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cyan-400" />
                    <Input
                      type="email"
                      placeholder="john.doe@agency.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`${theme === 'dark' ? 'bg-slate-950/50 border-cyan-500/30 text-white' : 'bg-slate-50 border-cyan-400/40 text-slate-900'} pl-10 h-12 focus:border-cyan-500/50 font-mono`}
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-2">
                  <Label className={`${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} font-mono`}>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-cyan-400" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${theme === 'dark' ? 'bg-slate-950/50 border-cyan-500/30 text-white' : 'bg-slate-50 border-cyan-400/40 text-slate-900'} pl-10 h-12 focus:border-cyan-500/50 font-mono`}
                      required
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
                  >
                    <p className="text-red-400 text-sm font-mono">{error}</p>
                  </motion.div>
                )}

                {/* Loading Progress */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 text-sm font-mono">Authenticating...</span>
                      <span className="text-cyan-400 text-sm font-mono">{scanProgress}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600"
                        style={{ width: `${scanProgress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold text-lg relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/0 to-cyan-400/0 group-hover:from-cyan-400/20 group-hover:to-cyan-500/20 transition-all"></div>
                  <span className="relative z-10 font-mono">
                    {isLoading ? 'AUTHENTICATING...' : 'ACCESS ADMIN PANEL'}
                  </span>
                </Button>
              </form>

              {/* Divider */}
              {adminUsers.length > 0 && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-cyan-500/20"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className={`${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/80'} px-2 text-cyan-400/70 font-mono`}>QUICK ACCESS</span>
                    </div>
                  </div>

                  {/* Demo Admin Accounts */}
                  <div className="space-y-2">
                    {adminUsers.map((user, index) => (
                      <motion.button
                        key={user.email}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                        onClick={() => handleDemoLogin(user.email)}
                        disabled={isLoading}
                        className={`w-full p-3 ${theme === 'dark' ? 'bg-slate-950/50 hover:bg-slate-950/80' : 'bg-slate-50 hover:bg-slate-100'} border border-cyan-500/20 hover:border-cyan-500/40 rounded-lg transition-all group text-left relative overflow-hidden`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:to-cyan-600/5 transition-all"></div>
                        <div className="flex items-center gap-3 relative z-10">
                          <div className="size-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 flex items-center justify-center">
                            <Shield className="size-4 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <p className={`text-sm font-medium font-mono ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                            <p className="text-cyan-400/70 text-xs font-mono">{user.email}</p>
                          </div>
                          <span className="text-xs text-cyan-400 font-mono">ORG ADMIN</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Footer Note */}
                  <p className={`text-xs text-center ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'} font-mono`}>
                    Demo account — click a name above to sign in instantly
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes grid-flow {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
      `}</style>
    </div>
  );
}