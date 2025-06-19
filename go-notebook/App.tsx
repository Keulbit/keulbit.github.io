
import React, { useState, useEffect, useCallback } from 'react';
import { SgfGameRecord, MoveNode, MoveTuple } from './types'; // MoveTuple for migration
import { GameList } from './components/GameList';
import { GameEditor } from './components/GameEditor';
import { GameViewer } from './components/GameViewer';
import { PlusIcon } from './components/icons/PlusIcon';
import { ChevronRightIcon } from './components/icons/ChevronRightIcon';
import { HomeIcon } from './components/icons/HomeIcon';
import { GamesIcon } from './components/icons/GamesIcon';
import { ProfileIcon } from './components/icons/ProfileIcon';
import { INITIAL_SGF_GAME_RECORD } from './constants';
import { convertLinearMovesToTree } from './utils/sgfUtils'; // For migration
import { getMainLinePath, getMovesForPath } from './utils/treeUtils'; // For GameList thumbnail

type ViewMode = 'list' | 'editor' | 'viewer';
type ActiveTab = 'home' | 'games' | 'profile';

const LOCAL_STORAGE_KEY = 'badukSgfGameRecords_v2'; // New key for tree structure
const OLD_LOCAL_STORAGE_KEY = 'badukSgfGameRecords'; // Old key for linear moves

const App: React.FC = () => {
  const [gameRecords, setGameRecords] = useState<SgfGameRecord[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedGame, setSelectedGame] = useState<SgfGameRecord | null>(null);
  const [editingGame, setEditingGame] = useState<SgfGameRecord | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');


  useEffect(() => {
    const storedGames = localStorage.getItem(LOCAL_STORAGE_KEY);
    let migrated = false;

    if (!storedGames) {
      // Try to migrate from old format
      const oldStoredGames = localStorage.getItem(OLD_LOCAL_STORAGE_KEY);
      if (oldStoredGames) {
        try {
          const oldParsedGames: any[] = JSON.parse(oldStoredGames);
          const newGames: SgfGameRecord[] = oldParsedGames.map(oldGame => {
            const defaults = INITIAL_SGF_GAME_RECORD(oldGame.id || `migrated-${Date.now()}-${Math.random()}`);
            return {
              ...defaults,
              ...oldGame,
              metadata: { ...defaults.metadata, ...(oldGame.metadata || {}) },
              // CRITICAL: Convert moves to gameTree
              gameTree: oldGame.moves && Array.isArray(oldGame.moves) 
                        ? convertLinearMovesToTree(oldGame.moves as MoveTuple[], oldGame.initialPlayer || defaults.initialPlayer) 
                        : defaults.gameTree,
              moves: undefined, // Remove old moves property
              komi: typeof oldGame.komi === 'number' ? oldGame.komi : defaults.komi,
              initialPlayer: oldGame.initialPlayer || defaults.initialPlayer,
              rules: oldGame.rules || defaults.rules,
              boardXSize: oldGame.boardXSize || defaults.boardXSize,
              boardYSize: oldGame.boardYSize || defaults.boardYSize,
              isJosekiRecord: typeof oldGame.isJosekiRecord === 'boolean' ? oldGame.isJosekiRecord : false,
            };
          });
          setGameRecords(newGames);
          saveGamesToLocalStorage(newGames); // Save in new format
          localStorage.removeItem(OLD_LOCAL_STORAGE_KEY); // Remove old data
          migrated = true;
          console.log("Successfully migrated SGF records to new tree format.");
        } catch (e) {
          console.error("Failed to migrate old SGF game records", e);
          setGameRecords([]); // Start fresh if migration fails
        }
      }
    }

    if (storedGames && !migrated) {
      try {
        const parsedGames: SgfGameRecord[] = JSON.parse(storedGames);
        const validatedGames = parsedGames.map(game => {
          const defaults = INITIAL_SGF_GAME_RECORD(game.id || `loaded-${Date.now()}-${Math.random()}`);
          // Ensure gameTree exists and is an array
          const gameTree = Array.isArray(game.gameTree) ? game.gameTree : defaults.gameTree;
          
          return {
            ...defaults, 
            ...game, 
            gameTree, // Ensure gameTree is present
            metadata: { ...defaults.metadata, ...(game.metadata || {}) },
            komi: typeof game.komi === 'number' ? game.komi : defaults.komi,
            initialPlayer: game.initialPlayer || defaults.initialPlayer,
            rules: game.rules || defaults.rules,
            boardXSize: game.boardXSize || defaults.boardXSize,
            boardYSize: game.boardYSize || defaults.boardYSize,
            isJosekiRecord: typeof game.isJosekiRecord === 'boolean' ? game.isJosekiRecord : false,
          };
        });
        setGameRecords(validatedGames);
      } catch (e) {
        console.error("Failed to parse SGF game records from localStorage", e);
        setGameRecords([]);
      }
    }
  }, []);

  const saveGamesToLocalStorage = useCallback((games: SgfGameRecord[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(games));
  }, []);

  const handleAddNewGame = () => {
    setEditingGame(INITIAL_SGF_GAME_RECORD(Date.now().toString()));
    setViewMode('editor');
  };

  const handleSaveGame = (gameToSave: SgfGameRecord) => {
    let updatedGames;
    const gameWithEnsuredId = {
      ...gameToSave,
      id: gameToSave.id || Date.now().toString(),
    };

    const existingGameIndex = gameRecords.findIndex(g => g.id === gameWithEnsuredId.id);

    if (existingGameIndex > -1) { 
      updatedGames = gameRecords.map(g => g.id === gameWithEnsuredId.id ? gameWithEnsuredId : g);
    } else { 
      updatedGames = [...gameRecords, gameWithEnsuredId];
    }
    setGameRecords(updatedGames);
    saveGamesToLocalStorage(updatedGames);
    setViewMode('list');
    setActiveTab('home'); 
    setSelectedGame(null); 
    setEditingGame(null); 
  };

  const handleSelectGame = (id: string) => {
    const game = gameRecords.find(g => g.id === id);
    if (game) {
      setSelectedGame(game);
      setViewMode('viewer');
    }
  };

  const handleDeleteGame = (id: string) => {
    if (window.confirm('Are you sure you want to delete this game record?')) {
      const updatedGames = gameRecords.filter(g => g.id !== id);
      setGameRecords(updatedGames);
      saveGamesToLocalStorage(updatedGames);
      if (selectedGame?.id === id) {
        setSelectedGame(null);
        setViewMode('list');
        setActiveTab('home');
      }
      if (editingGame?.id === id) { 
        setEditingGame(null);
        setViewMode('list');
        setActiveTab('home');
      }
    }
  };
  
  const handleEditGame = (game: SgfGameRecord) => {
    const defaults = INITIAL_SGF_GAME_RECORD(game.id);
    const gameToEdit = {
        ...defaults, 
        ...game, 
        gameTree: Array.isArray(game.gameTree) ? game.gameTree : defaults.gameTree,
        metadata: { ...defaults.metadata, ...(game.metadata || {}) },
        komi: typeof game.komi === 'number' ? game.komi : defaults.komi,
        isJosekiRecord: typeof game.isJosekiRecord === 'boolean' ? game.isJosekiRecord : defaults.isJosekiRecord,
    };
    setEditingGame(gameToEdit);
    setViewMode('editor');
  };

  const handleCancelEdit = () => {
    setEditingGame(null);
    if (selectedGame && viewMode === 'editor') { 
      setViewMode('viewer'); 
    } else {
      setViewMode('list');
      setActiveTab('home');
    }
  };

  const handleCloseViewer = () => {
    setSelectedGame(null);
    setViewMode('list');
    setActiveTab('home');
  };

  const handleTabClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setViewMode('list'); 
    if (tab === 'games') {
      console.log("Games tab clicked - showing all games.");
    } else if (tab === 'profile') {
      console.log("Profile tab clicked - placeholder.");
    }
  };


  const FilterChip: React.FC<{label: string, isActive?: boolean}> = ({ label, isActive }) => (
    <button 
      className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap
                  ${isActive 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  } transition-colors`}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );

  if (viewMode === 'list') {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <main className="flex-grow overflow-y-auto pb-20 hide-scrollbar"> 
          <div className="p-4 sm:p-6 space-y-5">
            <h1 className="text-3xl font-bold text-slate-800">Go Notebook</h1>
            
            <div className="flex space-x-2 overflow-x-auto pb-2 hide-scrollbar">
              <FilterChip label="Recent games" isActive={true} />
              <FilterChip label="My games" />
              <FilterChip label="Study materials" />
              <FilterChip label="Search" />
              <FilterChip label="Settings" />
            </div>

            <button
              onClick={handleAddNewGame}
              className="flex items-center justify-between w-full p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Add New Game Record: 9x9, 13x13, 19x19"
            >
              <div className="flex items-center">
                <div className="bg-slate-100 p-3 rounded-lg mr-4">
                  <PlusIcon className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 text-left">Game Record</p>
                  <p className="text-xs text-slate-500 text-left">9x9, 13x13, 19x19</p>
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            </button>

            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-3">Recent Games</h2>
              <GameList 
                games={gameRecords} 
                onSelectGame={handleSelectGame}
                onDeleteGame={() => {}} 
                onEditGame={() => {}}
                displayHorizontal={true}
              />
            </div>
          </div>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-top_sm z-10">
          <div className="max-w-md mx-auto flex justify-around items-center h-16">
            {[
              { id: 'home', label: 'Home', icon: HomeIcon, view: 'list' },
              { id: 'games', label: 'Games', icon: GamesIcon, view: 'list' },
              { id: 'profile', label: 'Profile', icon: ProfileIcon, view: 'list' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id as ActiveTab)}
                className={`flex flex-col items-center justify-center p-2 rounded-md w-20 h-full transition-colors
                            ${activeTab === item.id ? 'text-blue-600' : 'text-slate-500 hover:text-blue-500'}`}
                aria-current={activeTab === item.id ? "page" : undefined}
              >
                <item.icon className={`w-6 h-6 mb-0.5 ${activeTab === item.id ? 'fill-current' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 sm:p-8">
      { (viewMode === 'editor' || viewMode === 'viewer') && (
         <header className="mb-6 sm:mb-8 text-center">
             <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 cursor-pointer" onClick={() => { setViewMode('list'); setActiveTab('home'); setSelectedGame(null); setEditingGame(null); }}>Hans Go Review</h1>
         </header>
      )}
      <main className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-4 sm:p-6">
        {viewMode === 'editor' && editingGame && (
          <GameEditor
            initialGame={editingGame}
            onSave={handleSaveGame}
            onCancel={handleCancelEdit}
          />
        )}

        {viewMode === 'viewer' && selectedGame && (
          <GameViewer
            game={selectedGame}
            onClose={handleCloseViewer}
            onEdit={handleEditGame}
            onDelete={handleDeleteGame}
          />
        )}
      </main>
      { (viewMode === 'editor' || viewMode === 'viewer') && (
        <footer className="text-center mt-10 sm:mt-12 text-xs sm:text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Hans Go. Happy studying!</p>
        </footer>
      )}
    </div>
  );
};

export default App;