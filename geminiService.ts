
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  /**
   * Analyzes the handwriting/drawing and converts it to structured text.
   */
  async transcribeHandwriting(base64Image: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: {
          parts: [
            { text: "Transcribe the handwriting in this image into clear text. If there are drawings, describe them briefly in brackets like [sketch: description]. Only return the text content." },
            { inlineData: { mimeType: 'image/png', data: base64Image.split(',')[1] } }
          ]
        }
      });
      // Fix: Property .text directly returns the extracted string output.
      return response.text || "Could not transcribe handwriting.";
    } catch (error) {
      console.error("Transcription error:", error);
      return "Transcription failed. Please check your connection.";
    }
  },

  /**
   * Summarizes a note's text content.
   */
  async summarizeNote(content: string): Promise<string> {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Summarize the following note content into a concise title and 3-4 bullet points:\n\n${content}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summaryTitle: { 
                type: Type.STRING,
                description: 'A summary title for the note.'
              },
              bullets: { 
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Brief summary bullet points.'
              }
            },
            required: ["summaryTitle", "bullets"],
            propertyOrdering: ["summaryTitle", "bullets"]
          }
        }
      });
      // Fix: Direct property access .text
      return response.text || JSON.stringify({ summaryTitle: "Untitled", bullets: [] });
    } catch (error) {
      console.error("Summarization error:", error);
      return JSON.stringify({ summaryTitle: "Error", bullets: ["Failed to generate summary"] });
    }
  }
};
