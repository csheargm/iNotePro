
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
  const pointsRef = useRef<{ x: number; y: number; pressure: number }[]>([]);

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

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: DrawingStroke) => {
    if (!stroke || stroke.points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
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
  };

  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use the actual canvas width/height for clearing
    ctx.clearRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);
    
    strokes.forEach(stroke => drawStroke(ctx, stroke));

    // Also draw the current stroke if we're in the middle of drawing
    if (isDrawing && pointsRef.current.length > 1) {
      let width = strokeWidth;
      if (tool === 'highlighter' && strokeWidth < 10) width = 20;
      if (tool === 'eraser' && strokeWidth < 10) width = 30;

      drawStroke(ctx, {
        tool,
        color,
        width,
        points: pointsRef.current
      });
    }
  };

  useEffect(() => {
    redraw();
  }, [strokes]);

  const getCoordinates = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, pressure: 0.5 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: (e as any).pressure !== undefined ? (e as any).pressure : 0.5
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isDrawingEnabled) return;
    if (e.pointerType === 'touch') return;

    setIsDrawing(true);
    const coords = getCoordinates(e);
    pointsRef.current = [coords];
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !isDrawingEnabled) return;
    if (e.pointerType === 'touch') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use coalesced events to capture all points for high-frequency input (Apple Pencil)
    const events = (e.nativeEvent as any).getCoalescedEvents?.() || [e];
    
    for (const ev of events) {
      const point = getCoordinates(ev);
      const lastPoint = pointsRef.current[pointsRef.current.length - 1];
      
      pointsRef.current.push(point);

      if (lastPoint) {
        // Draw segment immediately for instant feedback
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        let width = strokeWidth;
        if (tool === 'highlighter') {
          ctx.globalAlpha = 0.3;
          width = 20;
        } else if (tool === 'eraser') {
          ctx.globalCompositeOperation = 'destination-out';
          width = 30;
        } else if (tool === 'pencil') {
          ctx.globalAlpha = 0.8;
          width = 2;
        } else {
          ctx.globalAlpha = 1.0;
          width = strokeWidth * (point.pressure || 1);
        }

        ctx.lineWidth = width;
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        
        // Reset state
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    if (isDrawing && isDrawingEnabled && pointsRef.current.length > 1) {
      let width = strokeWidth;
      if (tool === 'highlighter' && strokeWidth < 10) width = 20;
      if (tool === 'eraser' && strokeWidth < 10) width = 30;

      const newStroke: DrawingStroke = {
        tool,
        color,
        width,
        points: [...pointsRef.current]
      };
      onStrokesChange([...strokes, newStroke]);
    }
    setIsDrawing(false);
    pointsRef.current = [];
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
