import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, FastForward, Rewind, Volume2, VolumeX, Gauge } from 'lucide-react';
import { PlayerState } from '../types';

interface PlayerProps {
  src: string | null;
  onTimeUpdate: (time: number) => void;
  playerRef: React.MutableRefObject<HTMLAudioElement | null>;
  initialState?: Partial<PlayerState>;
}

export const Player: React.FC<PlayerProps> = ({ src, onTimeUpdate, playerRef }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audio = playerRef.current;
    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
      onTimeUpdate(audio.currentTime);
    };

    const updateDuration = () => setDuration(audio.duration);
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', onEnd);
    };
  }, [onTimeUpdate, playerRef]);

  const togglePlay = () => {
    if (!playerRef.current || !src) return;
    if (isPlaying) {
      playerRef.current.pause();
    } else {
      playerRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    const time = parseFloat(e.target.value);
    playerRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleRateChange = (rate: number) => {
    if (!playerRef.current) return;
    playerRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    playerRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!playerRef.current) return;
    const val = parseFloat(e.target.value);
    playerRef.current.volume = val;
    setVolume(val);
    if (val > 0) setIsMuted(false);
  };

  const formatTimeSimple = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 p-3 shadow-md z-30 shrink-0">
      <audio ref={playerRef} src={src || undefined} />
      
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
        
        {/* Left Controls: Play & Rate */}
        <div className="flex items-center space-x-3 shrink-0">
          <button 
            onClick={togglePlay} 
            disabled={!src}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-500 hover:bg-indigo-400 text-white shadow transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="再生/一時停止 (Space)"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
          
          <div className="flex items-center space-x-1 bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
            <Gauge size={14} className="text-slate-500 mr-1" />
            {[0.5, 1.0, 1.5].map(rate => (
              <button
                key={rate}
                onClick={() => handleRateChange(rate)}
                className={`text-xs px-1.5 py-0.5 rounded ${playbackRate === rate ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Center: Seeker */}
        <div className="flex-1 flex items-center space-x-3 w-full">
          <span className="text-xs text-slate-400 font-mono w-10 text-right">{formatTimeSimple(currentTime)}</span>
          <div className="relative flex-1 h-8 flex items-center group">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
              disabled={!src}
            />
          </div>
          <span className="text-xs text-slate-400 font-mono w-10">{formatTimeSimple(duration)}</span>
        </div>

        {/* Right: Volume */}
        <div className="flex items-center space-x-2 shrink-0">
          <button onClick={toggleMute} className="text-slate-400 hover:text-white">
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
};