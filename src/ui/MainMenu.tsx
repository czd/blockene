export function MainMenu({
  onTutorial,
  onArena,
  onEditor,
  onScores,
  onLibrary,
}: {
  onTutorial: () => void;
  onArena: () => void;
  onEditor: () => void;
  onScores: () => void;
  onLibrary: () => void;
}) {
  return (
    <div className="menu">
      <div className="menu-header">
        <img src="/favicon.svg" alt="" className="menu-logo" width={88} height={88} />
        <h1 className="menu-title">Blockene</h1>
        <p className="menu-subtitle">Slide. Match. Escape.</p>
      </div>

      <div className="menu-buttons">
        <button
          type="button"
          className="chunky-btn chunky-btn--arena"
          onClick={onArena}
        >
          <span className="chunky-btn-label">Arena</span>
          <span className="chunky-btn-sub">Coming soon</span>
        </button>

        <button
          type="button"
          className="chunky-btn chunky-btn--tutorial"
          onClick={onTutorial}
        >
          <span className="chunky-btn-label">Tutorial</span>
          <span className="chunky-btn-sub">Learn the ropes</span>
        </button>

        <button
          type="button"
          className="chunky-btn chunky-btn--scores"
          onClick={onScores}
        >
          <span className="chunky-btn-label">Scores</span>
          <span className="chunky-btn-sub">Personal bests</span>
        </button>

        <button
          type="button"
          className="chunky-btn chunky-btn--library"
          onClick={onLibrary}
        >
          <span className="chunky-btn-label">Library</span>
          <span className="chunky-btn-sub">Saved levels</span>
        </button>

        <button
          type="button"
          className="chunky-btn chunky-btn--editor"
          onClick={onEditor}
        >
          <span className="chunky-btn-label">Editor</span>
          <span className="chunky-btn-sub">Build a level</span>
        </button>
      </div>
    </div>
  );
}
