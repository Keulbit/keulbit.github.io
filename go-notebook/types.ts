export enum StoneColor {
  Black = 'B',
  White = 'W',
}

export type BoardPoint = StoneColor | null;
export type BoardState = BoardPoint[][];

// SGF-like coordinate string, e.g., "qd" for col q, row d
export type SgfCoord = string; 
export type MoveTuple = [player: StoneColor, coord: SgfCoord]; // Still useful for intermediate processing

export interface MoveNode {
  id: string;          // Unique identifier for the node (e.g., "0", "0-1", "0-1-0")
  player: StoneColor;
  coord: SgfCoord;
  comment?: string;
  children: MoveNode[];
  // parentId: string | null; // Keep it simple for now, can derive path or find parent by traversing
  // SGF specific properties like name (N), good for black (GB), etc. can be added here
  // Example: properties?: { [sgfProp: string]: string[] };
}

export interface SgfMetadata {
  blackPlayer?: string;
  whitePlayer?: string;
  date?: string; // YYYY-MM-DD
  event?: string;
  place?: string;
  comment?: string; // General game notes (GC property in SGF)
}

export interface SgfGameRecord {
  id: string; // Unique game ID
  rules: string;
  komi: number;
  boardXSize: number;
  boardYSize: number;
  initialPlayer: StoneColor;
  gameTree: MoveNode[]; // Sequence of moves as a tree
  result?: string;
  metadata: SgfMetadata;
  customNotes?: string; 
  isJosekiRecord?: boolean;
}