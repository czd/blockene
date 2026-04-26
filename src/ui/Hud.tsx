import { useEffect, useState } from 'react';

import { useGameStore } from '../game/state/gameStore';
import { formatTime } from './format';

export function Hud({
  levelLabel,
  levelName,
  onBack,
}: {
  levelLabel: string;
  levelName: string;
  onBack: () => void;
}) {
  const undo = useGameStore((s) => s.undo);
  const restart = useGameStore((s) => s.restart);
  const historyLen = useGameStore((s) => s.history.length);
  const startedAt = useGameStore((s) => s.startedAt);
  const solvedAt = useGameStore((s) => s.solvedAt);
  const elapsed = useElapsed(startedAt, solvedAt);

  return (
    <div className="hud">
      <div className="hud-top">
        <button type="button" className="hud-btn" onClick={onBack} aria-label="Back to levels">
          ←
        </button>
        <div className="hud-title">
          <div className="hud-level">{levelLabel}</div>
          <div className="hud-name">{levelName}</div>
        </div>
        <div className="hud-actions">
          <button
            type="button"
            className="hud-btn"
            onClick={undo}
            disabled={historyLen === 0}
            aria-label="Undo"
          >
            ↶
          </button>
          <button
            type="button"
            className="hud-btn"
            onClick={restart}
            aria-label="Restart"
          >
            ↻
          </button>
        </div>
      </div>
      <div className="big-stats">
        <div className="big-stat big-stat--time">
          <div className="big-stat-value big-stat-value--time">{formatTime(elapsed)}</div>
          <div className="big-stat-label">Time</div>
        </div>
        <div className="big-stat">
          <div className="big-stat-value big-stat-value--moves">{historyLen}</div>
          <div className="big-stat-label">Moves</div>
        </div>
      </div>
    </div>
  );
}

// Live-updating elapsed time. Pauses once `solvedAt` is set; doesn't tick at
// all until the player makes their first move (`startedAt` is null).
function useElapsed(startedAt: number | null, solvedAt: number | null): number {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (startedAt === null || solvedAt !== null) return;
    let raf = 0;
    const tick = () => {
      setNow(performance.now());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAt, solvedAt]);
  if (startedAt === null) return 0;
  return (solvedAt ?? now) - startedAt;
}
