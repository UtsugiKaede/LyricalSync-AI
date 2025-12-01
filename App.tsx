
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileUploader } from './components/FileUploader';
import { Player } from './components/Player';
import { EditorRow } from './components/EditorRow';
import { LyricsChart } from './components/LyricsChart';
import { analyzeLyricsWithAudio } from './services/geminiService';
import { LyricLine, MetaData, AppStatus } from './types';
import { formatLrcTime, generateId, fileToBase64, getMimeTypeFromFilename } from './utils';
import { Download, RefreshCw, Wand2, ArrowLeft, Save, Clock, FilePlus, HelpCircle, Play, Info, Sparkles, MousePointerClick, FileJson } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [textFile, setTextFile] = useState<File | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  const [lines, setLines] = useState<LyricLine[]>([]);
  const [meta, setMeta] = useState<MetaData>({ title: '', artist: '', album: '', by: 'LyricalSync AI' });
  const [currentTime, setCurrentTime] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("準備中...");

  const playerRef = useRef<HTMLAudioElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Handle Space key for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== AppStatus.EDITING) return;
      
      // Prevent scrolling when pressing space
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        if (playerRef.current) {
          if (playerRef.current.paused) playerRef.current.play();
          else playerRef.current.pause();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  const handleAudioUpload = (file: File) => {
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioSrc(url);
    // Try to guess metadata from filename
    const name = file.name.replace(/\.[^/.]+$/, "");
    setMeta(prev => ({ ...prev, title: name }));
  };

  const handleTextUpload = (file: File) => {
    setTextFile(file);
  };

  const handleAutoProcess = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!audioFile || !textFile) return;

    // Check file size limit (approx 25MB to be safe for Base64 overhead inline data limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      alert("ファイルサイズが大きすぎます (上限: 約25MB)。\nGemini APIの制限により、大きなファイルは解析できません。\nMP3形式などに圧縮してから再度お試しください。");
      return;
    }

    // 1. Start Loading UI immediately to prevent "button not working" feel
    setStatus(AppStatus.PROCESSING);
    setLoadingMessage("ファイルを読み込み中...");

    // 2. Defer heavy processing to next tick so React can render the loading screen first
    setTimeout(async () => {
      try {
        // Step 1: Encode Audio
        setLoadingMessage("音声ファイルをエンコード中...");
        // This is the heavy blocking part
        const audioB64 = await fileToBase64(audioFile);
        
        // Step 2: Read Text
        setLoadingMessage("歌詞テキストを解析中...");
        const textContent = await textFile.text();
        
        // Step 3: Check Mime Type
        let mimeType = audioFile.type;
        if (!mimeType) {
          mimeType = getMimeTypeFromFilename(audioFile.name);
        }
        
        // Step 4: Call AI
        setLoadingMessage("AIによる同期解析を実行中...\nこれには数分かかる場合があります。");
        const generatedLines = await analyzeLyricsWithAudio(audioB64, mimeType, textContent);
        
        setLoadingMessage("エディタを構築中...");
        setLines(generatedLines);
        setStatus(AppStatus.EDITING);
        
      } catch (error: any) {
        console.error("Processing failed", error);
        const msg = error.message || "Unknown error";
        
        // Short delay before alert to let UI update if needed
        setTimeout(() => {
          alert(`AI解析エラー: ${msg}\n\n手動編集モードに切り替えます。`);
          
          // Fallback manual mode
          textFile.text().then(text => {
             const rawLines = text.split('\n')
            .filter(l => l.trim() !== '')
            .map(l => ({ id: generateId(), timestamp: 0, text: l.trim(), needsReview: true }));
            setLines(rawLines);
            setStatus(AppStatus.EDITING);
          }).catch(() => {
             setStatus(AppStatus.IDLE);
          });
        }, 100);
      }
    }, 100);
  };

  const handleUpdateLine = (id: string, updates: Partial<LyricLine>) => {
    setLines(prev => prev.map(line => line.id === id ? { ...line, ...updates } : line));
  };

  const handleDeleteLine = (id: string) => {
    if (confirm('この行を削除しますか？')) {
      setLines(prev => prev.filter(line => line.id !== id));
    }
  };

  const handleInsertAfter = (index: number) => {
    const prevLine = lines[index];
    // Default time is prev line time + 2s or current time if playing?
    // Let's use currentTime if it's after prevLine, else prevLine + 2
    let newTime = prevLine.timestamp + 2;
    if (currentTime > prevLine.timestamp) {
        newTime = currentTime;
    }

    const newLine: LyricLine = {
      id: generateId(),
      timestamp: newTime,
      text: ''
    };
    
    const newLines = [...lines];
    newLines.splice(index + 1, 0, newLine);
    setLines(newLines);
  };

  const handleSync = (id: string) => {
    if (!playerRef.current) return;
    const time = playerRef.current.currentTime;
    handleUpdateLine(id, { timestamp: time, needsReview: false });
  };

  const handleSeek = (time: number) => {
    if (playerRef.current) {
      playerRef.current.currentTime = time;
    }
  };

  const generateLrcOutput = () => {
    const metaHeader = `[ti:${meta.title}]\n[ar:${meta.artist}]\n[al:${meta.album}]\n[by:${meta.by}]\n`;
    
    // Sort lines by time before export
    const sortedLines = [...lines].sort((a, b) => a.timestamp - b.timestamp);
    
    const body = sortedLines.map(line => {
      return `${formatLrcTime(line.timestamp)}${line.text}`;
    }).join('\n');

    return metaHeader + body;
  };

  const handleDownload = () => {
    const content = generateLrcOutput();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meta.title || 'song'}.lrc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetApp = () => {
    if (confirm('全ての作業内容が失われます。よろしいですか？')) {
      setStatus(AppStatus.IDLE);
      setAudioFile(null);
      setTextFile(null);
      setLines([]);
      setAudioSrc(null);
      setMeta({ title: '', artist: '', album: '', by: 'LyricalSync AI' });
    }
  };

  // Find active line index for highlighting
  const activeLineIndex = useMemo(() => {
    // Find the last line that has started
    let index = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].timestamp) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [currentTime, lines]);

  // Auto scroll to active line
  useEffect(() => {
    if (status === AppStatus.EDITING && activeLineIndex !== -1 && scrollContainerRef.current) {
        // Optional: Smooth scroll implementation
        // const element = scrollContainerRef.current.children[activeLineIndex] as HTMLElement;
        // if(element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeLineIndex, status]);

  if (status === AppStatus.IDLE || status === AppStatus.PROCESSING) {
    return (
      <div className="h-screen w-full bg-slate-950 overflow-y-auto relative flex flex-col items-center py-12 px-6">
        <div className="fixed inset-0 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute top-10 left-10 w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="w-full max-w-5xl flex flex-col items-center z-10">
          <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400 mb-2 mt-4 md:mt-10 text-center">
            LyricalSync AI
          </h1>
          <p className="text-slate-400 mb-10 text-center max-w-lg">
            AIがリズムを解析し、歌詞ファイルを瞬時に同期。<br/>
            プロフェッショナルな字幕作成を、驚くほど簡単に。
          </p>

          <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-slate-800 transition-all duration-300">
            {status === AppStatus.PROCESSING ? (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 size={28} className="text-indigo-400 animate-pulse" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold mt-8 text-slate-200">{loadingMessage}</h2>
                <p className="text-slate-400 mt-3 text-sm animate-pulse">ブラウザを閉じずにそのままお待ちください</p>
              </div>
            ) : (
              <>
                <FileUploader 
                  audioFile={audioFile}
                  textFile={textFile}
                  onAudioUpload={handleAudioUpload}
                  onTextUpload={handleTextUpload}
                  isLoading={status === AppStatus.PROCESSING}
                />
                
                <button
                  type="button"
                  onClick={handleAutoProcess}
                  disabled={!audioFile || !textFile}
                  className={`
                    mt-6 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 select-none
                    ${audioFile && textFile 
                      ? 'bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-400 hover:to-emerald-400 text-white shadow-indigo-500/25 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
                  `}
                >
                  <Wand2 size={20} className={audioFile && textFile ? 'animate-pulse' : ''} />
                  <span>AI同期を開始</span>
                </button>
              </>
            )}
          </div>
          
          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-16 mb-12 px-4">
            {/* Card 1 */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-sm flex flex-col items-center text-center group hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all duration-300 shadow-lg">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 text-indigo-400 group-hover:scale-110 transition-transform">
                 <Sparkles size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">AI自動同期</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Gemini 2.5を使用して<br/>テキストと音声を自動調整
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-sm flex flex-col items-center text-center group hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all duration-300 shadow-lg">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 text-emerald-400 group-hover:scale-110 transition-transform">
                 <MousePointerClick size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">ビジュアルエディタ</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ミリ秒単位で<br/>タイムスタンプを微調整
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-sm flex flex-col items-center text-center group hover:bg-slate-800/60 hover:border-indigo-500/30 transition-all duration-300 shadow-lg">
               <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform">
                 <FileJson size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">標準エクスポート</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                主要な音楽プレイヤーと<br/>互換性あり
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 font-mono">
            Powered by Gemini 2.5 Flash
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden text-slate-200">
      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-40 relative">
        <div className="flex items-center space-x-4">
          <button 
            onClick={resetApp} 
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition px-3 py-1.5 rounded-md hover:bg-slate-800 group"
            title="現在のプロジェクトを閉じて開始画面に戻る"
          >
            <FilePlus size={18} className="group-hover:text-indigo-400 transition-colors" />
            <span className="text-sm font-medium">新規プロジェクト</span>
          </button>
          
          <div className="h-4 w-px bg-slate-700 mx-2 hidden sm:block"></div>
          
          <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-emerald-400 hidden md:block">
            LyricalSync AI
          </span>
          
          <div className="h-4 w-px bg-slate-700 mx-2"></div>
          
          <input 
            value={meta.title}
            onChange={e => setMeta(prev => ({...prev, title: e.target.value}))}
            className="bg-transparent text-sm font-medium text-slate-200 placeholder-slate-600 focus:outline-none focus:placeholder-slate-500 w-32 sm:w-48 truncate border-b border-transparent focus:border-indigo-500"
            placeholder="タイトル"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleDownload}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition shadow-lg shadow-indigo-500/20"
          >
            <Download size={16} />
            <span className="hidden sm:inline">LRC保存</span>
          </button>
        </div>
      </header>

      {/* Player (Top Position) */}
      <Player 
        src={audioSrc} 
        onTimeUpdate={setCurrentTime} 
        playerRef={playerRef} 
      />

      {/* Main Content (Split View) */}
      <div className="flex-1 flex overflow-hidden relative z-0">
        
        {/* Left Column: Editor */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
          
          {/* List Header */}
          <div className="flex items-center px-4 py-3 bg-slate-900/30 border-b border-slate-800 text-xs text-slate-500 font-mono uppercase tracking-wider shrink-0 sticky top-0 z-10 backdrop-blur-sm">
            <div className="w-8 text-center">No.</div>
            <div className="w-16 mr-3">Play/Sync</div>
            <div className="w-24 mr-4 text-center">Time</div>
            <div className="flex-1">Lyrics</div>
          </div>

          {/* Scrollable List */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden pb-32 scroll-smooth">
            {lines.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-slate-500">
                 <p>歌詞行がありません</p>
               </div>
            ) : (
              lines.map((line, index) => (
                <EditorRow
                  key={line.id}
                  index={index}
                  line={line}
                  isActive={index === activeLineIndex}
                  onUpdate={handleUpdateLine}
                  onDelete={handleDeleteLine}
                  onSeek={handleSeek}
                  onSync={handleSync}
                  onInsertAfter={handleInsertAfter}
                />
              ))
            )}
            
            <div className="p-8 text-center">
              <button 
                onClick={() => setLines([...lines, { id: generateId(), timestamp: currentTime, text: '' }])}
                className="text-slate-500 hover:text-indigo-400 text-sm flex items-center justify-center w-full py-4 border border-dashed border-slate-800 rounded hover:border-indigo-500/50 transition"
              >
                + 末尾に行を追加
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Sidebar */}
        <div className="w-80 bg-slate-900 border-l border-slate-800 hidden lg:flex flex-col shrink-0 overflow-y-auto">
          
          {/* Usage Guide (New) */}
          <div className="p-4 border-b border-slate-800 bg-slate-800/30">
            <div className="flex items-center space-x-2 text-indigo-400 mb-3">
              <HelpCircle size={18} />
              <h3 className="font-semibold text-sm">使い方ガイド</h3>
            </div>
            <ul className="space-y-3 text-xs text-slate-400">
              <li className="flex items-start">
                <span className="bg-slate-700 text-slate-200 rounded px-1.5 mr-2 font-mono">Space</span>
                <span>音楽を再生/一時停止します。</span>
              </li>
              <li className="flex items-start">
                <Clock size={14} className="text-emerald-400 mr-2 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-emerald-400">現在位置同期ボタン</strong><br/>
                  再生中にクリックすると、その行の開始時間を「現在の再生位置」に設定します。
                </span>
              </li>
              <li className="flex items-start">
                <Play size={14} className="text-indigo-400 mr-2 shrink-0 mt-0.5" />
                <span>行の頭出し再生を行います。</span>
              </li>
              <li className="flex items-start">
                <div className="w-3.5 h-3.5 border border-slate-500 rounded flex items-center justify-center mr-2 mt-0.5 text-[10px] shrink-0">Txt</div>
                <span>テキストボックスで歌詞を直接編集できます。</span>
              </li>
            </ul>
          </div>

          {/* Metadata Form */}
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
              <Info size={14} className="mr-1"/> メタデータ
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">アーティスト</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 outline-none transition"
                  value={meta.artist}
                  onChange={e => setMeta(prev => ({...prev, artist: e.target.value}))}
                  placeholder="アーティスト名"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">アルバム</label>
                <input 
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-indigo-500 outline-none transition"
                  value={meta.album}
                  onChange={e => setMeta(prev => ({...prev, album: e.target.value}))}
                  placeholder="アルバム名"
                />
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="p-4 border-b border-slate-800">
             <LyricsChart 
              lines={lines} 
              duration={playerRef.current?.duration || 0} 
              currentTime={currentTime} 
            />
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col p-4 min-h-[200px]">
             <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LRC プレビュー</h3>
             </div>
             <div className="bg-slate-950 rounded border border-slate-800 p-3 text-[10px] leading-relaxed font-mono text-slate-400 overflow-auto flex-1 whitespace-pre shadow-inner">
               {generateLrcOutput()}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;
