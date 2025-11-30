import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { LyricLine } from '../types';

interface LyricsChartProps {
  lines: LyricLine[];
  duration: number;
  currentTime: number;
}

export const LyricsChart: React.FC<LyricsChartProps> = ({ lines, duration, currentTime }) => {
  // Process data to show "density" of lyrics over time
  // We'll create buckets of 5 seconds
  if (!lines.length || !duration) return null;

  const bucketSize = 5; // seconds
  const buckets = Math.ceil(duration / bucketSize);
  const data = Array.from({ length: buckets }, (_, i) => ({
    time: i * bucketSize,
    count: 0
  }));

  lines.forEach(line => {
    const bucketIndex = Math.floor(line.timestamp / bucketSize);
    if (data[bucketIndex]) {
      data[bucketIndex].count += line.text.length; // Weight by character count
    }
  });

  return (
    <div className="h-32 w-full mt-4 bg-slate-900/50 rounded-lg p-2 border border-slate-800">
      <div className="text-xs text-slate-500 mb-2 font-mono ml-2">歌詞密度ヒートマップ</div>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="time" 
            hide 
          />
          <YAxis hide />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '4px', fontSize: '12px' }}
            itemStyle={{ color: '#cbd5e1' }}
            labelFormatter={(label) => `Time: ${label}s`}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#6366f1" 
            fillOpacity={1} 
            fill="url(#colorCount)" 
          />
          {/* Current Time Indicator line */}
          {/* This is a bit tricky in pure Recharts SVG without custom layers, but we can overlay a div outside */}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
