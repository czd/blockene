import type { Level } from '../game/engine/types';

import l01 from './01.json';
import l02 from './02.json';
import l03 from './03.json';
import l04 from './04.json';
import l05 from './05.json';
import l06 from './06.json';
import l07 from './07.json';
import l08 from './08.json';
import l09 from './09.json';
import l10 from './10.json';

// JSON loses literal-type narrowing — assert the shape we hand-author.
export const LEVELS: Level[] = [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10] as Level[];
