import React from 'react';
import { Play, Trash2, Clock, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { LyricLine } from '../types';
import { formatLrcTime } from '../utils';

interface EditorRowProps {
  line: LyricLine;
  index: number;
  isActive: boolean;
  onUpdate: (id: string, updates: Partial<LyricLine>) => void;
  onDelete: (id: string) => void;
  onSeek: (time: number) => void;
  onSync: (id: string) => void;
  onInsertAfter: (index: number) => void;
}

export const EditorRow: React.FC<EditorRowProps> = ({ 
  line, 
  index,
  isActive, 
  onUpdate, 
  onDelete, 
  onSeek,
  onSync,
  onInsertAfter
}) => {
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // We allow user to type freely, but validation happens elsewhere or implicitly
    // Here we just store the text if we want to allow free editing, 
    // but parsing back to float happens only if valid.
    // To simplify: we only update if it matches format or we parse it
    // For this prototype, we'll keep the internal timestamp as the source of truth
    // and this input as a way to adjust it.
  };

  const adjustTime = (delta: number) => {
    onUpdate(line.id, { timestamp: Math.max(0, line.timestamp + delta) });
  };

  return (
    <div 
      className={`group flex items-center py-2 px-3 border-b border-slate-800 transition-colors ${
        isActive ? 'bg-indigo-900/30 border-indigo-500/50' : 'hover:bg-slate-900'
      }`}
    >
      {/* Index */}
      <div className="w-8 text-xs text-slate-500 font-mono select-none">
        {(index + 1).toString().padStart(2, '0')}
      </div>

      {/* Controls */}
      <div className="flex items-center space-x-1 mr-3">
        <button 
          onClick={() => onSeek(line.timestamp)}
          className="p-1.5 rounded-full text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
          title="この行から再生"
        >
          <Play size={14} fill="currentColor" />
        </button>
        <button 
          onClick={() => onSync(line.id)}
          className="p-1.5 rounded-full text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
          title="現在の再生位置をこの行に設定 (Space)"
        >
          <Clock size={14} />
        </button>
      </div>

      {/* Timestamp Editor */}
      <div className="flex items-center space-x-1 mr-4 bg-slate-900 rounded border border-slate-700 p-1">
        <button onClick={() => adjustTime(-0.1)} className="text-slate-500 hover:text-white p-0.5">
          <ArrowDown size={12} />
        </button>
        <input 
          type="text" 
          value={formatLrcTime(line.timestamp)}
          readOnly
          className="w-24 bg-transparent text-center font-mono text-sm text-indigo-300 focus:outline-none cursor-default"
        />
        <button onClick={() => adjustTime(0.1)} className="text-slate-500 hover:text-white p-0.5">
          <ArrowUp size={12} />
        </button>
      </div>

      {/* Text Input */}
      <div className="flex-1 mr-4 relative">
        <input
          type="text"
          value={line.text}
          onChange={(e) => onUpdate(line.id, { text: e.target.value })}
          className="w-full bg-transparent text-slate-200 focus:outline-none focus:border-b focus:border-indigo-500 py-1 transition-colors"
          placeholder="歌詞を入力..."
        />
        {line.needsReview && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-amber-500" title="AIはこの行に確信が持てません">
            <AlertCircle size={16} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity space-x-2">
         <button 
          onClick={() => onInsertAfter(index)}
          className="text-slate-500 hover:text-blue-400 text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700"
        >
          + 行追加
        </button>
        <button 
          onClick={() => onDelete(line.id)}
          className="text-slate-600 hover:text-red-400 p-1.5"
          title="行を削除"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};
