
import { BoardState, StoneColor, BoardPoint } from './types';
// BOARD_SIZE constant is removed from here. Dimensions will be passed as arguments.

export const deepCopyBoard = (board: BoardState): BoardState => {
  return board.map(row => [...row]);
};

export const boardsAreEqual = (board1: BoardState | null, board2: BoardState | null): boolean => {
  if (!board1 || !board2) return board1 === board2;
  if (board1.length !== board2.length) return false;
  for (let i = 0; i < board1.length; i++) {
    if (board1[i].length !== board2[i].length) return false;
    for (let j = 0; j < board1[i].length; j++) {
      if (board1[i][j] !== board2[i][j]) return false;
    }
  }
  return true;
};

const getNeighbors = (
  r: number, 
  c: number, 
  boardWidth: number, 
  boardHeight: number
): { r: number; c: number }[] => {
  const neighbors = [];
  if (r > 0) neighbors.push({ r: r - 1, c });
  if (r < boardHeight - 1) neighbors.push({ r: r + 1, c });
  if (c > 0) neighbors.push({ r, c: c - 1 });
  if (c < boardWidth - 1) neighbors.push({ r, c: c + 1 });
  return neighbors;
};

export const findGroupAndLiberties = (
  board: BoardState,
  r: number,
  c: number,
  color: StoneColor,
  boardWidth: number,
  boardHeight: number
): { group: { r: number; c: number }[]; liberties: number } => {
  const group: { r: number; c: number }[] = [];
  const libertyCoords = new Set<string>();
  const q: { r: number; c: number }[] = [{ r, c }];
  const visited = new Set<string>();
  visited.add(`${r},${c}`);

  while (q.length > 0) {
    const curr = q.shift()!;
    group.push(curr);

    for (const neighbor of getNeighbors(curr.r, curr.c, boardWidth, boardHeight)) {
      const neighborKey = `${neighbor.r},${neighbor.c}`;
      if (board[neighbor.r][neighbor.c] === null) {
        libertyCoords.add(neighborKey);
      } else if (board[neighbor.r][neighbor.c] === color && !visited.has(neighborKey)) {
        visited.add(neighborKey);
        q.push(neighbor);
      }
    }
  }
  return { group, liberties: libertyCoords.size };
};

export const checkAndPerformCaptures = (
  board: BoardState,
  lastMoveR: number,
  lastMoveC: number,
  movedPlayerColor: StoneColor,
  boardWidth: number,
  boardHeight: number
): { newBoard: BoardState; stonesCaptured: number } => {
  let newBoard = deepCopyBoard(board);
  let stonesCaptured = 0;
  const opponentColor = movedPlayerColor === StoneColor.Black ? StoneColor.White : StoneColor.Black;

  for (const neighbor of getNeighbors(lastMoveR, lastMoveC, boardWidth, boardHeight)) {
    if (newBoard[neighbor.r][neighbor.c] === opponentColor) {
      const { group, liberties } = findGroupAndLiberties(newBoard, neighbor.r, neighbor.c, opponentColor, boardWidth, boardHeight);
      if (liberties === 0) {
        stonesCaptured += group.length;
        for (const stone of group) {
          newBoard[stone.r][stone.c] = null;
        }
      }
    }
  }
  return { newBoard, stonesCaptured };
};


export interface ValidMoveResult {
  valid: boolean;
  error?: 'occupied' | 'suicide' | 'ko' | 'out_of_bounds';
  newBoard?: BoardState;
  stonesCaptured?: number;
}

export const isValidMove = (
  currentBoard: BoardState,
  r: number,
  c: number,
  playerColor: StoneColor,
  boardStateBeforeOpponentMoved: BoardState | null, // For Ko check
  boardWidth: number,
  boardHeight: number
): ValidMoveResult => {
  if (r < 0 || r >= boardHeight || c < 0 || c >= boardWidth) {
    return { valid: false, error: 'out_of_bounds' }; 
  }
  if (currentBoard[r][c] !== null) {
    return { valid: false, error: 'occupied' };
  }

  let tempBoard = deepCopyBoard(currentBoard);
  tempBoard[r][c] = playerColor;

  const { newBoard: boardAfterCaptures, stonesCaptured } = checkAndPerformCaptures(
    tempBoard,
    r,
    c,
    playerColor,
    boardWidth,
    boardHeight
  );
  
  const { liberties: groupLibertiesAfterCapture } = findGroupAndLiberties(boardAfterCaptures, r, c, playerColor, boardWidth, boardHeight);
  if (groupLibertiesAfterCapture === 0) {
    return { valid: false, error: 'suicide' };
  }

  if (boardsAreEqual(boardAfterCaptures, boardStateBeforeOpponentMoved)) {
     return { valid: false, error: 'ko' };
  }

  return {
    valid: true,
    newBoard: boardAfterCaptures,
    stonesCaptured,
  };
};
