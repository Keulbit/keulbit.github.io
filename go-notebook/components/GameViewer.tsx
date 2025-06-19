import React, { useMemo, useState, useEffect } from 'react';
import { SgfGameRecord, StoneColor, SgfCoord, MoveNode } from '../types';
import { GameBoard } from './GameBoard';
import { EditIcon } from './icons/EditIcon';
import { CloseIcon } from './icons/CloseIcon';
import { TrashIcon } from './icons/TrashIcon';
import { deriveBoardFromMoves } from '../utils/sgfUtils';
import { 
    getMovesForPath, 
    getNodeByPath, 
    getMainLinePath,
    PathMove
} from '../utils/treeUtils';
import { MoveTreeView } from './MoveTreeView'; // Import MoveTreeView

// Icons for navigation
import { FirstMoveIcon } from './icons/FirstMoveIcon';
import { PreviousMoveIcon } from './icons/PreviousMoveIcon';
import { NextMoveIcon } from './icons/NextMoveIcon';
import { LastMoveIcon } from './icons/LastMoveIcon';
import { PreviousTenMovesIcon } from './icons/PreviousTenMovesIcon'; // Import
import { NextTenMovesIcon } from './icons/NextTenMovesIcon';     // Import

import { JOSEKI_DISPLAY_SIZE, DEFAULT_BOARD_SIZE } from '../constants';


interface GameViewerProps {
  game: SgfGameRecord;
  onClose: () => void;
  onEdit: (game: SgfGameRecord) => void;
  onDelete: (id: string) => void;
}

export const GameViewer: React.FC<GameViewerProps> = ({ game, onClose, onEdit, onDelete }) => {
  const {
    id,
    rules,
    komi,
    initialPlayer,
    gameTree, 
    result,
    metadata,
    customNotes,
    boardXSize,
    boardYSize,
    isJosekiRecord,
  } = game;

  const actualBoardXSize = boardXSize || DEFAULT_BOARD_SIZE;
  const actualBoardYSize = boardYSize || DEFAULT_BOARD_SIZE;

  const [activeNodePath, setActiveNodePath] = useState<string[]>([]); 

  useEffect(() => {
    setActiveNodePath(getMainLinePath(gameTree || []));
  }, [gameTree, id]);


  const currentMovesForBoard: PathMove[] = useMemo(() => {
    return getMovesForPath(gameTree || [], activeNodePath);
  }, [gameTree, activeNodePath]);

  const derivedInfo = useMemo(() => {
    return deriveBoardFromMoves(currentMovesForBoard, initialPlayer, actualBoardXSize, actualBoardYSize);
  }, [currentMovesForBoard, initialPlayer, actualBoardXSize, actualBoardYSize]);

  const { boardState, capturedByBlack, capturedByWhite, nextPlayer } = derivedInfo;

  const moveNumbersMap = useMemo(() => {
    const map: { [key: SgfCoord]: number } = {};
    currentMovesForBoard.forEach((move, index) => {
      map[move.coord] = index + 1; 
    });
    return map;
  }, [currentMovesForBoard]);

  const handleGoToFirst = () => setActiveNodePath([]);
  
  const handleGoToPrevious = () => {
    if (activeNodePath.length > 0) {
      setActiveNodePath(activeNodePath.slice(0, -1));
    }
  };

  const handleGoToNext = () => {
    const tree = gameTree || [];
    const currentNode = getNodeByPath(tree, activeNodePath);
    if (currentNode && currentNode.children.length > 0) {
      setActiveNodePath([...activeNodePath, currentNode.children[0].id]);
    } else if (!currentNode && tree.length > 0 && activeNodePath.length === 0) {
      setActiveNodePath([tree[0].id]);
    }
  };
  
  const handleGoToLast = () => {
    setActiveNodePath(getMainLinePath(gameTree || []));
  };

  const handlePreviousTenMoves = () => {
    const newLength = Math.max(0, activeNodePath.length - 10);
    setActiveNodePath(activeNodePath.slice(0, newLength));
  };

  const handleNextTenMoves = () => {
    let currentPath = [...activeNodePath];
    const tree = gameTree || [];
    for (let i = 0; i < 10; i++) {
      const currentNode = getNodeByPath(tree, currentPath);
      if (currentNode && currentNode.children.length > 0) {
        currentPath.push(currentNode.children[0].id);
      } else if (!currentNode && tree.length > 0 && currentPath.length === 0) {
        currentPath.push(tree[0].id);
      }
      else {
        break; 
      }
    }
    setActiveNodePath(currentPath);
  };

  const handleTreeNodeSelect = (newPath: string[]) => {
    setActiveNodePath(newPath);
  };

  const totalMovesInMainLine = useMemo(() => {
    return getMainLinePath(gameTree || []).length;
  }, [gameTree]);

  const currentMoveNumber = activeNodePath.length;

  const displayMetadata = [
    { label: "Event", value: metadata.event },
    { label: "Date", value: metadata.date ? new Date(metadata.date).toLocaleDateString() : undefined },
    { label: "Black Player", value: metadata.blackPlayer },
    { label: "White Player", value: metadata.whitePlayer },
    { label: "Board Size", value: `${actualBoardXSize}x${actualBoardYSize}`},
    { label: "Rules", value: rules },
    { label: "Komi", value: komi?.toString() },
    { label: "Result", value: result },
    { label: "Place", value: metadata.place },
    { label: "Initial Player", value: initialPlayer === StoneColor.Black ? "Black" : "White" },
    { label: "Total Moves (Main Line)", value: totalMovesInMainLine.toString() },
    { label: "View Mode", value: isJosekiRecord ? `Joseki (${JOSEKI_DISPLAY_SIZE}x${JOSEKI_DISPLAY_SIZE})` : "Full Board"},
  ];

  const commonIconButtonClass = "p-2 rounded-full transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1";
  const navButtonClass = `p-2 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
  const iconClass = "w-5 h-5 sm:w-6 sm:h-6";
  
  const currentActiveNode = getNodeByPath(gameTree || [], activeNodePath);
  const currentMoveComment = currentActiveNode?.comment;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-700">{metadata.event || 'Game Record'}</h2>
            <p className="text-xs text-slate-400">ID: {id}</p>
        </div>
        <div className="flex space-x-1 sm:space-x-2">
           <button onClick={() => onEdit(game)} className={`${commonIconButtonClass} text-blue-500 hover:text-blue-700 hover:bg-blue-100 focus:ring-blue-500`} title="Edit Record" aria-label="Edit Game Record"> <EditIcon className="w-5 h-5 sm:w-6 sm:h-6" /> </button>
           <button onClick={() => onDelete(game.id)} className={`${commonIconButtonClass} text-red-500 hover:text-red-700 hover:bg-red-100 focus:ring-red-500`} title="Delete Record" aria-label="Delete Game Record"> <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6" /> </button>
           <button onClick={onClose} className={`${commonIconButtonClass} text-slate-600 hover:text-slate-800 hover:bg-slate-200 focus:ring-slate-500`} title="Close Viewer" aria-label="Close Game Viewer"> <CloseIcon className="w-5 h-5 sm:w-6 sm:h-6" /> </button>
        </div>
      </div>

      <details open className="border border-slate-200 rounded-md shadow-sm">
        <summary className="p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-t-md transition-colors duration-150 ease-in-out">Game Information</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm p-4 border-t border-slate-200">
          {displayMetadata.map(item => item.value !== undefined && item.value !== '' ? (
            <div key={item.label}> <span className="font-medium text-slate-500">{item.label}: </span> <span className="text-slate-700">{item.value}</span> </div>
          ) : null)}
        </div>
      </details>
      
       <div className="my-4 p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-2">
            <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-600">
                  {currentMoveNumber === 0 ? `Initial state, Next: ${nextPlayer === StoneColor.Black ? "Black" : "White"}` : `After Move ${currentMoveNumber}, Next: ${nextPlayer === StoneColor.Black ? "Black" : "White"}`}
                </span>
            </div>
        </div>
        <div className="flex justify-around text-sm text-slate-500">
            <span>Black Captured: {capturedByBlack}</span>
            <span>White Captured: {capturedByWhite}</span>
        </div>
      </div>
      
      <div>
        <h3 className="text-xl font-semibold text-slate-600 mb-2">Board Position (Move {currentMoveNumber} / {totalMovesInMainLine} on main line)</h3>
        <div className="aspect-square w-full max-w-lg mx-auto goban-bg shadow-lg rounded p-2">
          <GameBoard 
              boardState={boardState} 
              interactive={false} 
              moveNumbersMap={moveNumbersMap}
              displayJosekiCornerSize={isJosekiRecord ? JOSEKI_DISPLAY_SIZE : undefined}
          />
        </div>
      </div>
      
      <MoveTreeView
        treeData={gameTree || []}
        activePath={activeNodePath}
        onNodeSelect={handleTreeNodeSelect}
        initialPlayer={initialPlayer}
      />

      <div className="flex justify-center items-center space-x-1 sm:space-x-2 p-2 bg-slate-100 rounded-md shadow-sm" role="toolbar" aria-label="Game Navigation">
        <button onClick={handleGoToFirst} disabled={activeNodePath.length === 0} className={navButtonClass} aria-label="Go to first move"> <FirstMoveIcon className={iconClass} /> </button>
        <button type="button" onClick={handlePreviousTenMoves} disabled={activeNodePath.length === 0} className={navButtonClass} aria-label="Previous 10 moves"> <PreviousTenMovesIcon className={iconClass} /> </button>
        <button onClick={handleGoToPrevious} disabled={activeNodePath.length === 0} className={navButtonClass} aria-label="Go to previous move"> <PreviousMoveIcon className={iconClass} /> </button>
        <button onClick={handleGoToNext} 
                disabled={(getNodeByPath(gameTree || [], activeNodePath)?.children.length === 0 && activeNodePath.length > 0) || (activeNodePath.length === 0 && (gameTree||[]).length === 0)}
                className={navButtonClass} aria-label="Go to next move (main variation)"> <NextMoveIcon className={iconClass} /> </button>
        <button type="button" onClick={handleNextTenMoves} 
                disabled={(getNodeByPath(gameTree || [], activeNodePath)?.children.length === 0 && activeNodePath.length > 0) || (activeNodePath.length === 0 && (gameTree||[]).length === 0)}
                className={navButtonClass} aria-label="Next 10 moves"> <NextTenMovesIcon className={iconClass} /> </button>
        <button onClick={handleGoToLast} 
                disabled={activeNodePath.join(',') === getMainLinePath(gameTree || []).join(',') && (gameTree || []).length > 0} 
                className={navButtonClass} aria-label="Go to last move (main variation)"> <LastMoveIcon className={iconClass} /> </button>
      </div>


      {(customNotes || metadata.comment || currentMoveComment) ? (
        <details className="border border-slate-200 rounded-md shadow-sm">
            <summary className="p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-t-md transition-colors duration-150 ease-in-out">Notes & Comments</summary>
            <div className="p-4 space-y-3 border-t border-slate-200 bg-white rounded-b-md">
            {currentMoveComment && ( <div> <h4 className="text-md font-semibold text-slate-600 mb-1">Comment for Move {currentMoveNumber}</h4> <div className="p-3 rounded-md prose max-w-none whitespace-pre-wrap text-sm border border-blue-200 bg-blue-50 break-words"> {currentMoveComment} </div> </div> )}
            {customNotes && ( <div> <h4 className="text-md font-semibold text-slate-600 mb-1">Global Notes</h4> <div className="p-3 rounded-md prose max-w-none whitespace-pre-wrap text-sm border border-slate-200 bg-slate-50 break-words"> {customNotes} </div> </div> )}
            {metadata.comment && ( <div> <h4 className="text-md font-semibold text-slate-600 mb-1">Game Comment (SGF GC Property)</h4> <div className="p-3 rounded-md prose max-w-none whitespace-pre-wrap text-sm border border-slate-200 bg-slate-50 break-words"> {metadata.comment} </div> </div> )}
            </div>
        </details>
      ) : (
         <div className="mt-4"> 
            <h3 className="text-xl font-semibold text-slate-600 mb-2">Notes & Comments</h3> 
            <p className="text-slate-500 italic p-3 bg-white border border-slate-200 rounded-md">No notes or comments for this record.</p> 
        </div>
      )}

      <div className="mt-6 flex justify-center"> 
        <button  onClick={onClose} className="px-6 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md font-medium shadow-sm hover:shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"> Back to List </button> 
      </div>
    </div>
  );
};
