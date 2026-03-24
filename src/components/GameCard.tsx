import { useNavigate } from 'react-router-dom';

interface GameCardProps {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: 'purple' | 'pink' | 'blue';
}

export function GameCard({ title, description, icon, route, color }: GameCardProps) {
  const navigate = useNavigate();

  const gradientClass = color === 'purple' ? 'card-gradient-purple' : color === 'pink' ? 'card-gradient-pink' : 'card-gradient-blue';
  const borderClass = color === 'purple' ? 'border-primary/30 hover:neon-border' : color === 'pink' ? 'border-secondary/30 hover:neon-border-pink' : 'border-accent/30 hover:neon-border';
  const titleClass = color === 'purple' ? 'text-primary neon-text' : color === 'pink' ? 'text-secondary neon-text-pink' : 'text-accent';
  const ctaClass = color === 'purple' ? 'text-primary border-primary/40 hover:bg-primary hover:text-primary-foreground' : color === 'pink' ? 'text-secondary border-secondary/40 hover:bg-secondary hover:text-primary-foreground' : 'text-accent border-accent/40 hover:bg-accent hover:text-primary-foreground';

  return (
    <button
      onClick={() => navigate(route)}
      className={`game-card-hover relative overflow-hidden rounded-2xl border p-8 text-left w-full ${gradientClass} ${borderClass}`}
    >
      <div className="scanline absolute inset-0 pointer-events-none opacity-20" />
      <div className="relative z-10">
        <div className="text-6xl mb-5">{icon}</div>
        <h3 className={`font-display text-2xl font-bold mb-3 ${titleClass}`}>
          {title}
        </h3>
        <p className="text-muted-foreground font-body text-base leading-relaxed mb-6">
          {description}
        </p>
        <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg border font-display text-xs font-bold tracking-widest uppercase transition-all duration-300 ${ctaClass}`}>
          Play Now
          <span className="text-lg">→</span>
        </div>
      </div>
    </button>
  );
}
