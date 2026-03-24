import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameCard } from '@/components/GameCard';
import { Gamepad2, Hand, Keyboard, Zap, Monitor, Wifi } from 'lucide-react';

export default function GameLibrary() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('neon_current_user');
    if (!stored) {
      navigate('/auth');
      return;
    }
    setUser(JSON.parse(stored));
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('neon_current_user');
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="hero-gradient absolute inset-0 pointer-events-none" />
      <div className="scanline absolute inset-0 pointer-events-none opacity-10" />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-primary" />
          <span className="font-display text-lg font-bold tracking-wider text-foreground">
            NEON<span className="text-primary">ARCADE</span>
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 font-body text-sm text-muted-foreground">
          <span className="text-foreground cursor-default">Games</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Leaderboard</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">About</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-body text-sm text-muted-foreground hidden sm:block">
            👾 {user.username || user.email}
          </span>
          <button
            onClick={handleLogout}
            className="px-5 py-2 rounded-lg border border-primary/50 font-display text-xs font-bold tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            LOGOUT
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 px-6 md:px-12">
        <div className="max-w-6xl mx-auto pt-16 pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-body text-xs text-primary font-semibold tracking-wider uppercase">Hand Tracking Powered</span>
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight text-foreground leading-[1.1] mb-6">
              <span className="neon-text text-primary">UNLIMITED</span>
              <br />
              GAMES HEAVEN
            </h1>
            <p className="font-body text-xl text-muted-foreground max-w-lg leading-relaxed mb-8">
              Play with your hands — or your keyboard. Camera-powered gesture controls meet classic arcade games in a neon-lit world.
            </p>
            <a
              href="#games"
              className="inline-flex items-center gap-2 px-8 py-3 rounded-lg border-2 border-primary font-display text-sm font-bold tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 neon-border"
            >
              PLAY NOW
              <span className="text-lg">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Games Section */}
      <div id="games" className="relative z-10 px-6 md:px-12 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              TOP <span className="text-secondary neon-text-pink">GAMES</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <GameCard
              title="Flappy Bird"
              description="Navigate through pipes by raising your hand or pressing Space. How far can you fly?"
              icon="🐦"
              route="/flappy-bird"
              color="purple"
            />
            <GameCard
              title="Pong"
              description="Move your hand up and down to control the paddle — or use arrow keys. Beat the AI!"
              icon="🏓"
              route="/pong"
              color="pink"
            />
            <GameCard
              title="Car Dodge"
              description="Dodge oncoming traffic across 3 lanes! Move your hand left and right — or use arrow keys."
              icon="🏎️"
              route="/car-dodge"
              color="blue"
            />
            <GameCard
              title="Brick Breaker"
              description="Smash all the bricks! Move your hand left and right to control the paddle."
              icon="🧱"
              route="/brick-breaker"
              color="purple"
            />
            <GameCard
              title="Fruit Catch"
              description="Catch falling fruits and dodge bombs! Move your hand to control the basket."
              icon="🍎"
              route="/fruit-catch"
              color="pink"
            />
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 px-6 md:px-12 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              OUR <span className="text-secondary neon-text-pink">FEATURES</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Hand className="w-10 h-10 text-primary" />}
              title="Hand Gesture Controls"
              description="Use your webcam for intuitive hand-tracking gameplay — no controllers needed."
            />
            <FeatureCard
              icon={<Monitor className="w-10 h-10 text-secondary" />}
              title="Works On Any Device"
              description="Play on desktop or laptop with a webcam. Keyboard fallback always available."
            />
            <FeatureCard
              icon={<Zap className="w-10 h-10 text-accent" />}
              title="Multiple Difficulty Levels"
              description="Easy, Medium, and Hard modes let you play at your own pace or push your limits."
            />
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="relative z-10 px-6 md:px-12 pb-20">
        <div className="max-w-6xl mx-auto rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-10">
          <h2 className="font-display text-xl font-bold text-foreground mb-6 text-center">HOW TO PLAY</h2>
          <div className="grid md:grid-cols-2 gap-8 font-body text-muted-foreground">
            <div className="flex gap-4">
              <Hand className="w-8 h-8 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-primary font-semibold mb-2 text-lg">Hand Gestures</h3>
                <ul className="space-y-1.5 text-sm">
                  <li>• Allow camera access when prompted</li>
                  <li>• <strong>Flappy Bird:</strong> Raise hand to flap</li>
                  <li>• <strong>Pong:</strong> Move hand up/down</li>
                  <li>• <strong>Car Dodge:</strong> Move hand left/right</li>
                </ul>
              </div>
            </div>
            <div className="flex gap-4">
              <Keyboard className="w-8 h-8 text-secondary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-secondary font-semibold mb-2 text-lg">Keyboard</h3>
                <ul className="space-y-1.5 text-sm">
                  <li>• <strong>Flappy Bird:</strong> Space or ↑</li>
                  <li>• <strong>Pong:</strong> ↑ / ↓ arrow keys</li>
                  <li>• <strong>Car Dodge:</strong> ← / → or A / D</li>
                  <li>• Works alongside or without camera</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 md:px-12 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-bold tracking-wider text-muted-foreground">
              NEON<span className="text-primary">ARCADE</span>
            </span>
          </div>
          <div className="flex items-center gap-6 font-body text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Hand className="w-3.5 h-3.5" /> Hand Tracking
            </span>
            <span className="flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5" /> Keyboard
            </span>
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" /> No Internet Needed
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="feature-card-glow rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 text-center hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
      <div className="flex justify-center mb-5">{icon}</div>
      <h3 className="font-display text-lg font-bold text-foreground mb-3">{title}</h3>
      <p className="font-body text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
