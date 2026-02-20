
export interface DrawingStroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
  tool: ToolType;
}

export type ToolType = 'pen' | 'pencil' | 'highlighter' | 'eraser';

export interface Note {
  id: string;
  title: string;
  content: string;
  lastModified: number;
  folderId: string;
  drawing?: string; // Base64 image of the drawing layer
  strokes?: DrawingStroke[];
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
}

export enum AppView {
  FOLDERS = 'folders',
  NOTES = 'notes',
  EDITOR = 'editor'
}
