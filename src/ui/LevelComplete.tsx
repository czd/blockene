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
  return (
    <div className="overlay overlay--win" role="dialog" aria-modal="true">
      <div className="overlay-card">
        <div className="overlay-eyebrow">Level {String(levelNumber).padStart(2, '0')}</div>
        <h1 className="overlay-title">Solved</h1>
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
