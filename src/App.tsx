import { useEffect, useState } from 'react';

import { serialize } from './game/engine/levelSerialize';
import type { EngineState, Level } from './game/engine/types';
import { GameScene } from './game/scene/GameScene';
import { useGameStore } from './game/state/gameStore';
import { LEVELS } from './levels';
import { Editor } from './ui/editor/Editor';
import { Hud } from './ui/Hud';
import { LevelComplete } from './ui/LevelComplete';
import { LevelPicker } from './ui/LevelPicker';
import './App.css';

type View = 'picker' | 'game' | 'editor';

function readInitialView(): View {
  if (window.location.hash.includes('editor')) return 'editor';
  return 'picker';
}

function readLevelFromHash(): number | null {
  const m = window.location.hash.match(/level=(\d+)/);
  if (!m) return null;
  const idx = parseInt(m[1], 10) - 1;
  return idx >= 0 && idx < LEVELS.length ? idx : null;
}

function App() {
  const [view, setView] = useState<View>(readInitialView);
  const [levelIndex, setLevelIndex] = useState<number | null>(readLevelFromHash);
  const [editorPlayLevel, setEditorPlayLevel] = useState<Level | null>(null);
  const [editorState, setEditorState] = useState<{
    state: EngineState;
    id: string;
    name: string;
  } | null>(null);

  const status = useGameStore((s) => s.status);
  const loadLevel = useGameStore((s) => s.loadLevel);

  // Picker → game by index.
  useEffect(() => {
    if (view === 'game' && levelIndex !== null && !editorPlayLevel) {
      loadLevel(LEVELS[levelIndex]);
    }
  }, [view, levelIndex, editorPlayLevel, loadLevel]);

  // Editor → test play.
  useEffect(() => {
    if (view === 'game' && editorPlayLevel) {
      loadLevel(editorPlayLevel);
    }
  }, [view, editorPlayLevel, loadLevel]);

  if (view === 'editor') {
    return (
      <Editor
        initial={editorState ?? undefined}
        onBack={() => {
          window.location.hash = '';
          setView('picker');
        }}
        onTestPlay={(state, meta) => {
          setEditorState({ state, ...meta });
          setEditorPlayLevel(serialize(state, meta.id, meta.name));
          setLevelIndex(null);
          setView('game');
        }}
      />
    );
  }

  if (view === 'picker') {
    return (
      <LevelPicker
        onSelect={(i) => {
          setEditorPlayLevel(null);
          setLevelIndex(i);
          setView('game');
        }}
      />
    );
  }

  // view === 'game'
  const playingFromEditor = editorPlayLevel !== null;
  const level = playingFromEditor ? editorPlayLevel : levelIndex !== null ? LEVELS[levelIndex] : null;
  if (!level) return null;

  // Treat editor-play as "last": there's no concept of "next level" from the editor.
  const isLast = playingFromEditor || levelIndex === LEVELS.length - 1;
  const goBack = () => {
    if (playingFromEditor) {
      setEditorPlayLevel(null);
      setView('editor');
    } else {
      setLevelIndex(null);
      setView('picker');
    }
  };

  return (
    <>
      <GameScene />
      <Hud
        levelNumber={playingFromEditor ? 0 : (levelIndex ?? 0) + 1}
        levelName={playingFromEditor ? `Editor — ${level.name}` : level.name}
        onBack={goBack}
      />
      {status === 'won' && (
        <LevelComplete
          levelNumber={playingFromEditor ? 0 : (levelIndex ?? 0) + 1}
          isLast={isLast}
          onNext={() => {
            if (!playingFromEditor && levelIndex !== null) {
              setLevelIndex(levelIndex + 1);
            }
          }}
          onPicker={goBack}
        />
      )}
    </>
  );
}

export default App;
