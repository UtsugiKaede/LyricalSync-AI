
// Format seconds to [mm:ss.xx]
export const formatLrcTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);

  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  const msStr = ms.toString().padStart(2, '0');

  return `[${mStr}:${sStr}.${msStr}]`;
};

// Parse [mm:ss.xx] or mm:ss.xx to seconds
export const parseLrcTime = (timeStr: string): number => {
  const cleanStr = timeStr.replace(/[\[\]]/g, '');
  const parts = cleanStr.split(':');
  
  if (parts.length !== 2) return 0;
  
  const minutes = parseInt(parts[0], 10);
  const seconds = parseFloat(parts[1]);
  
  if (isNaN(minutes) || isNaN(seconds)) return 0;

  return minutes * 60 + seconds;
};

// Generate a random ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the Data-URI prefix (e.g., "data:audio/mp3;base64,")
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to convert file to base64"));
      }
    };
    reader.onerror = error => reject(error);
  });
};

// Fallback to determine MIME type from filename extension if browser fails
export const getMimeTypeFromFilename = (filename: string): string => {
  const parts = filename.split('.');
  if (parts.length === 1) return 'audio/mp3'; // Default fallback
  const ext = parts.pop()?.toLowerCase();
  
  const mimeMap: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'aac': 'audio/aac',
    'webm': 'audio/webm'
  };
  
  return mimeMap[ext || ''] || 'audio/mp3';
};
