
import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { DrawingStroke, ToolType } from '../types';

interface DrawingCanvasProps {
  strokes: DrawingStroke[];
  onStrokesChange: (strokes: DrawingStroke[]) => void;
  tool: ToolType;
  color: string;
  strokeWidth: number;
  isDrawingEnabled: boolean;
}

export interface DrawingCanvasRef {
  clear: () => void;
  getDataURL: () => string;
}

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({ 
  strokes, 
  onStrokesChange, 
  tool, 
  color, 
  strokeWidth,
  isDrawingEnabled 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<DrawingStroke | null>(null);

  // Sync canvas size with window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
        canvas.style.width = `${parent.clientWidth}px`;
        canvas.style.height = `${parent.clientHeight}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        redraw();
      }
    };

    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    [...strokes, currentStroke].forEach(stroke => {
      if (!stroke || stroke.points.length < 2) return;
      
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      
      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = stroke.width || 20;
      } else if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width || 30;
      } else if (stroke.tool === 'pencil') {
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = stroke.width || 2;
      } else {
        ctx.globalAlpha = 1.0;
        ctx.lineWidth = stroke.width || 3;
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        const point = stroke.points[i];
        if (stroke.tool === 'pen') {
          ctx.lineWidth = (stroke.width || 3) * (point.pressure || 1);
        }
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    });
  };

  useEffect(() => {
    redraw();
  }, [strokes, currentStroke]);

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure || 0.5
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawingEnabled) return;
    
    // IMPORTANT: Disable finger touch. Only allow stylus (pen) and mouse.
    // In many high-end devices, 'pen' is specifically for Apple Pencil/stylus.
    if (e.pointerType === 'touch') return;

    setIsDrawing(true);
    const { x, y, pressure } = getCoordinates(e);
    
    let width = strokeWidth;
    if (tool === 'highlighter' && strokeWidth < 10) width = 20;
    if (tool === 'eraser' && strokeWidth < 10) width = 30;

    setCurrentStroke({
      tool,
      color,
      width,
      points: [{ x, y, pressure }]
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStroke || !isDrawingEnabled) return;
    if (e.pointerType === 'touch') return;

    const { x, y, pressure } = getCoordinates(e);
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, { x, y, pressure }]
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (currentStroke && isDrawingEnabled) {
      onStrokesChange([...strokes, currentStroke]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  useImperativeHandle(ref, () => ({
    clear: () => {
      onStrokesChange([]);
    },
    getDataURL: () => {
      return canvasRef.current?.toDataURL() || '';
    }
  }));

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 z-10 w-full h-full ${isDrawingEnabled ? 'cursor-crosshair' : 'pointer-events-none'}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ 
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    />
  );
});

export default DrawingCanvas;
