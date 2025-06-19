
import { BoardState, StoneColor, SgfCoord, MoveTuple, MoveNode } from '../types';
import { checkAndPerformCaptures, deepCopyBoard, findGroupAndLiberties } from '../gameLogic'; 
import { PathMove } from './treeUtils'; // Import PathMove

export const toSgfCoord = (col: number, row: number, boardWidth: number, boardHeight: number): SgfCoord => {
  if (col < 0 || col >= boardWidth || row < 0 || row >= boardHeight) {
    console.warn(`Invalid coordinates for SGF: col=${col}, row=${row} for board ${boardWidth}x${boardHeight}`);
    return ''; 
  }
  return String.fromCharCode('a'.charCodeAt(0) + col) + String.fromCharCode('a'.charCodeAt(0) + row);
};

export const fromSgfCoord = (sgfCoord: SgfCoord, boardWidth: number, boardHeight: number): { c: number; r: number } | null => {
  if (sgfCoord.length !== 2) return null;
  const colChar = sgfCoord[0];
  const rowChar = sgfCoord[1];
  
  const c = colChar.charCodeAt(0) - 'a'.charCodeAt(0);
  const r = rowChar.charCodeAt(0) - 'a'.charCodeAt(0);

  if (c < 0 || c >= boardWidth || r < 0 || r >= boardHeight) {
    return null;
  }
  return { c, r };
};

export interface DerivedBoardInfo {
  boardState: BoardState;
  capturedByBlack: number;
  capturedByWhite: number;
  nextPlayer: StoneColor;
  boardHistory: BoardState[]; 
}

// Updated to use PathMove[] which includes id and comment, though only player/coord used for board derivation
export const deriveBoardFromMoves = (
  pathMoves: PathMove[], // Changed from MoveTuple[]
  initialPlayer: StoneColor,
  boardXSize: number,
  boardYSize: number
): DerivedBoardInfo => {
  let currentBoard: BoardState = Array(boardYSize).fill(null).map(() => Array(boardXSize).fill(null));
  const boardHistory: BoardState[] = [deepCopyBoard(currentBoard)];

  let capturedB = 0;
  let capturedW = 0;
  
  for (let i = 0; i < pathMoves.length; i++) {
    const { player: movePlayer, coord: sgfCoord } = pathMoves[i]; 
    const coord = fromSgfCoord(sgfCoord, boardXSize, boardYSize);

    if (!coord) {
      console.warn(`Skipping invalid SGF coordinate: ${sgfCoord} for board ${boardXSize}x${boardYSize}`);
      continue;
    }
    const { c: col, r: row } = coord;

    if (row < 0 || row >= boardYSize || col < 0 || col >= boardXSize) {
        console.warn(`Coordinate out of bounds: ${sgfCoord} -> (${row},${col}) for board ${boardXSize}x${boardYSize}`);
        continue;
    }
    
    if (currentBoard[row][col] !== null) {
      console.warn(`Skipping move on occupied point: ${sgfCoord} by ${movePlayer}. Current board may be inconsistent.`);
      continue;
    }

    let tempBoard = deepCopyBoard(currentBoard);
    tempBoard[row][col] = movePlayer;

    const captureResult = checkAndPerformCaptures(tempBoard, row, col, movePlayer, boardXSize, boardYSize);
    currentBoard = captureResult.newBoard;

    if (captureResult.stonesCaptured > 0) {
      if (movePlayer === StoneColor.Black) {
        capturedB += captureResult.stonesCaptured;
      } else {
        capturedW += captureResult.stonesCaptured;
      }
    }
    
    // This check might be too aggressive if SGF allows suicides that are then captured.
    // Modern Go rules usually don't allow suicide unless it captures.
    const { liberties } = findGroupAndLiberties(currentBoard, row, col, movePlayer, boardXSize, boardYSize);
    if (liberties === 0 && captureResult.stonesCaptured === 0) { // Check if the placed stone itself has no liberties (suicide)
       console.warn(`Move ${sgfCoord} by ${movePlayer} results in self-capture (suicide) not saved by other captures. Board state might be inaccurate if SGF allows this.`);
       // SGF usually implies valid moves. If a suicide is valid (e.g. captures a large group), this should be fine.
       // This logic assumes basic suicide is disallowed if it doesn't capture.
    }
    boardHistory.push(deepCopyBoard(currentBoard));
  }
  
  let nextPlayerAfterMoves = initialPlayer;
  if (pathMoves.length > 0) {
    const lastMovePlayer = pathMoves[pathMoves.length - 1].player;
    nextPlayerAfterMoves = lastMovePlayer === StoneColor.Black ? StoneColor.White : StoneColor.Black;
  }

  return {
    boardState: currentBoard,
    capturedByBlack: capturedB,
    capturedByWhite: capturedW,
    nextPlayer: nextPlayerAfterMoves,
    boardHistory, // History of board states *after* each move in pathMoves
  };
};

// Helper to convert old linear moves to new tree structure for localStorage migration
export const convertLinearMovesToTree = (
  linearMoves: MoveTuple[],
  initialPlayer: StoneColor
): MoveNode[] => {
  if (!linearMoves || linearMoves.length === 0) {
    return [];
  }

  const rootNode = createMoveNodeInternal(linearMoves[0][0], linearMoves[0][1]);
  let currentNode = rootNode;

  for (let i = 1; i < linearMoves.length; i++) {
    const nextMoveTuple = linearMoves[i];
    const newNode = createMoveNodeInternal(nextMoveTuple[0], nextMoveTuple[1]);
    currentNode.children.push(newNode);
    currentNode = newNode;
  }
  return [rootNode]; // Return as an array of root nodes
};

const createMoveNodeInternal = ( // Renamed to avoid conflict with imported createMoveNode from treeUtils
    player: StoneColor, 
    coord: SgfCoord, 
    comment?: string
): MoveNode => {
    // Basic ID generation, consider enhancing for more complex scenarios
    const id = `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return {
        id,
        player,
        coord,
        comment,
        children: [],
    };
};
