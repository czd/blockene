import { useState } from 'react';

import { useGameStore } from '../game/state/gameStore';
import { LEVELS } from '../levels';
import { formatTime } from './format';

export function Scores({ onBack }: { onBack: () => void }) {
  const bests = useGameStore((s) => s.bests);
  const clearBests = useGameStore((s) => s.clearBests);
  const [confirming, setConfirming] = useState(false);

  const solvedCount = LEVELS.filter((l) => bests[l.id]).length;

  return (
    <div className="picker">
      <button type="button" className="picker-back" onClick={onBack} aria-label="Back">
        ←
      </button>
      <div className="picker-header">
        <h1 className="picker-title">Scores</h1>
        <p className="picker-subtitle">
          {solvedCount} / {LEVELS.length} solved
        </p>
      </div>

      <ul className="scores-list">
        {LEVELS.map((level, i) => {
          const best = bests[level.id];
          return (
            <li key={level.id} className="scores-row">
              <span className="scores-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="scores-name">{level.name}</span>
              <span className="scores-stat scores-stat--time">
                {best ? formatTime(best.timeMs) : '—'}
              </span>
              <span className="scores-stat scores-stat--moves">
                {best ? `${best.moves} mv` : '—'}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="scores-reset">
        {confirming ? (
          <>
            <span className="scores-confirm-text">Erase all personal bests?</span>
            <button
              type="button"
              className="scores-btn scores-btn--danger"
              onClick={() => {
                clearBests();
                setConfirming(false);
              }}
            >
              Yes, erase
            </button>
            <button
              type="button"
              className="scores-btn"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            className="scores-btn"
            onClick={() => setConfirming(true)}
            disabled={solvedCount === 0}
          >
            Reset scores
          </button>
        )}
      </div>
    </div>
  );
}
