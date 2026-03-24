import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHandTracking, HandPosition } from '@/hooks/useHandTracking';
import { Hand, Keyboard, ArrowLeft } from 'lucide-react';

const W = 480, H = 600;
const PADDLE_W = 90, PADDLE_H = 14;
const BALL_R = 7;
const BRICK_ROWS = 6, BRICK_COLS = 8;
const BRICK_W = W / BRICK_COLS - 4, BRICK_H = 18, BRICK_PAD = 4, BRICK_TOP = 50;

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTY_SETTINGS: Record<Difficulty, { ballSpeed: number; paddleW: number; lives: number }> = {
  easy: { ballSpeed: 3.5, paddleW: 110, lives: 5 },
  medium: { ballSpeed: 5, paddleW: 90, lives: 3 },
  hard: { ballSpeed: 7, paddleW: 70, lives: 2 },
};

interface Brick { x: number; y: number; alive: boolean; color: string }

const BRICK_COLORS = [
  'hsl(0,100%,55%)', 'hsl(30,100%,55%)', 'hsl(50,100%,55%)',
  'hsl(120,100%,45%)', 'hsl(200,100%,55%)', 'hsl(280,100%,60%)',
];

function createBricks(): Brick[] {
  const bricks: Brick[] = [];
  for (let r = 0; r < BRICK_ROWS; r++) {
    for (let c = 0; c < BRICK_COLS; c++) {
      bricks.push({
        x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD / 2 + 2,
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        alive: true,
        color: BRICK_COLORS[r],
      });
    }
  }
  return bricks;
}

export default function BrickBreakerGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'dead'>('idle');
  const [handEnabled, setHandEnabled] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const gs = useRef({
    paddleX: W / 2 - PADDLE_W / 2,
    ballX: W / 2, ballY: H - 40,
    dx: 0, dy: 0,
    bricks: createBricks(),
    score: 0, lives: 3,
    playing: false, launched: false,
    handX: -1,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  const resetGame = useCallback(() => {
    const s = DIFFICULTY_SETTINGS[diffRef.current];
    const g = gs.current;
    g.paddleX = W / 2 - s.paddleW / 2;
    g.ballX = W / 2; g.ballY = H - 40;
    g.dx = 0; g.dy = 0;
    g.bricks = createBricks();
    g.score = 0; g.lives = s.lives;
    g.playing = false; g.launched = false;
    setScore(0); setLives(s.lives);
    setGameState('idle');
  }, []);

  const launch = useCallback(() => {
    if (gs.current.launched) return;
    const s = DIFFICULTY_SETTINGS[diffRef.current];
    gs.current.dx = s.ballSpeed * 0.7;
    gs.current.dy = -s.ballSpeed;
    gs.current.launched = true;
    gs.current.playing = true;
    setGameState('playing');
  }, []);

  const onHandFrame = useCallback((hand: HandPosition | null) => {
    if (hand) gs.current.handX = hand.x;
    else gs.current.handX = -1;
  }, []);

  const { setVideoElement, isReady: handReady, error: handError } = useHandTracking({
    enabled: handEnabled, onFrame: onHandFrame,
  });

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
      if (e.key === ' ' || e.key === 'ArrowUp') { e.preventDefault(); launch(); }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [launch]);

  useEffect(() => { resetGame(); }, [difficulty, resetGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const g = gs.current;
      const s = DIFFICULTY_SETTINGS[diffRef.current];
      const pw = s.paddleW;

      // Paddle movement
      const speed = 7;
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) g.paddleX -= speed;
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) g.paddleX += speed;
      if (g.handX >= 0) {
        const target = g.handX * W - pw / 2;
        g.paddleX += (target - g.paddleX) * 0.25;
      }
      g.paddleX = Math.max(0, Math.min(W - pw, g.paddleX));

      if (!g.launched) {
        g.ballX = g.paddleX + pw / 2;
        g.ballY = H - 40;
      }

      if (g.playing && g.launched) {
        g.ballX += g.dx;
        g.ballY += g.dy;

        // Wall bounces
        if (g.ballX <= BALL_R || g.ballX >= W - BALL_R) g.dx = -g.dx;
        if (g.ballY <= BALL_R) g.dy = -g.dy;

        // Paddle bounce
        if (g.ballY + BALL_R >= H - 28 && g.ballY + BALL_R <= H - 14 &&
            g.ballX >= g.paddleX && g.ballX <= g.paddleX + pw) {
          g.dy = -Math.abs(g.dy);
          const hit = (g.ballX - g.paddleX) / pw - 0.5;
          g.dx = hit * s.ballSpeed * 1.5;
        }

        // Brick collision
        for (const brick of g.bricks) {
          if (!brick.alive) continue;
          if (g.ballX + BALL_R > brick.x && g.ballX - BALL_R < brick.x + BRICK_W &&
              g.ballY + BALL_R > brick.y && g.ballY - BALL_R < brick.y + BRICK_H) {
            brick.alive = false;
            g.dy = -g.dy;
            g.score++;
            setScore(g.score);
            break;
          }
        }

        // Check win
        if (g.bricks.every(b => !b.alive)) {
          g.playing = false;
          setGameState('won');
        }

        // Ball falls
        if (g.ballY > H + 20) {
          g.lives--;
          setLives(g.lives);
          if (g.lives <= 0) {
            g.playing = false;
            setGameState('dead');
          } else {
            g.launched = false;
            g.ballX = g.paddleX + pw / 2;
            g.ballY = H - 40;
          }
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = 'rgba(128,0,255,0.06)';
      for (let i = 0; i < W; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let i = 0; i < H; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

      // Bricks
      for (const b of g.bricks) {
        if (!b.alive) continue;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, BRICK_W, BRICK_H);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(b.x, b.y, BRICK_W, 3);
      }

      // Paddle
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.roundRect(g.paddleX, H - 28, pw, PADDLE_H, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Ball
      ctx.shadowColor = '#f0abfc';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#f0abfc';
      ctx.beginPath();
      ctx.arc(g.ballX, g.ballY, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Overlays
      ctx.font = 'bold 16px Orbitron';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${g.score}`, 10, 25);
      ctx.textAlign = 'right';
      ctx.fillText(`Lives: ${g.lives}`, W - 10, 25);

      if (!g.launched && g.playing === false && gameState === 'idle') {
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px Orbitron';
        ctx.fillStyle = '#a855f7';
        ctx.fillText('PRESS SPACE TO START', W / 2, H / 2);
        ctx.font = '14px Rajdhani';
        ctx.fillStyle = '#888';
        ctx.fillText('← → or Hand to move paddle', W / 2, H / 2 + 30);
      }

      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px Orbitron';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
        ctx.font = '16px Rajdhani';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Final Score: ${g.score}`, W / 2, H / 2 + 25);
        ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 50);
      }

      if (gameState === 'won') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px Orbitron';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('YOU WIN!', W / 2, H / 2 - 10);
        ctx.font = '16px Rajdhani';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Score: ${g.score}`, W / 2, H / 2 + 25);
        ctx.fillText('Press SPACE to play again', W / 2, H / 2 + 50);
      }
    };

    loop();
    return () => cancelAnimationFrame(raf);
  }, [gameState]);

  const diffColors: Record<Difficulty, string> = {
    easy: 'border-green-500/50 text-green-400 hover:bg-green-500',
    medium: 'border-yellow-500/50 text-yellow-400 hover:bg-yellow-500',
    hard: 'border-red-500/50 text-red-400 hover:bg-red-500',
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center relative overflow-hidden">
      <div className="hero-gradient absolute inset-0 pointer-events-none" />

      <div className="relative z-10 w-full max-w-xl px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-body text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-display text-xl font-bold text-primary neon-text">BRICK BREAKER</h1>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                className={`px-3 py-1 rounded border font-display text-[10px] font-bold tracking-wider uppercase transition-all ${diffColors[d]} ${difficulty === d ? 'bg-opacity-100 !text-background' : ''} ${difficulty === d ? (d === 'easy' ? '!bg-green-500' : d === 'medium' ? '!bg-yellow-500' : '!bg-red-500') : ''}`}
              >{d}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-3">
            <button onClick={() => setHandEnabled(!handEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-display text-xs font-bold tracking-wider transition-all ${handEnabled ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              <Hand className="w-3.5 h-3.5" /> {handEnabled ? 'ON' : 'OFF'}
            </button>
            {(gameState === 'dead' || gameState === 'won') && (
              <button onClick={() => { resetGame(); launch(); }} className="px-3 py-1.5 rounded-lg border border-secondary/50 text-secondary font-display text-xs font-bold tracking-wider hover:bg-secondary/20 transition-all">
                RESTART
              </button>
            )}
          </div>
          <span className="font-display text-lg font-bold text-primary">{score}</span>
        </div>

        <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-xl border border-border" style={{ maxWidth: W, imageRendering: 'pixelated' }}
          onClick={() => { if (gameState === 'idle') launch(); if (gameState === 'dead' || gameState === 'won') { resetGame(); setTimeout(launch, 50); } }} />

        {handEnabled && (
          <div className="mt-3 relative w-32 h-24 rounded-lg overflow-hidden border border-border">
            <video ref={setVideoElement} className="w-full h-full object-cover mirror" style={{ transform: 'scaleX(-1)' }} />
            {!handReady && !handError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <span className="text-xs text-muted-foreground animate-pulse font-body">Loading...</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4">
          <div className="grid grid-cols-2 gap-4 font-body text-sm text-muted-foreground">
            <div className="flex gap-2"><Hand className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Move hand left/right to move paddle</span></div>
            <div className="flex gap-2"><Keyboard className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" /><span>← → or A/D keys, Space to launch</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
