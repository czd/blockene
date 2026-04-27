import { useEffect, useState } from "react";

import { decodeLevel } from "./game/engine/levelHash";
import { parse } from "./game/engine/levelLoader";
import { serialize } from "./game/engine/levelSerialize";
import type { EngineState, Level } from "./game/engine/types";
import { FIT_PAD_X, FIT_PAD_Y, GameScene } from "./game/scene/GameScene";
import { useGameStore } from "./game/state/gameStore";
import { LEVELS } from "./levels";
import { ArenaComingSoon } from "./ui/ArenaComingSoon";
import { Editor } from "./ui/editor/Editor";
import { Hud } from "./ui/Hud";
import { LevelComplete } from "./ui/LevelComplete";
import { LevelPicker } from "./ui/LevelPicker";
import { Library } from "./ui/Library";
import { MainMenu } from "./ui/MainMenu";
import { Scores } from "./ui/Scores";
import "./App.css";

type View =
  | "menu"
  | "tutorial"
  | "arena"
  | "game"
  | "editor"
  | "scores"
  | "library";

function readInitialView(): View {
  const hash = window.location.hash;
  if (hash.includes("play=")) return "game";
  if (hash.includes("editor")) return "editor";
  if (hash.includes("arena")) return "arena";
  if (hash.includes("scores")) return "scores";
  if (hash.includes("library")) return "library";
  if (hash.includes("tutorial") || hash.includes("level=")) return "tutorial";
  return "menu";
}

function readSharedLevelFromHash(): Level | null {
  // lz-string's URI-safe alphabet is [A-Za-z0-9+-$]; the hash itself never
  // contains `&` or `=` so we can grab the rest of the hash after `play=`.
  const m = window.location.hash.match(/play=(.+)$/);
  if (!m) return null;
  return decodeLevel(m[1]);
}

function readLevelFromHash(): number | null {
  const m = window.location.hash.match(/level=(\d+)/);
  if (!m) return null;
  const idx = parseInt(m[1], 10) - 1;
  return idx >= 0 && idx < LEVELS.length ? idx : null;
}

function App() {
  const [view, setView] = useState<View>(readInitialView);
  const [levelIndex, setLevelIndex] = useState<number | null>(
    readLevelFromHash,
  );
  const [editorPlayLevel, setEditorPlayLevel] = useState<Level | null>(null);
  const [sharedLevel, setSharedLevel] = useState<Level | null>(
    readSharedLevelFromHash,
  );
  const [gameReturnView, setGameReturnView] = useState<View>("menu");
  const [editorState, setEditorState] = useState<{
    state: EngineState;
    id: string;
    name: string;
  } | null>(null);

  const status = useGameStore((s) => s.status);
  const loadLevel = useGameStore((s) => s.loadLevel);
  const saveToLibrary = useGameStore((s) => s.saveToLibrary);

  // Picker → game by index.
  useEffect(() => {
    if (
      view === "game" &&
      levelIndex !== null &&
      !editorPlayLevel &&
      !sharedLevel
    ) {
      loadLevel(LEVELS[levelIndex]);
    }
  }, [view, levelIndex, editorPlayLevel, sharedLevel, loadLevel]);

  // Editor → test play.
  useEffect(() => {
    if (view === "game" && editorPlayLevel) {
      loadLevel(editorPlayLevel);
    }
  }, [view, editorPlayLevel, loadLevel]);

  // Shared URL → play. Also auto-save into the library so the player can
  // come back to it later without re-pasting the URL.
  useEffect(() => {
    if (view === "game" && sharedLevel) {
      loadLevel(sharedLevel);
      saveToLibrary(sharedLevel, "shared");
    }
  }, [view, sharedLevel, loadLevel, saveToLibrary]);

  if (view === "menu") {
    return (
      <MainMenu
        onTutorial={() => {
          window.location.hash = "tutorial";
          setView("tutorial");
        }}
        onArena={() => {
          window.location.hash = "arena";
          setView("arena");
        }}
        onEditor={() => {
          window.location.hash = "editor";
          setView("editor");
        }}
        onScores={() => {
          window.location.hash = "scores";
          setView("scores");
        }}
        onLibrary={() => {
          window.location.hash = "library";
          setView("library");
        }}
      />
    );
  }

  if (view === "library") {
    return (
      <Library
        onBack={() => {
          window.location.hash = "";
          setView("menu");
        }}
        onPlay={(level) => {
          setEditorPlayLevel(null);
          setLevelIndex(null);
          setSharedLevel(level);
          setGameReturnView("library");
          window.location.hash = "library";
          setView("game");
        }}
        onEdit={(entry) => {
          setEditorState({
            state: parse(entry.level),
            id: entry.id,
            name: entry.name,
          });
          window.location.hash = "editor";
          setView("editor");
        }}
      />
    );
  }

  if (view === "arena") {
    return (
      <ArenaComingSoon
        onBack={() => {
          window.location.hash = "";
          setView("menu");
        }}
      />
    );
  }

  if (view === "scores") {
    return (
      <Scores
        onBack={() => {
          window.location.hash = "";
          setView("menu");
        }}
      />
    );
  }

  if (view === "editor") {
    return (
      <Editor
        initial={editorState ?? undefined}
        onBack={() => {
          window.location.hash = "";
          setView("menu");
        }}
        onTestPlay={(state, meta) => {
          setEditorState({ state, ...meta });
          setEditorPlayLevel(serialize(state, meta.id, meta.name));
          setLevelIndex(null);
          setView("game");
        }}
      />
    );
  }

  if (view === "tutorial") {
    return (
      <LevelPicker
        onBack={() => {
          window.location.hash = "";
          setView("menu");
        }}
        onSelect={(i) => {
          setEditorPlayLevel(null);
          setLevelIndex(i);
          setView("game");
        }}
      />
    );
  }

  // view === 'game'
  const playingFromEditor = editorPlayLevel !== null;
  const playingShared = sharedLevel !== null && !playingFromEditor;
  const level = playingFromEditor
    ? editorPlayLevel
    : playingShared
      ? sharedLevel
      : levelIndex !== null
        ? LEVELS[levelIndex]
        : null;
  if (!level) return null;

  // Editor-play and shared levels are always "last": no next-level progression.
  const isLast =
    playingFromEditor || playingShared || levelIndex === LEVELS.length - 1;
  const goBack = () => {
    if (playingFromEditor) {
      setEditorPlayLevel(null);
      setView("editor");
    } else if (playingShared) {
      setSharedLevel(null);
      const target: View = gameReturnView === "library" ? "library" : "menu";
      window.location.hash = target === "menu" ? "" : target;
      setView(target);
    } else {
      setLevelIndex(null);
      setView("tutorial");
    }
  };

  const levelLabel = playingFromEditor
    ? "Editor"
    : playingShared
      ? `Shared · ${level.id}`
      : `Level ${String((levelIndex ?? 0) + 1).padStart(2, "0")}`;

  return (
    <>
      <div className="game-shell">
        <Hud levelLabel={levelLabel} levelName={level.name} onBack={goBack} />
        <div
          className="game-stage"
          style={{
            // +2 cells to the height side of the ratio gives the board parent
            // a bit of breathing room so the canvas isn't tightly aspect-fit.
            // Centered slack inside the canvas reads as natural "scene" room.
            aspectRatio: `${level.gridWidth + FIT_PAD_X} / ${level.gridHeight + FIT_PAD_Y + 1}`,
          }}
        >
          <GameScene />
        </div>
      </div>
      {status === "won" && (
        <LevelComplete
          levelLabel={levelLabel}
          isLast={isLast}
          onNext={() => {
            if (!playingFromEditor && !playingShared && levelIndex !== null) {
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
