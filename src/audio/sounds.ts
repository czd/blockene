import { Howl } from 'howler';

// Drop matching .mp3 files into /public/sounds/. Howler logs (but does not
// throw) when a file is missing, so the game stays playable while the audio
// pack is being assembled.
export type SoundName = 'grab' | 'slide' | 'collide' | 'exit' | 'win';

const SOUND_PATHS: Record<SoundName, string> = {
  grab: '/sounds/grab.mp3',
  slide: '/sounds/slide.mp3',
  collide: '/sounds/collide.mp3',
  exit: '/sounds/exit.mp3',
  win: '/sounds/win.mp3',
};

const LOOPED: Partial<Record<SoundName, true>> = { slide: true };

const sounds: Partial<Record<SoundName, Howl>> = {};

function get(name: SoundName): Howl {
  let h = sounds[name];
  if (!h) {
    h = new Howl({
      src: [SOUND_PATHS[name]],
      loop: LOOPED[name] === true,
      volume: 0.7,
    });
    sounds[name] = h;
  }
  return h;
}

export function play(name: SoundName): void {
  get(name).play();
}

export function startLoop(name: SoundName): void {
  const h = get(name);
  if (!h.playing()) h.play();
}

export function stopLoop(name: SoundName): void {
  sounds[name]?.stop();
}
