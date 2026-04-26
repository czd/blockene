import { useState } from 'react';

import type { Level } from '../game/engine/types';
import { useGameStore } from '../game/state/gameStore';
import type { LibraryEntry } from '../game/state/gameStore';
import { formatTime } from './format';

export function Library({
  onPlay,
  onEdit,
  onBack,
}: {
  onPlay: (level: Level) => void;
  onEdit: (entry: LibraryEntry) => void;
  onBack: () => void;
}) {
  const library = useGameStore((s) => s.library);
  const bests = useGameStore((s) => s.bests);
  const removeFromLibrary = useGameStore((s) => s.removeFromLibrary);
  const clearLibrary = useGameStore((s) => s.clearLibrary);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="picker">
      <button type="button" className="picker-back" onClick={onBack} aria-label="Back">
        ←
      </button>
      <div className="picker-header">
        <h1 className="picker-title">Library</h1>
        <p className="picker-subtitle">
          {library.length === 0
            ? 'Levels you create or open will appear here'
            : `${library.length} ${library.length === 1 ? 'level' : 'levels'}`}
        </p>
      </div>

      {library.length === 0 ? (
        <div className="library-empty">
          <p>No saved levels yet.</p>
          <p className="library-empty-hint">
            Build one in the Editor and tap Share, or open a level shared by a
            friend — both go in here automatically.
          </p>
        </div>
      ) : (
        <ul className="library-list">
          {library.map((entry) => {
            const best = bests[entry.id];
            return (
              <li key={entry.id} className="library-row">
                <div className="library-row-main">
                  <div className="library-row-header">
                    <span className="library-name">{entry.name}</span>
                    <span
                      className={`library-origin library-origin--${entry.origin}`}
                    >
                      {entry.origin === 'created' ? 'Made' : 'Shared'}
                    </span>
                  </div>
                  <div className="library-row-meta">
                    <span className="library-code">{entry.id}</span>
                    {best ? (
                      <>
                        <span className="library-sep">·</span>
                        <span className="library-stat library-stat--time">
                          {formatTime(best.timeMs)}
                        </span>
                        <span className="library-sep">·</span>
                        <span className="library-stat library-stat--moves">
                          {best.moves} mv
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="library-sep">·</span>
                        <span className="library-unsolved">Not yet solved</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="library-actions">
                  <button
                    type="button"
                    className="library-btn library-btn--primary"
                    onClick={() => onPlay(entry.level)}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    className="library-btn"
                    onClick={() => onEdit(entry)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="library-btn library-btn--icon"
                    onClick={() => removeFromLibrary(entry.id)}
                    aria-label={`Delete ${entry.name}`}
                  >
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {library.length > 0 && (
        <div className="scores-reset">
          {confirming ? (
            <>
              <span className="scores-confirm-text">Erase entire library?</span>
              <button
                type="button"
                className="scores-btn scores-btn--danger"
                onClick={() => {
                  clearLibrary();
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
            >
              Clear library
            </button>
          )}
        </div>
      )}
    </div>
  );
}
