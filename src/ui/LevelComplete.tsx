import { useGameStore } from '../game/state/gameStore';
import { formatTime } from './format';

export function LevelComplete({
  levelNumber,
  isLast,
  onNext,
  onPicker,
}: {
  levelNumber: number;
  isLast: boolean;
  onNext: () => void;
  onPicker: () => void;
}) {
  const startedAt = useGameStore((s) => s.startedAt);
  const solvedAt = useGameStore((s) => s.solvedAt);
  const moves = useGameStore((s) => s.history.length);
  const undos = useGameStore((s) => s.undos);
  const restarts = useGameStore((s) => s.restarts);
  const currentLevelId = useGameStore((s) => s.currentLevelId);
  const bests = useGameStore((s) => s.bests);
  const isTimeRecord = useGameStore((s) => s.lastTimeRecord);
  const isMovesRecord = useGameStore((s) => s.lastMovesRecord);

  const elapsedMs = startedAt !== null && solvedAt !== null ? solvedAt - startedAt : 0;
  const best = currentLevelId ? bests[currentLevelId] : undefined;

  return (
    <div className="overlay overlay--win" role="dialog" aria-modal="true">
      <div className="overlay-card">
        <div className="overlay-eyebrow">Level {String(levelNumber).padStart(2, '0')}</div>
        <h1 className="overlay-title">Solved</h1>

        {(isTimeRecord || isMovesRecord) && (
          <div className="overlay-records">
            {isTimeRecord && (
              <span className="overlay-record overlay-record--time">New best time</span>
            )}
            {isMovesRecord && (
              <span className="overlay-record overlay-record--moves">New best moves</span>
            )}
          </div>
        )}

        <dl className="overlay-stats">
          <div className="overlay-stat">
            <dt>Time</dt>
            <dd>
              {formatTime(elapsedMs)}
              {best && best.timeMs !== elapsedMs && (
                <span className="overlay-stat-best">best {formatTime(best.timeMs)}</span>
              )}
            </dd>
          </div>
          <div className="overlay-stat">
            <dt>Moves</dt>
            <dd>
              {moves}
              {best && best.moves !== moves && (
                <span className="overlay-stat-best">best {best.moves}</span>
              )}
            </dd>
          </div>
          {undos > 0 && (
            <div className="overlay-stat">
              <dt>Undos</dt>
              <dd>{undos}</dd>
            </div>
          )}
          {restarts > 0 && (
            <div className="overlay-stat">
              <dt>Restarts</dt>
              <dd>{restarts}</dd>
            </div>
          )}
        </dl>

        <div className="overlay-actions">
          {!isLast && (
            <button type="button" className="overlay-btn primary" onClick={onNext}>
              Next
            </button>
          )}
          <button type="button" className="overlay-btn" onClick={onPicker}>
            Levels
          </button>
        </div>
      </div>
    </div>
  );
}
