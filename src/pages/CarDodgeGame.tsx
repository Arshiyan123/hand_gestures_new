import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHandTracking, HandPosition } from '@/hooks/useHandTracking';

const W = 400;
const H = 600;
const LANE_COUNT = 3;
const LANE_W = W / LANE_COUNT;
const CAR_W = 50;
const CAR_H = 80;
const PLAYER_Y = H - 120;

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_SETTINGS: Record<Difficulty, {
  obstacleSpeed: number;
  spawnRate: number;
  maxObstacles: number;
  speedInc: number;
}> = {
  easy:   { obstacleSpeed: 3,   spawnRate: 90, maxObstacles: 2, speedInc: 0.001 },
  medium: { obstacleSpeed: 5,   spawnRate: 60, maxObstacles: 3, speedInc: 0.003 },
  hard:   { obstacleSpeed: 7.5, spawnRate: 40, maxObstacles: 4, speedInc: 0.005 },
};

interface ObstacleCar {
  lane: number;
  y: number;
  color: string;
}

const OBSTACLE_COLORS = [
  'hsl(0, 85%, 55%)',
  'hsl(30, 90%, 55%)',
  'hsl(50, 90%, 55%)',
  'hsl(200, 80%, 55%)',
  'hsl(280, 80%, 60%)',
];

export default function CarDodgeGame() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [handEnabled, setHandEnabled] = useState(true);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const diffRef = useRef(difficulty);
  diffRef.current = difficulty;

  const stateRef = useRef({
    playerLane: 1,
    targetLane: 1,
    playerX: LANE_W * 1 + LANE_W / 2,
    obstacles: [] as ObstacleCar[],
    frame: 0,
    score: 0,
    speed: 5,
    gameOver: false,
    keysDown: new Set<string>(),
    handX: null as number | null,
    lastLaneFromHand: 1,
    roadOffset: 0,
  });

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    const diff = DIFFICULTY_SETTINGS[diffRef.current];
    s.playerLane = 1;
    s.targetLane = 1;
    s.playerX = LANE_W * 1 + LANE_W / 2;
    s.obstacles = [];
    s.frame = 0;
    s.score = 0;
    s.speed = diff.obstacleSpeed;
    s.gameOver = false;
    s.roadOffset = 0;
    setScore(0);
    setGameOver(false);
  }, []);

  const handCallback = useCallback((hand: HandPosition | null) => {
    if (!hand) {
      stateRef.current.handX = null;
      return;
    }
    stateRef.current.handX = hand.x;
  }, []);

  const { setVideoElement, isReady: handReady, error: handError } = useHandTracking({
    enabled: handEnabled,
    onFrame: handCallback,
  });

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('car_dodge_high');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Keyboard
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      stateRef.current.keysDown.add(e.key);
      if (e.key === ' ' && stateRef.current.gameOver) {
        resetGame();
      }
    };
    const onUp = (e: KeyboardEvent) => stateRef.current.keysDown.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [resetGame]);

  // Reset on difficulty change
  useEffect(() => { resetGame(); }, [difficulty, resetGame]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const s = stateRef.current;
      const diff = DIFFICULTY_SETTINGS[diffRef.current];

      if (!s.gameOver) {
        // Handle keyboard lane switching
        if (s.keysDown.has('ArrowLeft') || s.keysDown.has('a')) {
          if (s.targetLane > 0) { s.targetLane--; s.keysDown.delete('ArrowLeft'); s.keysDown.delete('a'); }
        }
        if (s.keysDown.has('ArrowRight') || s.keysDown.has('d')) {
          if (s.targetLane < LANE_COUNT - 1) { s.targetLane++; s.keysDown.delete('ArrowRight'); s.keysDown.delete('d'); }
        }

        // Hand gesture lane control
        if (s.handX !== null) {
          let handLane: number;
          if (s.handX < 0.33) handLane = 0;
          else if (s.handX < 0.66) handLane = 1;
          else handLane = 2;
          
          if (handLane !== s.lastLaneFromHand) {
            s.targetLane = handLane;
            s.lastLaneFromHand = handLane;
          }
        }

        // Smooth car movement
        const targetX = LANE_W * s.targetLane + LANE_W / 2;
        s.playerX += (targetX - s.playerX) * 0.15;
        s.playerLane = s.targetLane;

        // Road scroll
        s.roadOffset = (s.roadOffset + s.speed) % 40;

        // Spawn obstacles
        s.frame++;
        if (s.frame % diff.spawnRate === 0) {
          const occupiedLanes = s.obstacles
            .filter(o => o.y < 100)
            .map(o => o.lane);
          const freeLanes = [0, 1, 2].filter(l => !occupiedLanes.includes(l));
          if (freeLanes.length > 0) {
            const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
            s.obstacles.push({
              lane,
              y: -CAR_H,
              color: OBSTACLE_COLORS[Math.floor(Math.random() * OBSTACLE_COLORS.length)],
            });
          }
        }

        // Move obstacles
        s.obstacles.forEach(o => { o.y += s.speed; });

        // Remove off-screen & score
        const before = s.obstacles.length;
        s.obstacles = s.obstacles.filter(o => o.y < H + CAR_H);
        const passed = before - s.obstacles.length;
        if (passed > 0) {
          s.score += passed;
          setScore(s.score);
        }

        // Speed increase
        s.speed = diff.obstacleSpeed + s.score * diff.speedInc;

        // Collision
        const px = s.playerX;
        for (const o of s.obstacles) {
          const ox = LANE_W * o.lane + LANE_W / 2;
          if (
            Math.abs(px - ox) < CAR_W * 0.85 &&
            o.y + CAR_H > PLAYER_Y - CAR_H / 2 &&
            o.y < PLAYER_Y + CAR_H / 2
          ) {
            s.gameOver = true;
            setGameOver(true);
            if (s.score > (parseInt(localStorage.getItem('car_dodge_high') || '0', 10))) {
              localStorage.setItem('car_dodge_high', String(s.score));
              setHighScore(s.score);
            }
            break;
          }
        }
      }

      // === DRAW ===
      // Road background
      ctx.fillStyle = 'hsl(230, 15%, 10%)';
      ctx.fillRect(0, 0, W, H);

      // Road surface
      ctx.fillStyle = 'hsl(230, 10%, 15%)';
      ctx.fillRect(10, 0, W - 20, H);

      // Lane dividers (dashed, scrolling)
      ctx.strokeStyle = 'hsl(160, 100%, 50%)';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;
      ctx.setLineDash([20, 20]);
      for (let i = 1; i < LANE_COUNT; i++) {
        const x = LANE_W * i;
        ctx.beginPath();
        ctx.lineDashOffset = -s.roadOffset;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Road edge glow
      ctx.strokeStyle = 'hsl(160, 100%, 50%)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(10, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 10, 0); ctx.lineTo(W - 10, H); ctx.stroke();
      ctx.globalAlpha = 1;

      // Draw obstacles
      for (const o of s.obstacles) {
        const ox = LANE_W * o.lane + LANE_W / 2;
        drawCar(ctx, ox, o.y, o.color, false);
      }

      // Draw player car
      drawCar(ctx, s.playerX, PLAYER_Y, 'hsl(160, 100%, 50%)', true);

      // Score HUD
      ctx.fillStyle = 'hsl(210, 40%, 94%)';
      ctx.font = '600 18px Orbitron, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${s.score}`, 20, 30);
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${Math.max(s.score, parseInt(localStorage.getItem('car_dodge_high') || '0', 10))}`, W - 20, 30);

      // Game over overlay
      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'hsl(0, 85%, 55%)';
        ctx.font = '900 36px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CRASH!', W / 2, H / 2 - 30);
        ctx.fillStyle = 'hsl(210, 40%, 94%)';
        ctx.font = '500 16px Rajdhani, sans-serif';
        ctx.fillText(`Score: ${s.score}`, W / 2, H / 2 + 10);
        ctx.fillText('Press SPACE or tap to restart', W / 2, H / 2 + 45);
      }
    };

    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, isPlayer: boolean) {
    const hw = CAR_W / 2;
    const hh = CAR_H / 2;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, y + hh + 5, hw * 0.8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - hw, y - hh, CAR_W, CAR_H, 8);
    ctx.fill();

    // Windshield
    ctx.fillStyle = isPlayer ? 'hsl(160, 60%, 25%)' : 'hsl(200, 40%, 25%)';
    ctx.beginPath();
    if (isPlayer) {
      ctx.roundRect(x - hw + 8, y - hh + 10, CAR_W - 16, 20, 4);
    } else {
      ctx.roundRect(x - hw + 8, y + hh - 30, CAR_W - 16, 20, 4);
    }
    ctx.fill();

    // Headlights / taillights
    if (isPlayer) {
      ctx.fillStyle = 'hsl(160, 100%, 70%)';
      ctx.shadowColor = 'hsl(160, 100%, 50%)';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.ellipse(x - hw + 10, y - hh + 5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + hw - 10, y - hh + 5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      ctx.fillStyle = 'hsl(0, 80%, 60%)';
      ctx.shadowColor = 'hsl(0, 80%, 50%)';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(x - hw + 10, y + hh - 5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + hw - 10, y + hh - 5, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Stripe on player
    if (isPlayer) {
      ctx.strokeStyle = 'hsl(160, 100%, 80%)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - hh + 32);
      ctx.lineTo(x, y + hh - 5);
      ctx.stroke();
    }
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col items-center justify-center relative px-4 py-8">
      <div className="scanline absolute inset-0 pointer-events-none opacity-20" />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate('/')} className="font-display text-sm font-bold tracking-wider text-muted-foreground hover:text-primary transition-colors">
            ← BACK
          </button>
          <h1 className="font-display text-2xl font-black neon-text text-primary">CAR DODGE</h1>
          <div className="w-16" />
        </div>

        {/* Difficulty */}
        <div className="flex justify-center gap-3 mb-4">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`px-4 py-1.5 rounded-lg font-display text-xs font-bold tracking-wider uppercase transition-all border
                ${difficulty === d
                  ? 'border-primary bg-primary/20 text-primary neon-border'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => setHandEnabled(!handEnabled)}
            className={`px-4 py-1.5 rounded-lg font-display text-xs font-bold tracking-wider transition-all border
              ${handEnabled ? 'border-accent text-accent neon-border' : 'border-border text-muted-foreground'}`}
          >
            {handEnabled ? '✋ HAND ON' : '✋ HAND OFF'}
          </button>
          {gameOver && (
            <button
              onClick={resetGame}
              className="px-4 py-1.5 rounded-lg font-display text-xs font-bold tracking-wider border border-primary text-primary neon-border"
            >
              RESTART
            </button>
          )}
        </div>

        {/* Camera feed */}
        <video
          ref={setVideoElement}
          className="absolute top-4 right-4 w-32 h-24 rounded-lg border border-border object-cover opacity-60"
          style={{ transform: 'scaleX(-1)', display: handEnabled ? 'block' : 'none' }}
        />

        {handEnabled && !handReady && !handError && (
          <div className="text-center mb-2 font-body text-sm text-muted-foreground animate-pulse">
            Loading hand tracking...
          </div>
        )}
        {handError && (
          <div className="text-center mb-2 font-body text-sm text-destructive">{handError}</div>
        )}

        {/* Canvas */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            onClick={() => { if (stateRef.current.gameOver) resetGame(); }}
            className="rounded-xl border border-border neon-border cursor-pointer"
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 text-center font-body text-sm text-muted-foreground">
          <span className="text-primary">← →</span> or <span className="text-primary">A/D</span> to switch lanes
          {handEnabled && <span> · <span className="text-accent">Move hand left/right</span></span>}
        </div>
      </div>
    </div>
  );
}
