
import { SgfGameRecord, StoneColor } from './types';

export const DEFAULT_BOARD_SIZE = 19; 
export const JOSEKI_DISPLAY_SIZE = 10; 

export const STAR_POINTS = [
  { row: 3, col: 3 }, { row: 3, col: 9 }, { row: 3, col: 15 },
  { row: 9, col: 3 }, { row: 9, col: 9 }, { row: 9, col: 15 },
  { row: 15, col: 3 }, { row: 15, col: 9 }, { row: 15, col: 15 },
];

export const INITIAL_SGF_GAME_RECORD = (id: string): SgfGameRecord => ({
  id,
  rules: 'chinese',
  komi: 7.5,
  boardXSize: DEFAULT_BOARD_SIZE,
  boardYSize: DEFAULT_BOARD_SIZE,
  initialPlayer: StoneColor.Black,
  gameTree: [], // Initialize gameTree as empty
  result: '',
  metadata: {
    blackPlayer: 'Black',
    whitePlayer: 'White',
    date: new Date().toLocaleDateString('en-CA'), 
    event: 'Friendly Game',
    place: 'Online',
    comment: '',
  },
  customNotes: '',
  isJosekiRecord: false,
});