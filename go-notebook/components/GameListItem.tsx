
import React from 'react';
import { SgfGameRecord, BoardState } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { EditIcon } from './icons/EditIcon';
import { timeAgo } from '../utils/dateUtils'; 
import { GameBoard } from './GameBoard';


interface GameListItemProps {
  game: SgfGameRecord;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  displayCard?: boolean;
  finalBoardState?: BoardState; 
  boardXSize?: number; 
  boardYSize?: number; 
  moveCount?: number; // Added to display actual moves on main line
}

export const GameListItem: React.FC<GameListItemProps> = ({ 
  game, 
  onSelect, 
  onDelete, 
  onEdit, 
  displayCard,
  finalBoardState,
  boardXSize,
  boardYSize,
  moveCount = 0 // Default to 0 if not provided
}) => {
  const title = game.metadata.event || 'Go Game';
  const dateDisplay = displayCard 
    ? timeAgo(game.metadata.date) 
    : (game.metadata.date 
        ? new Date(game.metadata.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) 
        : 'No date');
  
  const notesPreviewText = game.customNotes?.substring(0,80) || game.metadata.comment?.substring(0,80) || "";
  const showEllipsis = notesPreviewText.length === 80 && ( (game.customNotes && game.customNotes.length > 80) || (game.metadata.comment && game.metadata.comment.length > 80));

  if (displayCard) {
    return (
      <div 
        onClick={onSelect} 
        className="flex-shrink-0 w-40 sm:w-48 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-150 ease-in-out cursor-pointer overflow-hidden"
        role="button"
        aria-label={`View game: ${title}, ${dateDisplay}`}
      >
        <div className="w-full h-28 sm:h-32 bg-slate-100 flex items-center justify-center overflow-hidden rounded-t-lg p-1.5"> {/* Frame for the board */}
          <div className="w-full h-full goban-bg rounded-sm shadow-sm flex items-center justify-center"> {/* Actual board background */}
            {finalBoardState && boardXSize && boardYSize ? (
              <GameBoard
                boardState={finalBoardState}
                interactive={false}
                thumbnailOptions={{
                  paddingRatio: 0.05, 
                  stoneRadiusRatio: 0.42, 
                  omitStarPoints: boardXSize > 13 || boardYSize > 13, 
                  lineStrokeWidth: 0.4,
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Preview</div>
            )}
          </div>
        </div>
        <div className="p-3">
          <h3 className="text-sm font-semibold text-slate-700 truncate" title={title}>{title}</h3>
          <p className="text-xs text-slate-500">{dateDisplay}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-all duration-150 ease-in-out flex justify-between items-center border border-slate-200">
      <div onClick={onSelect} className="cursor-pointer flex-grow pr-4 overflow-hidden" role="button" aria-label={`View game: ${title}`}>
        <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-700 truncate transition-colors" title={title}>{title}</h3>
        <p className="text-xs text-slate-500"> {dateDisplay} </p>
        <p className="text-sm text-slate-600 truncate mt-1" title={notesPreviewText || "No notes or comments."}>
            {notesPreviewText || <span className="italic text-slate-400">No notes or comments.</span>}
            {showEllipsis ? "..." : ""}
        </p>
         <p className="text-xs text-slate-400 mt-1">
            <span title={game.metadata.blackPlayer || 'Black'}>{game.metadata.blackPlayer || 'Black'}</span> vs <span title={game.metadata.whitePlayer || 'White'}>{game.metadata.whitePlayer || 'White'}</span> ({game.boardXSize || '?'}x{game.boardYSize || '?'}) - {moveCount} moves
        </p>
      </div>
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-1 sm:ml-2 flex-shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
          title="Edit Record" aria-label="Edit Game Record"
        >
          <EditIcon className="w-5 h-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
          title="Delete Record" aria-label="Delete Game Record"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
