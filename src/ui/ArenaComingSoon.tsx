export function ArenaComingSoon({ onBack }: { onBack: () => void }) {
  return (
    <div className="menu">
      <div className="menu-header">
        <h1 className="menu-title">Arena</h1>
        <p className="menu-subtitle">Coming soon</p>
      </div>

      <div className="arena-teaser">
        <p>
          Build levels in the editor, share them with the world, and compete on
          challenges crafted by other players. Earn stars as the community votes
          on the best.
        </p>
      </div>

      <div className="menu-buttons">
        <button
          type="button"
          className="chunky-btn chunky-btn--tutorial"
          onClick={onBack}
        >
          <span className="chunky-btn-label">Back</span>
        </button>
      </div>
    </div>
  );
}
