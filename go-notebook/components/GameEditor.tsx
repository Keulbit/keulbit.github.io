
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SgfGameRecord, BoardState, StoneColor, MoveNode, SgfMetadata, SgfCoord } from '../types';
import { GameBoard } from './GameBoard';
import { DEFAULT_BOARD_SIZE, INITIAL_SGF_GAME_RECORD, JOSEKI_DISPLAY_SIZE } from '../constants';
import { UndoIcon } from './icons/UndoIcon';
import { isValidMove } from '../gameLogic';
import { toSgfCoord, deriveBoardFromMoves } from '../utils/sgfUtils';
import { 
    getMovesForPath, 
    getNodeByPath, 
    createMoveNode, 
    addChildNodeToPath,
    getParentNodeAndPath,
    deepCopyTree,
    PathMove,
    getMainLinePath 
} from '../utils/treeUtils';
import { MoveTreeView } from './MoveTreeView'; // Import MoveTreeView

// Icons for navigation
import { FirstMoveIcon } from './icons/FirstMoveIcon';
import { PreviousMoveIcon } from './icons/PreviousMoveIcon';
import { NextMoveIcon } from './icons/NextMoveIcon';
import { LastMoveIcon } from './icons/LastMoveIcon';
import { PreviousTenMovesIcon } from './icons/PreviousTenMovesIcon'; // Import
import { NextTenMovesIcon } from './icons/NextTenMovesIcon';     // Import

interface GameEditorProps {
  initialGame: SgfGameRecord;
  onSave: (game: SgfGameRecord) => void;
  onCancel: () => void;
}

const deepCopyMetadata = (metadata: SgfMetadata): SgfMetadata => JSON.parse(JSON.stringify(metadata));

export const GameEditor: React.FC<GameEditorProps> = ({ initialGame, onSave, onCancel }) => {
  const [recordId, setRecordId] = useState(initialGame.id);
  const [metadata, setMetadata] = useState<SgfMetadata>(() => deepCopyMetadata(initialGame.metadata));
  const [customNotes, setCustomNotes] = useState(initialGame.customNotes || '');
  const [rules, setRules] = useState(initialGame.rules);
  const [komi, setKomi] = useState(initialGame.komi);
  const [initialPlayerState, setInitialPlayerState] = useState<StoneColor>(initialGame.initialPlayer);
  const [resultText, setResultText] = useState(initialGame.result || '');
  const [isJoseki, setIsJoseki] = useState(initialGame.isJosekiRecord || false);
  const [boardX, setBoardX] = useState(initialGame.boardXSize || DEFAULT_BOARD_SIZE);
  const [boardY, setBoardY] = useState(initialGame.boardYSize || DEFAULT_BOARD_SIZE);
  
  const [gameTreeData, setGameTreeData] = useState<MoveNode[]>(() => deepCopyTree(initialGame.gameTree || []));
  const [activeNodePath, setActiveNodePath] = useState<string[]>([]); 
  
  const [highlightedPoint, setHighlightedPoint] = useState<{row: number, col: number} | null>(null);

  // This useEffect correctly handles initialization and changes to the initialGame prop.
  useEffect(() => {
    setRecordId(initialGame.id);
    setMetadata(deepCopyMetadata(initialGame.metadata));
    setCustomNotes(initialGame.customNotes || '');
    setRules(initialGame.rules);
    setKomi(initialGame.komi);
    setInitialPlayerState(initialGame.initialPlayer);
    setResultText(initialGame.result || '');
    
    const newTree = deepCopyTree(initialGame.gameTree || []);
    setGameTreeData(newTree);
    setActiveNodePath(getMainLinePath(newTree)); // Set to main line of the potentially new tree

    setIsJoseki(initialGame.isJosekiRecord || false);
    setBoardX(initialGame.boardXSize || DEFAULT_BOARD_SIZE);
    setBoardY(initialGame.boardYSize || DEFAULT_BOARD_SIZE);
  }, [initialGame]);

  // The following useEffect was causing the issue by resetting activeNodePath
  // to the main line whenever gameTreeData changed (e.g., after adding a move).
  // It has been removed.
  //
  // useEffect(() => {
  //   setActiveNodePath(getMainLinePath(gameTreeData || []));
  // }, [gameTreeData]);


  const currentMovesForBoard: PathMove[] = useMemo(() => {
    return getMovesForPath(gameTreeData, activeNodePath);
  }, [gameTreeData, activeNodePath]);

  const derivedInfo = useMemo(() => {
    return deriveBoardFromMoves(
      currentMovesForBoard,
      initialPlayerState,
      boardX,
      boardY
    );
  }, [currentMovesForBoard, initialPlayerState, boardX, boardY]);

  const { 
    boardState: derivedBoardState, 
    capturedByBlack: derivedCapturedB, 
    capturedByWhite: derivedCapturedW, 
    nextPlayer: derivedNextPlayer,
    boardHistory: derivedBoardHistory
  } = derivedInfo;


  const handleBoardClick = (row: number, col: number) => {
    const playerForNewMove = derivedNextPlayer; 
    const boardStateForValidation = derivedBoardState; 
    
    const koRelevantPrevState = derivedBoardHistory.length > 1 ? derivedBoardHistory[derivedBoardHistory.length - 2] : null;

    const moveValidation = isValidMove(
      boardStateForValidation,
      row,
      col,
      playerForNewMove,
      koRelevantPrevState,
      boardX,
      boardY
    );

    if (moveValidation.valid) {
      const sgfCoord = toSgfCoord(col, row, boardX, boardY);
      const parentNode = getNodeByPath(gameTreeData, activeNodePath); 
      
      const existingChild = parentNode ? parentNode.children.find(
        child => child.player === playerForNewMove && child.coord === sgfCoord
      ) : gameTreeData.find( 
        rootNode => rootNode.player === playerForNewMove && rootNode.coord === sgfCoord
      );

      if (existingChild) {
        setActiveNodePath([...activeNodePath, existingChild.id]);
      } else {
        const newNode = createMoveNode(playerForNewMove, sgfCoord);
        const newTree = addChildNodeToPath(gameTreeData, activeNodePath, newNode);
        setGameTreeData(newTree);
        setActiveNodePath([...activeNodePath, newNode.id]);
      }
    } else {
      let errorMessage = "Invalid move.";
      if (moveValidation.error === 'occupied') errorMessage = "Point is already occupied.";
      else if (moveValidation.error === 'suicide') errorMessage = "Illegal move: Suicide.";
      else if (moveValidation.error === 'ko') errorMessage = "Illegal move: Ko.";
      alert(errorMessage);
    }
  };

  const handleUndoLastAction = () => { 
    if (activeNodePath.length > 0) {
        setActiveNodePath(activeNodePath.slice(0, -1));
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: recordId,
      rules,
      komi,
      boardXSize: boardX,
      boardYSize: boardY,
      initialPlayer: initialPlayerState,
      gameTree: gameTreeData, 
      result: resultText,
      metadata,
      customNotes,
      isJosekiRecord: isJoseki,
    });
  };
  
  const handleMetadataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMetadata(prev => ({ ...prev, [name]: value }));
  };
  
  const handleMouseEnterPoint = (row: number, col: number) => {
    if (derivedBoardState[row]?.[col] === null) { 
        setHighlightedPoint({row, col});
    } else {
        setHighlightedPoint(null);
    }
  };

  const handleMouseLeaveBoard = () => {
    setHighlightedPoint(null);
  };

  const moveNumbersMap = useMemo(() => {
    const map: { [key: SgfCoord]: number } = {};
    currentMovesForBoard.forEach((move, index) => {
      map[move.coord] = index + 1; 
    });
    return map;
  }, [currentMovesForBoard]);
  
  const editorTitle = recordId && initialGame.gameTree && initialGame.gameTree.length > 0 ? 'Edit Record' : 'Add New Record';

  const isGameInfoDefaultOpen = editorTitle === 'Edit Record';

  const handleGoToFirst = () => setActiveNodePath([]); 
  
  const handleGoToPrevious = () => {
    if (activeNodePath.length > 0) {
      setActiveNodePath(activeNodePath.slice(0, -1));
    }
  };

  const handleGoToNext = () => {
    const currentNode = getNodeByPath(gameTreeData, activeNodePath);
    if (currentNode && currentNode.children.length > 0) {
      setActiveNodePath([...activeNodePath, currentNode.children[0].id]);
    } else if (!currentNode && gameTreeData.length > 0 && activeNodePath.length === 0) {
      // If at initial state and tree exists, go to first move of main line
      setActiveNodePath([gameTreeData[0].id]);
    }
  };
  
  const handleGoToLast = () => {
    setActiveNodePath(getMainLinePath(gameTreeData));
  };

  const handlePreviousTenMoves = () => {
    const newLength = Math.max(0, activeNodePath.length - 10);
    setActiveNodePath(activeNodePath.slice(0, newLength));
  };

  const handleNextTenMoves = () => {
    let currentPath = [...activeNodePath];
    for (let i = 0; i < 10; i++) {
      const currentNode = getNodeByPath(gameTreeData, currentPath);
      if (currentNode && currentNode.children.length > 0) {
        currentPath.push(currentNode.children[0].id);
      } else if (!currentNode && gameTreeData.length > 0 && currentPath.length === 0) {
        // From initial state, move to first node
        currentPath.push(gameTreeData[0].id);
      }
      else {
        break; // No more moves in this line
      }
    }
    setActiveNodePath(currentPath);
  };
  
  const handleTreeNodeSelect = (newPath: string[]) => {
    setActiveNodePath(newPath);
  };


  const commonInputClass = "w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors";
  const commonLabelClass = "block text-sm font-medium text-slate-600 mb-1";
  const navButtonClass = `p-2 rounded-md hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`;
  const iconClass = "w-5 h-5 sm:w-6 sm:h-6";
  
  const currentMoveNumber = activeNodePath.length;
  const totalMovesInMainLine = useMemo(() => { 
    return getMainLinePath(gameTreeData).length;
  }, [gameTreeData]);


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-700 mb-4">
        {editorTitle}
      </h2>
      
      <details open={isGameInfoDefaultOpen} className="border border-slate-200 rounded-md shadow-sm">
        <summary className="p-3 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 rounded-t-md transition-colors duration-150 ease-in-out">Game Information</summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 p-4 border-t border-slate-200">
            <div> <label htmlFor="event" className={commonLabelClass}>Event</label> <input type="text" name="event" id="event" value={metadata.event || ''} onChange={handleMetadataChange} className={commonInputClass} placeholder="e.g., Championship Final"/> </div>
            <div> <label htmlFor="date" className={commonLabelClass}>Date</label> <input type="date" name="date" id="date" value={metadata.date || ''} onChange={handleMetadataChange} className={commonInputClass}/> </div>
            <div> <label htmlFor="blackPlayer" className={commonLabelClass}>Black Player</label> <input type="text" name="blackPlayer" id="blackPlayer" value={metadata.blackPlayer || ''} onChange={handleMetadataChange} className={commonInputClass} placeholder="Name"/> </div>
            <div> <label htmlFor="whitePlayer" className={commonLabelClass}>White Player</label> <input type="text" name="whitePlayer" id="whitePlayer" value={metadata.whitePlayer || ''} onChange={handleMetadataChange} className={commonInputClass} placeholder="Name"/> </div>
            <div> <label htmlFor="rules" className={commonLabelClass}>Ruleset</label> <input type="text" name="rules" id="rules" value={rules} onChange={(e) => setRules(e.target.value)} className={commonInputClass} placeholder="e.g., Chinese, Japanese"/> </div>
            <div> <label htmlFor="komi" className={commonLabelClass}>Komi</label> <input type="number" step="0.5" name="komi" id="komi" value={komi} onChange={(e) => setKomi(parseFloat(e.target.value))} className={commonInputClass} /> </div>
            <div> <label htmlFor="initialPlayerState" className={commonLabelClass}>Initial Player</label> 
                  <select name="initialPlayerState" id="initialPlayerState" value={initialPlayerState} 
                          onChange={(e) => { 
                              setInitialPlayerState(e.target.value as StoneColor); 
                              setGameTreeData([]); 
                              setActiveNodePath([]); 
                          }} 
                          className={commonInputClass}> 
                      <option value={StoneColor.Black}>Black</option> 
                      <option value={StoneColor.White}>White</option> 
                  </select> 
            </div>
            <div> <label htmlFor="resultText" className={commonLabelClass}>Result</label> <input type="text" name="resultText" id="resultText" value={resultText} onChange={(e) => setResultText(e.target.value)} className={commonInputClass} placeholder="e.g, B+R, W+3.5"/> </div>
            <div className="md:col-span-1">
              <label htmlFor="boardXSize" className={commonLabelClass}>Board Width (X)</label>
              <input type="number" name="boardXSize" id="boardXSize" value={boardX} onChange={(e) => setBoardX(parseInt(e.target.value,10) || DEFAULT_BOARD_SIZE)} className={commonInputClass} min="2" max="25" />
            </div>
            <div className="md:col-span-1">
              <label htmlFor="boardYSize" className={commonLabelClass}>Board Height (Y)</label>
              <input type="number" name="boardYSize" id="boardYSize" value={boardY} onChange={(e) => setBoardY(parseInt(e.target.value,10) || DEFAULT_BOARD_SIZE)} className={commonInputClass} min="2" max="25" />
            </div>
            <div className="md:col-span-2"> <label htmlFor="place" className={commonLabelClass}>Place</label> <input type="text" name="place" id="place" value={metadata.place || ''} onChange={handleMetadataChange} className={commonInputClass} placeholder="e.g., Seoul"/> </div>
        </div>
      </details>

      <div className="p-3 bg-white border border-slate-200 rounded-md shadow-sm">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input 
            type="checkbox" 
            checked={isJoseki} 
            onChange={(e) => setIsJoseki(e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Joseki Study (Top-Left {JOSEKI_DISPLAY_SIZE}x{JOSEKI_DISPLAY_SIZE} View)</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-600 mb-2">Board Position (Move {currentMoveNumber} / {totalMovesInMainLine} on main line)</label>
        <div className="aspect-square w-full max-w-lg mx-auto goban-bg shadow-lg rounded p-2">
          <GameBoard 
              boardState={derivedBoardState} 
              onPointClick={handleBoardClick} 
              interactive 
              highlightedPoint={highlightedPoint} 
              onMouseEnterPoint={handleMouseEnterPoint} 
              onMouseLeaveBoard={handleMouseLeaveBoard} 
              currentPlayer={derivedNextPlayer}
              moveNumbersMap={moveNumbersMap}
              displayJosekiCornerSize={isJoseki ? JOSEKI_DISPLAY_SIZE : undefined}
          />
        </div>
      </div>
      
      <MoveTreeView 
        treeData={gameTreeData}
        activePath={activeNodePath}
        onNodeSelect={handleTreeNodeSelect}
        initialPlayer={initialPlayerState}
      />

      <div className="flex justify-center items-center space-x-1 sm:space-x-2 p-2 bg-slate-100 rounded-md shadow-sm" role="toolbar" aria-label="Editor Game Navigation">
        <button type="button" onClick={handleGoToFirst} disabled={activeNodePath.length === 0} className={navButtonClass} aria-label="Go to first move (initial state)"> <FirstMoveIcon className={iconClass} /> </button>
        <button type="button" onClick={handlePreviousTenMoves} disabled={activeNodePath.length === 0} className={navButtonClass} aria-label="Previous 10 moves"> <PreviousTenMovesIcon className={iconClass} /> </button>
        <button type="button" onClick={handleGoToPrevious} disabled={activeNodePath.length === 0} className={navButtonClass} aria-label="Go to previous move"> <PreviousMoveIcon className={iconClass} /> </button>
        <button type="button" onClick={handleUndoLastAction} disabled={activeNodePath.length === 0} className={`${navButtonClass} text-orange-600 hover:bg-orange-100`} aria-label="Step back to parent move"> <UndoIcon className={iconClass} /> </button>
        <button type="button" onClick={handleGoToNext} 
                disabled={getNodeByPath(gameTreeData, activeNodePath)?.children.length === 0 && (activeNodePath.length > 0 || gameTreeData.length === 0) } 
                className={navButtonClass} aria-label="Go to next move (main variation)"> <NextMoveIcon className={iconClass} /> </button>
        <button type="button" onClick={handleNextTenMoves} 
                disabled={getNodeByPath(gameTreeData, activeNodePath)?.children.length === 0 && (activeNodePath.length > 0 || gameTreeData.length === 0) } 
                className={navButtonClass} aria-label="Next 10 moves"> <NextTenMovesIcon className={iconClass} /> </button>
        <button type="button" onClick={handleGoToLast} 
                disabled={activeNodePath.join(',') === getMainLinePath(gameTreeData).join(',') && gameTreeData.length > 0} 
                className={navButtonClass} aria-label="Go to last move (main variation)"> <LastMoveIcon className={iconClass} /> </button>
      </div>

      <div className="my-4 p-3 bg-slate-50 rounded-md shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-3">
            <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-700">
                  {activeNodePath.length === 0 ? `Initial state. Next: ${derivedNextPlayer === StoneColor.Black ? "Black" : "White"}` : `After Move ${currentMoveNumber}. Next: ${derivedNextPlayer === StoneColor.Black ? "Black" : "White"}`}
                </span>
            </div>
        </div>
        <div className="flex justify-around text-sm text-slate-600">
            <span>Black Captured: {derivedCapturedB}</span>
            <span>White Captured: {derivedCapturedW}</span>
        </div>
      </div>

      {/* TODO: Add comment field for the current active MoveNode */}
      <div> <label htmlFor="customNotes" className={commonLabelClass}>Your Global Notes (for the whole record)</label> <textarea id="customNotes" name="customNotes" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} rows={3} placeholder="Add your personal analysis or reminders here..." className={commonInputClass} /> </div>
      <div> <label htmlFor="sgfComment" className={commonLabelClass}>Game Comment (SGF standard GC property)</label> <textarea id="sgfComment" name="comment" value={metadata.comment || ''} onChange={handleMetadataChange} rows={2} placeholder="General comments about the game (stored in SGF C[] property)" className={commonInputClass} /> </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-md font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"> Cancel </button>
        <button type="submit" className="px-4 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-md font-medium shadow-sm hover:shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"> Save Record </button>
      </div>
    </form>
  );
};
