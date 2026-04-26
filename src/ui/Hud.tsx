import { useGameStore } from '../game/state/gameStore';

export function Hud({
  levelNumber,
  levelName,
  onBack,
}: {
  levelNumber: number;
  levelName: string;
  onBack: () => void;
}) {
  const undo = useGameStore((s) => s.undo);
  const restart = useGameStore((s) => s.restart);
  const historyLen = useGameStore((s) => s.history.length);

  return (
    <div className="hud">
      <button type="button" className="hud-btn" onClick={onBack} aria-label="Back to levels">
        ←
      </button>
      <div className="hud-title">
        <div className="hud-level">Level {String(levelNumber).padStart(2, '0')}</div>
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
  );
}
