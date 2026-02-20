
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FolderIcon, 
  ChevronLeft, 
  Plus, 
  Search, 
  MoreHorizontal, 
  SquarePen, 
  Trash2, 
  Sidebar as SidebarIcon,
  BookOpen,
  Star,
  User,
  LayoutGrid,
  Menu,
  ChevronRight,
  PenTool,
  Type as TypeIcon,
  Sparkles,
  Share,
  Eraser,
  Pencil,
  Highlighter
} from 'lucide-react';
import { Note, Folder, AppView, DrawingStroke, ToolType } from './types';
import DrawingCanvas, { DrawingCanvasRef } from './components/DrawingCanvas';
import { geminiService } from './geminiService';

// Fix: Change children prop to optional. This resolves the TypeScript error 'Property children is missing in type...' 
const ToolButton = ({ children, active, onClick }: { children?: React.ReactNode, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`p-2 transition-all duration-200 flex flex-col items-center ${active ? 'text-[#007aff]' : 'text-gray-500'}`}
  >
    {children}
    {active && <div className="w-1.5 h-1.5 bg-[#007aff] rounded-full mt-1" />}
  </button>
);

const INITIAL_FOLDERS: Folder[] = [
  { id: 'icloud', name: 'iCloud', icon: '☁️' },
  { id: 'notes', name: 'Notes', icon: '📝' },
  { id: 'scraps', name: 'Quick Notes', icon: '⚡' },
  { id: 'trash', name: 'Recently Deleted', icon: '🗑️' },
];

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    folderId: 'notes',
    title: 'Grocery List',
    content: 'Milk\nEggs\nBread\nCheese\nApples\nBananas',
    lastModified: Date.now() - 1000000,
    strokes: []
  },
  {
    id: '2',
    folderId: 'notes',
    title: 'App Ideas',
    content: '1. A fitness tracker for pets.\n2. A recipe app that uses AI to suggest meals based on fridge contents.\n3. An iOS Notes clone with drawing capabilities.',
    lastModified: Date.now() - 5000000,
    strokes: []
  }
];

export default function App() {
  const [view, setView] = useState<AppView>(AppView.FOLDERS);
  const [folders] = useState<Folder[]>(INITIAL_FOLDERS);
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('notes');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Canvas State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentSize, setCurrentSize] = useState(3);
  const canvasRef = useRef<DrawingCanvasRef>(null);

  // Derived state
  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId), [notes, activeNoteId]);
  const filteredNotes = useMemo(() => 
    notes.filter(n => n.folderId === selectedFolderId && (n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase()))),
    [notes, selectedFolderId, searchQuery]
  );

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Math.random().toString(36).substr(2, 9),
      folderId: selectedFolderId,
      title: 'New Note',
      content: '',
      lastModified: Date.now(),
      strokes: []
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setView(AppView.EDITOR);
  };

  const handleUpdateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, lastModified: Date.now() } : n));
  };

  const handleTranscribe = async () => {
    if (!canvasRef.current || !activeNote) return;
    const dataUrl = canvasRef.current.getDataURL();
    const text = await geminiService.transcribeHandwriting(dataUrl);
    handleUpdateNote(activeNote.id, { content: activeNote.content + "\n\n" + text });
    setIsDrawingMode(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setView(AppView.NOTES);
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Nav helpers
  const goBack = () => {
    if (view === AppView.EDITOR) setView(AppView.NOTES);
    else if (view === AppView.NOTES) setView(AppView.FOLDERS);
  };

  return (
    <div className={`flex h-screen w-full bg-[#f2f2f7] text-[#1c1c1e] overflow-hidden ${isDrawingMode ? 'select-none' : ''}`}>
      {/* SIDEBAR / FOLDER LIST (Desktop/Tablet) */}
      <aside className={`w-80 border-r border-[#d1d1d6] bg-[#f2f2f7] hidden md:flex flex-col transition-all duration-300`}>
        <div className="p-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold">Folders</h1>
          <button className="text-[#007aff]"><MoreHorizontal size={24} /></button>
        </div>
        
        <div className="px-3 flex-1 overflow-y-auto space-y-1">
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => { setSelectedFolderId(f.id); setView(AppView.NOTES); }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${selectedFolderId === f.id ? 'bg-white shadow-sm' : 'hover:bg-[#e5e5ea]'}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="font-medium">{f.name}</span>
              </div>
              <span className="text-gray-400 font-normal">
                {notes.filter(n => n.folderId === f.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#d1d1d6] flex justify-between">
          <button className="flex items-center gap-1 text-[#007aff] font-medium"><FolderIcon size={20}/> New Folder</button>
          <button onClick={handleCreateNote} className="text-[#007aff]"><SquarePen size={24} /></button>
        </div>
      </aside>

      {/* NOTES LIST */}
      <main className={`flex-1 flex flex-col bg-white md:bg-[#f2f2f7] transition-all duration-300 ${view === AppView.FOLDERS ? 'translate-x-full md:translate-x-0' : view === AppView.EDITOR ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}`}>
        <div className="p-4 md:px-6 md:pt-10 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <button onClick={goBack} className="md:hidden text-[#007aff] flex items-center"><ChevronLeft size={24}/> Folders</button>
            <h1 className="text-3xl font-bold hidden md:block">Notes</h1>
            <div className="flex gap-4">
               <button className="text-[#007aff] md:hidden"><MoreHorizontal size={24}/></button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#e3e3e8] rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-[#007aff]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-2 space-y-0.5">
          {filteredNotes.map(note => (
            <button
              key={note.id}
              onClick={() => { setActiveNoteId(note.id); setView(AppView.EDITOR); }}
              className={`w-full text-left p-4 rounded-xl transition-all border-b border-[#d1d1d6] last:border-0 ${activeNoteId === note.id ? 'bg-[#007aff] text-white' : 'bg-white md:bg-white hover:bg-gray-100'}`}
            >
              <div className="font-bold truncate text-lg">{note.title || 'Untitled'}</div>
              <div className="flex gap-2 items-center text-sm opacity-80 mt-1">
                <span>{formatTime(note.lastModified)}</span>
                <span className="truncate">{note.content.substring(0, 40) || 'No additional text'}</span>
              </div>
            </button>
          ))}
          {filteredNotes.length === 0 && (
            <div className="text-center py-20 text-gray-500">No notes found</div>
          )}
        </div>
        
        <div className="p-4 border-t border-[#d1d1d6] md:hidden flex justify-between bg-white">
          <span className="text-sm text-gray-500">{filteredNotes.length} Notes</span>
          <button onClick={handleCreateNote} className="text-[#007aff]"><SquarePen size={24} /></button>
        </div>
      </main>

      {/* EDITOR */}
      <section 
        className={`fixed md:relative inset-0 flex flex-col bg-white transition-transform duration-300 z-50 md:z-auto md:w-[60%] lg:w-[65%] ${view === AppView.EDITOR ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} ${isDrawingMode ? 'touch-none' : ''}`}
        style={{
          userSelect: isDrawingMode ? 'none' : 'auto',
          WebkitUserSelect: isDrawingMode ? 'none' : 'auto',
        }}
      >
        {/* Editor Toolbar Top */}
        <header className="flex justify-between items-center p-4 border-b border-[#d1d1d6]">
          <button onClick={goBack} className="text-[#007aff] flex items-center"><ChevronLeft size={24}/> Notes</button>
          <div className="flex gap-6 text-[#007aff]">
            <button onClick={() => setIsDrawingMode(!isDrawingMode)} className={`transition-colors ${isDrawingMode ? 'bg-[#007aff] text-white p-1 rounded-full' : ''}`}>
              <PenTool size={22} />
            </button>
            <button className="relative group">
              <Sparkles size={22} onClick={handleTranscribe} />
              <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">AI Transcribe</span>
            </button>
            <button onClick={() => activeNote && handleDeleteNote(activeNote.id)}><Trash2 size={22} /></button>
            <button><Share size={22} /></button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 relative flex flex-col p-6 md:p-12 overflow-y-auto">
          {activeNote ? (
            <>
              <input 
                className={`text-3xl font-bold outline-none mb-4 w-full ${isDrawingMode ? 'pointer-events-none' : ''}`}
                placeholder="Title"
                value={activeNote.title}
                onChange={(e) => handleUpdateNote(activeNote.id, { title: e.target.value })}
              />
              <div className="text-sm text-gray-400 mb-6">{new Date(activeNote.lastModified).toLocaleString()}</div>
              
              <div className="relative flex-1">
                {/* Drawing Layer */}
                <DrawingCanvas
                  ref={canvasRef}
                  strokes={activeNote.strokes || []}
                  onStrokesChange={(strokes) => handleUpdateNote(activeNote.id, { strokes })}
                  tool={currentTool}
                  color={currentColor}
                  strokeWidth={currentSize}
                  isDrawingEnabled={isDrawingMode}
                />
                
                {/* Text Layer */}
                <textarea
                  className={`w-full h-full text-lg outline-none resize-none leading-relaxed transition-opacity ${isDrawingMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}
                  placeholder="Start typing..."
                  value={activeNote.content}
                  readOnly={isDrawingMode}
                  onChange={(e) => handleUpdateNote(activeNote.id, { content: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Select a note to view or create a new one.
            </div>
          )}
        </div>

        {/* Drawing Tools Floating Palette */}
        {isDrawingMode && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 ios-blur p-3 rounded-2xl shadow-2xl flex flex-col gap-2 items-center border border-[#d1d1d6] z-20 min-w-[280px]">
            <div className="flex gap-4 items-end w-full justify-center">
              <ToolButton active={currentTool === 'pen'} onClick={() => { setCurrentTool('pen'); setCurrentSize(3); }}>
                <PenTool className={`${currentTool === 'pen' ? 'mb-4 scale-125' : ''} transition-all`} />
              </ToolButton>
              <ToolButton active={currentTool === 'pencil'} onClick={() => { setCurrentTool('pencil'); setCurrentSize(2); }}>
                <Pencil className={`${currentTool === 'pencil' ? 'mb-4 scale-125' : ''} transition-all`} />
              </ToolButton>
              <ToolButton active={currentTool === 'highlighter'} onClick={() => { setCurrentTool('highlighter'); setCurrentSize(20); }}>
                <Highlighter className={`${currentTool === 'highlighter' ? 'mb-4 scale-125' : ''} transition-all`} />
              </ToolButton>
              <ToolButton active={currentTool === 'eraser'} onClick={() => { setCurrentTool('eraser'); setCurrentSize(30); }}>
                <Eraser className={`${currentTool === 'eraser' ? 'mb-4 scale-125' : ''} transition-all`} />
              </ToolButton>
              <div className="w-[1px] h-8 bg-gray-300 mx-1 self-center" />
              <input 
                type="color" 
                value={currentColor} 
                onChange={(e) => setCurrentColor(e.target.value)}
                className="w-8 h-8 rounded-full border-none p-0 bg-transparent cursor-pointer overflow-hidden self-center"
              />
              <button 
                onClick={() => canvasRef.current?.clear()}
                className="text-red-500 font-medium px-2 py-1 hover:bg-red-50 rounded-lg self-center text-sm"
              >
                Clear
              </button>
            </div>

            <div className="flex items-center gap-3 w-full px-4 py-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full" />
              <input 
                type="range" 
                min="1" 
                max={currentTool === 'highlighter' || currentTool === 'eraser' ? "60" : "20"} 
                step="1"
                value={currentSize}
                onChange={(e) => setCurrentSize(parseInt(e.target.value))}
                className="flex-1 accent-[#007aff] h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="w-3 h-3 bg-gray-400 rounded-full" />
              <span className="text-[10px] text-gray-500 font-medium w-4">{currentSize}</span>
            </div>
            
            <div className="text-[10px] text-gray-400 pb-1">Handwriting mode: Stylus only</div>
          </div>
        )}
      </section>
    </div>
  );
}
