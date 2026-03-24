import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHandTracking, HandPosition } from '@/hooks/useHandTracking';
import { Hand, Keyboard, ArrowLeft } from 'lucide-react';

const W = 480, H = 600;
const BASKET_W = 70, BASKET_H = 40;

type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTY_SETTINGS: Record<Difficulty, { fallSpeed: number; spawnRate: number; maxItems: number; basketW: number }> = {
  easy: { fallSpeed: 2.5, spawnRate: 70, maxItems: 4, basketW: 90 },
  medium: { fallSpeed: 4, spawnRate: 50, maxItems: 6, basketW: 70 },
  hard: { fallSpeed: 6, spawnRate: 35, maxItems: 8, basketW: 55 },
};

interface FallingItem { x: number; y: number; type: 'fruit' | 'bomb'; emoji: string; speed: number }

const FRUITS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🍒', '⭐'];
const BOMB = '💣';

export default function FruitCatchGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [handEnabled, setHandEnabled] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScore, setHighScore] = useState(0);

  const gs = useRef({
    basketX: W / 2 - BASKET_W / 2,
    items: [] as FallingItem[],
    score: 0, lives: 3,
    playing: false,
    spawnTimer: 0,
    handX: -1,
    combo: 0,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  useEffect(() => {
    const h = localStorage.getItem('fruit_catch_high');
    if (h) setHighScore(parseInt(h));
  }, []);

  const resetGame = useCallback(() => {
    const s = DIFFICULTY_SETTINGS[diffRef.current];
    const g = gs.current;
    g.basketX = W / 2 - s.basketW / 2;
    g.items = []; g.score = 0; g.lives = 3;
    g.playing = true; g.spawnTimer = 0; g.combo = 0;
    setScore(0); setLives(3); setGameState('playing');
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
      if (e.key === ' ') { e.preventDefault(); if (gameState !== 'playing') resetGame(); }
    };
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [gameState, resetGame]);

  useEffect(() => {
    const s = DIFFICULTY_SETTINGS[difficulty];
    gs.current.items = [];
    gs.current.spawnTimer = 0;
    if (gameState === 'playing') resetGame();
  }, [difficulty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const g = gs.current;
      const s = DIFFICULTY_SETTINGS[diffRef.current];
      const bw = s.basketW;

      // Basket movement
      const speed = 7;
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) g.basketX -= speed;
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) g.basketX += speed;
      if (g.handX >= 0) {
        const target = g.handX * W - bw / 2;
        g.basketX += (target - g.basketX) * 0.25;
      }
      g.basketX = Math.max(0, Math.min(W - bw, g.basketX));

      if (g.playing) {
        // Spawn items
        g.spawnTimer++;
        if (g.spawnTimer >= s.spawnRate && g.items.length < s.maxItems) {
          g.spawnTimer = 0;
          const isBomb = Math.random() < 0.15;
          g.items.push({
            x: Math.random() * (W - 30) + 15,
            y: -20,
            type: isBomb ? 'bomb' : 'fruit',
            emoji: isBomb ? BOMB : FRUITS[Math.floor(Math.random() * FRUITS.length)],
            speed: s.fallSpeed * (0.8 + Math.random() * 0.4),
          });
        }

        // Update items
        for (let i = g.items.length - 1; i >= 0; i--) {
          const item = g.items[i];
          item.y += item.speed;

          // Catch check
          if (item.y + 15 >= H - BASKET_H - 10 && item.y <= H - 10 &&
              item.x >= g.basketX && item.x <= g.basketX + bw) {
            if (item.type === 'bomb') {
              g.lives--;
              g.combo = 0;
              setLives(g.lives);
              if (g.lives <= 0) {
                g.playing = false;
                setGameState('dead');
                if (g.score > (parseInt(localStorage.getItem('fruit_catch_high') || '0'))) {
                  localStorage.setItem('fruit_catch_high', String(g.score));
                  setHighScore(g.score);
                }
              }
            } else {
              g.combo++;
              const bonus = g.combo >= 5 ? 3 : g.combo >= 3 ? 2 : 1;
              g.score += bonus;
              setScore(g.score);
            }
            g.items.splice(i, 1);
            continue;
          }

          // Missed fruit
          if (item.y > H + 20) {
            if (item.type === 'fruit') {
              g.combo = 0;
              g.lives--;
              setLives(g.lives);
              if (g.lives <= 0) {
                g.playing = false;
                setGameState('dead');
                if (g.score > (parseInt(localStorage.getItem('fruit_catch_high') || '0'))) {
                  localStorage.setItem('fruit_catch_high', String(g.score));
                  setHighScore(g.score);
                }
              }
            }
            g.items.splice(i, 1);
          }
        }
      }

      // Draw
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, W, H);

      // Grid bg
      ctx.strokeStyle = 'rgba(0,200,100,0.04)';
      for (let i = 0; i < W; i += 30) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
      for (let i = 0; i < H; i += 30) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

      // Ground line
      ctx.strokeStyle = 'rgba(34,197,94,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, H - 8); ctx.lineTo(W, H - 8); ctx.stroke();
      ctx.lineWidth = 1;

      // Items
      ctx.font = '28px serif';
      ctx.textAlign = 'center';
      for (const item of g.items) {
        if (item.type === 'bomb') {
          ctx.shadowColor = '#f43f5e';
          ctx.shadowBlur = 12;
        } else {
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 8;
        }
        ctx.fillText(item.emoji, item.x, item.y);
      }
      ctx.shadowBlur = 0;

      // Basket
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.roundRect(g.basketX, H - BASKET_H - 10, bw, BASKET_H, [0, 0, 8, 8]);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Basket rim
      ctx.fillStyle = '#16a34a';
      ctx.fillRect(g.basketX - 3, H - BASKET_H - 10, bw + 6, 6);
      // Basket icon
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🧺', g.basketX + bw / 2, H - 18);

      // HUD
      ctx.font = 'bold 16px Orbitron';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${g.score}`, 10, 28);
      ctx.textAlign = 'right';
      ctx.fillText('❤️'.repeat(Math.max(0, g.lives)), W - 10, 28);
      if (g.combo >= 3) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 14px Orbitron';
        ctx.fillText(`${g.combo}x COMBO!`, W / 2, 28);
      }

      // Overlays
      if (gameState === 'idle') {
        ctx.textAlign = 'center';
        ctx.font = 'bold 22px Orbitron';
        ctx.fillStyle = '#22c55e';
        ctx.fillText('FRUIT CATCH', W / 2, H / 2 - 20);
        ctx.font = '15px Rajdhani';
        ctx.fillStyle = '#888';
        ctx.fillText('Catch fruits, avoid bombs!', W / 2, H / 2 + 15);
        ctx.fillText('Press SPACE or Click to start', W / 2, H / 2 + 40);
      }

      if (gameState === 'dead') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.textAlign = 'center';
        ctx.font = 'bold 28px Orbitron';
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('GAME OVER', W / 2, H / 2 - 20);
        ctx.font = '16px Rajdhani';
        ctx.fillStyle = '#fff';
        ctx.fillText(`Score: ${g.score} | Best: ${Math.max(g.score, highScore)}`, W / 2, H / 2 + 15);
        ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 45);
      }
    };

    loop();
    return () => cancelAnimationFrame(raf);
  }, [gameState, highScore]);

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
          <h1 className="font-display text-xl font-bold neon-text" style={{ color: 'hsl(160,100%,50%)' }}>FRUIT CATCH</h1>
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
            {gameState === 'dead' && (
              <button onClick={resetGame} className="px-3 py-1.5 rounded-lg border border-secondary/50 text-secondary font-display text-xs font-bold tracking-wider hover:bg-secondary/20 transition-all">
                RESTART
              </button>
            )}
          </div>
          <div className="text-right">
            <span className="font-display text-lg font-bold text-foreground">{score}</span>
            {highScore > 0 && <span className="font-body text-xs text-muted-foreground ml-2">Best: {highScore}</span>}
          </div>
        </div>

        <canvas ref={canvasRef} width={W} height={H} className="w-full rounded-xl border border-border" style={{ maxWidth: W }}
          onClick={() => { if (gameState !== 'playing') resetGame(); }} />

        {handEnabled && (
          <div className="mt-3 relative w-32 h-24 rounded-lg overflow-hidden border border-border">
            <video ref={setVideoElement} className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            {!handReady && !handError && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <span className="text-xs text-muted-foreground animate-pulse font-body">Loading...</span>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm p-4">
          <div className="grid grid-cols-2 gap-4 font-body text-sm text-muted-foreground">
            <div className="flex gap-2"><Hand className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" /><span>Move hand left/right to move basket</span></div>
            <div className="flex gap-2"><Keyboard className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" /><span>← → or A/D keys, Space to start</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
