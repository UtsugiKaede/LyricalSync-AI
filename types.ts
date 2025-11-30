export interface LyricLine {
  id: string;
  timestamp: number; // in seconds
  text: string;
  needsReview?: boolean; // If AI is unsure
}

export interface MetaData {
  title: string;
  artist: string;
  album: string;
  by: string;
}

export interface PlayerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackRate: number;
  volume: number;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}
