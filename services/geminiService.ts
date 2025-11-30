import { GoogleGenAI, Type } from "@google/genai";
import { LyricLine } from "../types";
import { generateId, parseLrcTime } from "../utils";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeLyricsWithAudio = async (
  audioBase64: string,
  audioMimeType: string,
  rawLyrics: string
): Promise<LyricLine[]> => {
  try {
    const model = 'gemini-2.5-flash';

    const systemPrompt = `
      You are an expert audio lyrics synchronizer. 
      I will provide an audio file and a text of lyrics.
      Your task is to estimate the start timestamp for each line of the lyrics based on the audio.
      
      Return a JSON object with a 'lines' array. 
      Each item in 'lines' should have:
      - 'time': a string in "[mm:ss.xx]" format representing the start time.
      - 'text': the lyrics text line (preserve original text exactly).
      - 'confidence': a number between 0 and 1 indicating how sure you are.
      
      If the audio is instrumental or you cannot detect lyrics for a specific line, make a best guess based on typical song structure or previous lines.
      Do not skip lines from the provided text. Matches should be 1:1.
    `;

    const userPrompt = `Here are the lyrics to sync:\n\n${rawLyrics}`;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioMimeType,
              data: audioBase64
            }
          },
          {
            text: userPrompt
          }
        ]
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lines: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING },
                  text: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");

    const parsed = JSON.parse(jsonText);
    
    // Map to our internal structure
    return parsed.lines.map((line: any) => ({
      id: generateId(),
      timestamp: parseLrcTime(line.time),
      text: line.text,
      needsReview: line.confidence < 0.7
    }));

  } catch (error) {
    console.error("Gemini Sync Error:", error);
    // Fallback: Return raw lines with 0 timestamp
    return rawLyrics.split('\n')
      .filter(l => l.trim() !== '')
      .map(line => ({
        id: generateId(),
        timestamp: 0,
        text: line.trim(),
        needsReview: true
      }));
  }
};
