import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (!isLogin && !username) {
      setError('Please enter a username');
      return;
    }

    if (isLogin) {
      const users = JSON.parse(localStorage.getItem('neon_users') || '[]');
      const user = users.find((u: any) => u.email === email && u.password === password);
      if (!user) {
        setError('Invalid email or password');
        return;
      }
      localStorage.setItem('neon_current_user', JSON.stringify(user));
    } else {
      const users = JSON.parse(localStorage.getItem('neon_users') || '[]');
      if (users.find((u: any) => u.email === email)) {
        setError('Email already registered');
        return;
      }
      const newUser = { email, password, username, id: Date.now().toString() };
      users.push(newUser);
      localStorage.setItem('neon_users', JSON.stringify(users));
      localStorage.setItem('neon_current_user', JSON.stringify(newUser));
    }

    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background relative flex items-center justify-center px-4 overflow-hidden">
      {/* Background effects */}
      <div className="hero-gradient absolute inset-0 pointer-events-none" />
      <div className="scanline absolute inset-0 pointer-events-none opacity-10" />
      
      {/* Floating orbs */}
      <div className="absolute top-20 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-secondary/5 blur-3xl animate-float pointer-events-none" style={{ animationDelay: '1.5s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Gamepad2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-foreground mb-2">
            NEON<span className="text-primary neon-text">ARCADE</span>
          </h1>
          <p className="font-body text-muted-foreground text-sm">
            {isLogin ? 'Welcome back, player.' : 'Create your arcade identity.'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-8">
          <div className="flex mb-8 rounded-xl overflow-hidden border border-border">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3 font-display text-sm font-bold tracking-wider transition-all duration-300 ${
                isLogin
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              LOGIN
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3 font-display text-sm font-bold tracking-wider transition-all duration-300 ${
                !isLogin
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              SIGN UP
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="font-display text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your callsign"
                  className="w-full h-12 rounded-xl border border-border bg-background/80 px-4 font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="font-display text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="player@neonarcade.io"
                className="w-full h-12 rounded-xl border border-border bg-background/80 px-4 font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="font-display text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 rounded-xl border border-border bg-background/80 px-4 font-body text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 font-body text-sm text-destructive">
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full h-13 py-3.5 rounded-xl font-display text-sm font-bold tracking-widest transition-all duration-300 hover:scale-[1.02] ${
                isLogin
                  ? 'bg-primary text-primary-foreground hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)]'
                  : 'bg-secondary text-secondary-foreground hover:shadow-[0_0_30px_hsl(var(--secondary)/0.5)]'
              }`}
            >
              {isLogin ? 'ENTER ARCADE' : 'CREATE ACCOUNT'}
            </button>
          </form>

          <p className="mt-6 text-center font-body text-sm text-muted-foreground">
            {isLogin ? "Don't have an account? " : 'Already a player? '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className={`font-semibold transition-colors ${isLogin ? 'text-primary hover:text-primary/80' : 'text-secondary hover:text-secondary/80'}`}
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center font-body text-xs text-muted-foreground/50">
          🕹️ Hand-tracking powered arcade games
        </p>
      </div>
    </div>
  );
}
