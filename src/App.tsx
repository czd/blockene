import { useEffect } from 'react';

import { GameScene } from './game/scene/GameScene';
import { useGameStore } from './game/state/gameStore';
import type { Level } from './game/engine/types';
import './App.css';

// Slice 2 test level: a few blocks, a wall divider, no doors yet.
const DEV_LEVEL: Level = {
  id: 'dev-2',
  name: 'Slice 2 sandbox',
  gridWidth: 6,
  gridHeight: 8,
  blocks: [
    { id: 'a', color: 'rare-blue', cells: [[1, 1], [2, 1]] },
    { id: 'b', color: 'crimson', cells: [[4, 5]] },
    { id: 'c', color: 'jade', cells: [[0, 6], [1, 6], [1, 7]] },
  ],
  doors: [],
  walls: [
    [3, 3],
    [3, 4],
  ],
};

function App() {
  const loadLevel = useGameStore((s) => s.loadLevel);
  useEffect(() => {
    loadLevel(DEV_LEVEL);
  }, [loadLevel]);

  return <GameScene />;
}

export default App;
