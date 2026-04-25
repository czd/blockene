import { useEffect } from 'react';

import { GameScene } from './game/scene/GameScene';
import { useGameStore } from './game/state/gameStore';
import type { Level } from './game/engine/types';
import './App.css';

// Slice 3 sandbox — exercises the door-fit rule with four shapes:
//   • horizontal 1×3 jade   → exits top through a 3-wide door
//   • vertical 3×1 crimson  → exits right through a 3-tall door
//   • 2×2 gold square       → exits bottom through a 2-wide door
//   • single cyan cell      → exits left through a 1-tall door
const DEV_LEVEL: Level = {
  id: 'dev-3',
  name: 'Slice 3 sandbox',
  gridWidth: 5,
  gridHeight: 5,
  blocks: [
    { id: 'jade-row',     color: 'jade',           cells: [[0, 0], [1, 0], [2, 0]] },
    { id: 'crimson-col',  color: 'crimson',        cells: [[4, 1], [4, 2], [4, 3]] },
    { id: 'gold-square',  color: 'legendary-gold', cells: [[0, 3], [1, 3], [0, 4], [1, 4]] },
    { id: 'cyan-cell',    color: 'frost-cyan',     cells: [[0, 2]] },
  ],
  doors: [
    { side: 'top',    position: 0, width: 3, color: 'jade' },
    { side: 'right',  position: 1, width: 3, color: 'crimson' },
    { side: 'bottom', position: 0, width: 2, color: 'legendary-gold' },
    { side: 'left',   position: 2, width: 1, color: 'frost-cyan' },
  ],
  walls: [],
};

function App() {
  const loadLevel = useGameStore((s) => s.loadLevel);
  useEffect(() => {
    loadLevel(DEV_LEVEL);
  }, [loadLevel]);

  return <GameScene />;
}

export default App;
