import React, { useCallback } from 'react';
import { UploadCloud, Music, FileText, CheckCircle2 } from 'lucide-react';

interface FileUploaderProps {
  audioFile: File | null;
  textFile: File | null;
  onAudioUpload: (file: File) => void;
  onTextUpload: (file: File) => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  audioFile, 
  textFile, 
  onAudioUpload, 
  onTextUpload,
  isLoading
}) => {

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoading) return;

    const files: File[] = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      if (file.type.startsWith('audio/')) {
        onAudioUpload(file);
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.lrc')) {
        onTextUpload(file);
      }
    });
  }, [onAudioUpload, onTextUpload, isLoading]);

  const handleAudioInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) onAudioUpload(e.target.files[0]);
  };

  const handleTextInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) onTextUpload(e.target.files[0]);
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300
        ${isLoading ? 'opacity-50 cursor-not-allowed border-slate-600' : 'border-slate-600 hover:border-indigo-500 hover:bg-slate-900/50'}
      `}
    >
      <div className="mb-4 text-indigo-400">
        <UploadCloud size={48} />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-slate-200">
        ファイルをここにドロップ
      </h3>
      <p className="text-slate-400 text-sm mb-6 max-w-md">
        音楽ファイル (.mp3, .wav) と 歌詞ファイル (.txt) をアップロードしてください。
        両方が揃うと自動解析が始まります。
      </p>

      <div className="flex gap-4 w-full max-w-md">
        {/* Audio Input Button */}
        <label className={`
          flex-1 flex flex-col items-center p-4 rounded-lg border cursor-pointer transition
          ${audioFile ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}
        `}>
          <input type="file" accept="audio/*" className="hidden" onChange={handleAudioInput} disabled={isLoading} />
          {audioFile ? (
            <>
              <CheckCircle2 className="text-emerald-400 mb-2" size={24} />
              <span className="text-sm font-medium text-emerald-100 truncate w-full text-center">{audioFile.name}</span>
            </>
          ) : (
            <>
              <Music className="text-slate-400 mb-2" size={24} />
              <span className="text-sm font-medium text-slate-300">音楽を選択</span>
            </>
          )}
        </label>

        {/* Text Input Button */}
        <label className={`
          flex-1 flex flex-col items-center p-4 rounded-lg border cursor-pointer transition
          ${textFile ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-slate-800 border-slate-700 hover:bg-slate-750'}
        `}>
          <input type="file" accept=".txt,.lrc" className="hidden" onChange={handleTextInput} disabled={isLoading} />
          {textFile ? (
            <>
              <CheckCircle2 className="text-emerald-400 mb-2" size={24} />
              <span className="text-sm font-medium text-emerald-100 truncate w-full text-center">{textFile.name}</span>
            </>
          ) : (
            <>
              <FileText className="text-slate-400 mb-2" size={24} />
              <span className="text-sm font-medium text-slate-300">歌詞を選択</span>
            </>
          )}
        </label>
      </div>
    </div>
  );
};