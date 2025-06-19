
import React from 'react';
import { SgfGameRecord, BoardState, MoveNode } from '../types';
import { GameListItem } from './GameListItem';
import { deriveBoardFromMoves } from '../utils/sgfUtils';
import { DEFAULT_BOARD_SIZE } from '../constants';
import { getMainLinePath, getMovesForPath, PathMove } from '../utils/treeUtils';


interface GameListProps {
  games: SgfGameRecord[];
  onSelectGame: (id: string) => void;
  onDeleteGame: (id: string) => void; 
  onEditGame: (game: SgfGameRecord) => void; 
  displayHorizontal?: boolean;
}

export const GameList: React.FC<GameListProps> = ({ games, onSelectGame, onDeleteGame, onEditGame, displayHorizontal }) => {
  if (games.length === 0) {
    return <p className="text-center text-slate-500 py-8">No game records yet. Add one to get started!</p>;
  }

  const sortedGames = [...games].sort((a, b) => {
    const dateA = a.metadata.date ? new Date(a.metadata.date).getTime() : 0;
    const dateB = b.metadata.date ? new Date(b.metadata.date).getTime() : 0;
    
    if (dateB !== dateA) {
        return dateB - dateA;
    }
    return parseInt(b.id) - parseInt(a.id); 
  });

  if (displayHorizontal) {
    return (
      <div className="flex overflow-x-auto space-x-3 pb-3 hide-scrollbar">
        {sortedGames.map(game => {
          const boardX = game.boardXSize || DEFAULT_BOARD_SIZE;
          const boardY = game.boardYSize || DEFAULT_BOARD_SIZE;
          
          // Get moves from the main line of the gameTree for thumbnail
          const mainLinePath = getMainLinePath(game.gameTree);
          const movesForThumbnail: PathMove[] = getMovesForPath(game.gameTree, mainLinePath);

          const { boardState: finalBoardState } = deriveBoardFromMoves(
            movesForThumbnail, 
            game.initialPlayer, 
            boardX,
            boardY
          );
          
          return (
            <GameListItem 
                key={game.id} 
                game={game} 
                onSelect={() => onSelectGame(game.id)}
                onDelete={() => onDeleteGame(game.id)} 
                onEdit={() => onEditGame(game)} 
                displayCard={true}
                finalBoardState={finalBoardState}
                boardXSize={boardX}
                boardYSize={boardY}
                // Pass move count from the main line for display
                moveCount={movesForThumbnail.length} 
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedGames.map(game => {
        // For list view, calculate main line move count as well
        const mainLinePath = getMainLinePath(game.gameTree);
        const movesForList: PathMove[] = getMovesForPath(game.gameTree, mainLinePath);
        return (
            <GameListItem 
                key={game.id} 
                game={game} 
                onSelect={() => onSelectGame(game.id)}
                onDelete={() => onDeleteGame(game.id)}
                onEdit={() => onEditGame(game)}
                displayCard={false}
                moveCount={movesForList.length}
            />
        );
    })}
    </div>
  );
};