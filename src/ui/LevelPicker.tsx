import { LEVELS } from '../levels';

export function LevelPicker({
  onSelect,
  onBack,
}: {
  onSelect: (index: number) => void;
  onBack?: () => void;
}) {
  return (
    <div className="picker">
      {onBack && (
        <button type="button" className="picker-back" onClick={onBack} aria-label="Back">
          ←
        </button>
      )}
      <div className="picker-header">
        <img src="/favicon.svg" alt="" className="picker-logo" width={64} height={64} />
        <h1 className="picker-title">Blockene</h1>
        <p className="picker-subtitle">Choose a level</p>
      </div>
      <ul className="picker-grid">
        {LEVELS.map((level, i) => (
          <li key={level.id}>
            <button
              type="button"
              className="picker-tile"
              onClick={() => onSelect(i)}
            >
              <span className="picker-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="picker-name">{level.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
