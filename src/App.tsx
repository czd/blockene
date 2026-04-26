import { useEffect, useState } from 'react';

import { GameScene } from './game/scene/GameScene';
import { useGameStore } from './game/state/gameStore';
import { LEVELS } from './levels';
import { Hud } from './ui/Hud';
import { LevelComplete } from './ui/LevelComplete';
import { LevelPicker } from './ui/LevelPicker';
import './App.css';

function readLevelFromHash(): number | null {
  const m = window.location.hash.match(/level=(\d+)/);
  if (!m) return null;
  const idx = parseInt(m[1], 10) - 1;
  return idx >= 0 && idx < LEVELS.length ? idx : null;
}

function App() {
  const [levelIndex, setLevelIndex] = useState<number | null>(readLevelFromHash);
  const status = useGameStore((s) => s.status);
  const loadLevel = useGameStore((s) => s.loadLevel);

  useEffect(() => {
    if (levelIndex !== null) loadLevel(LEVELS[levelIndex]);
  }, [levelIndex, loadLevel]);

  if (levelIndex === null) {
    return <LevelPicker onSelect={setLevelIndex} />;
  }

  const level = LEVELS[levelIndex];
  const isLast = levelIndex === LEVELS.length - 1;

  return (
    <>
      <GameScene />
      <Hud
        levelNumber={levelIndex + 1}
        levelName={level.name}
        onBack={() => setLevelIndex(null)}
      />
      {status === 'won' && (
        <LevelComplete
          levelNumber={levelIndex + 1}
          isLast={isLast}
          onNext={() => setLevelIndex(levelIndex + 1)}
          onPicker={() => setLevelIndex(null)}
        />
      )}
    </>
  );
}

export default App;
