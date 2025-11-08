"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ColorWheel from "./components/ColorWheel";
import P5Sketch from "./components/P5Sketch";

export default function DrawPage() {
  // Brush state
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(10);

  const [drawings, setDrawings] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");

  const strokesRef = useRef([]);
  const undosRef = useRef([]);

  // Ref to store the p5 instance
  const p5Ref = useRef(null);

  useEffect(() => {
    async function fetchDrawings() {
      try {
        const res = await fetch("/api/drawing");
        if (!res.ok) throw new Error("Failed to load drawings");
        const data = await res.json();
        setDrawings(data);
      } catch (err) {
        console.error(err);
      }
  }
    fetchDrawings();
  }, []);

  // Drawing sketch
  const drawingSketch = useCallback((p) => {
    let color = brushColor;
    let size = brushSize;
    let drawing = false;

    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight);
      p.background(255);
    };

    // Force redraw from the authoritative strokesRef
    p.redrawFromStrokes = () => {
      p.background(255);
      strokesRef.current.forEach((strokeGroup) => {
        strokeGroup.forEach((stroke) => {
          p.stroke(stroke.color);
          p.strokeWeight(stroke.size);
          p.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
        });
      });
    };
    p.draw = () => {};

    p.mouseDragged = () => {
      if(drawing){
        const stroke = {
        x1: p.pmouseX,
        y1: p.pmouseY,
        x2: p.mouseX,
        y2: p.mouseY,
        color: color,
        size: size
      };
      // Ensure there's a current stroke group to push into
      if (strokesRef.current.length === 0) {
        strokesRef.current.push([]);
      }
      strokesRef.current[strokesRef.current.length - 1].push(stroke);

      p.stroke(color);
      p.strokeWeight(size);
      p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
      }
    };

    p.mousePressed = async () => {
      // Starting a new stroke group. Clear redo stack because new action invalidates redo history.
      undosRef.current = [];
      strokesRef.current.push([]);
      drawing = true;
    }

    p.mouseReleased = async () => {
      drawing = false;
    }

    p.keyPressed = async () => {
      if (p.key === "s") {
        const filename = `drawing-${Date.now()}.json`;
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ strokes: strokesRef.current, filename }),
        });
        if (res.ok) {
          alert("Drawing saved!");
          const updated = await fetch("/api/drawing");
          setDrawings(await updated.json());
        } else {
          alert("Error saving drawing.");
        }
      }
      else if (p.key === "u"){
        p.undo(strokesRef.current, undosRef.current);
      }
      else if (p.key === "r"){
        p.redo(strokesRef.current, undosRef.current);
      }
    };

    p.loadDrawing = async (filename) => {
      try {
        const res = await fetch(`/api/drawing/${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error("Failed to load drawing");

        const data = await res.json();

        const p = p5Ref.current;
        if (p) {
          p.background(255);
          data.strokes.forEach((s) => {
            s.forEach((l) => {
              p.stroke(l.color);
              p.strokeWeight(l.size);
              p.line(l.x1, l.y1, l.x2, l.y2);
            });
          });
        }

        strokesRef.current = data.strokes; // Keep editable
      } catch (err) {
        console.error(err);
        alert("Failed to load drawing.");
      }
    };

    p.windowResized = () => {
      p.resizeCanvas(window.innerWidth, window.innerHeight);
      p.background(255);
    };

    // Methods to update brush dynamically
    p.setBrush = (newColor, newSize) => {
      color = newColor;
      size = newSize;
    };

    p.undo = (strokes, undos) => {
      const before = strokes.length;
      const beforeUndos = undos.length;
      console.log('[p.undo] before:', before, 'undos:', beforeUndos);
      let undo = strokes.pop();
      if (undo !== undefined) {
        undos.push(undo);
        // Redraw entire canvas
        p.background(255);
        p.redrawFromStrokes();
      } else {
        console.log('[p.undo] nothing to undo');
      }
      console.log('[p.undo] after:', strokes.length, 'undos:', undos.length);
    }

    p.redo = (strokes, undos) => {
      console.log('[p.redo] before strokes:', strokes.length, 'undos:', undos.length);
      let redo = undos.pop();
      if (redo !== undefined) {
        // Add back the stroke group
        strokes.push(redo);
        // Draw the entire stroke group
        redo.forEach((stroke) => {
          p.stroke(stroke.color);
          p.strokeWeight(stroke.size);
          p.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
        });
      } else {
        console.log('[p.redo] nothing to redo');
      }
      console.log('[p.redo] after strokes:', strokes.length, 'undos:', undos.length);
    }

    p5Ref.current = p; // save instance
  }, []);

  // Toolbar handlers
  const handleColorChange = (color) => {
    setBrushColor(color);
    if (p5Ref.current) p5Ref.current.setBrush(color, brushSize);
  };

  const handleSizeChange = (size) => {
    setBrushSize(size);
    if (p5Ref.current) p5Ref.current.setBrush(brushColor, size);
  };

  const handleUndo = () => {
    console.log('[handleUndo] called');
    if (p5Ref.current) {
      p5Ref.current.undo(strokesRef.current, undosRef.current);
    }
  }

  const handleRedo = () => {
    console.log('[handleRedo] called');
    if (p5Ref.current) {
      p5Ref.current.redo(strokesRef.current, undosRef.current);
    }
  }

  async function handleLoad() {
    if(p5Ref.current && selectedFile){
      await p5Ref.current.loadDrawing(selectedFile);
    }
  }

  return (
    <div className="flex flex-row">
      {/* Toolbar */}
      <div className="flex flex-col">
        <ColorWheel onColorChange={handleColorChange} />
        <div
          style={{
            height: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            padding: 10,
            background: "#000",
          }}
        >

          {/* Brush size slider */}
          <div className="flex flex-col items-center text-white w-full mb-4">
            <label htmlFor="brushSizeSlider" className="mb-1">
              Brush Size: {brushSize}
            </label>
            <input
              id="brushSizeSlider"
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => handleSizeChange(Number(e.target.value))}
              style={{
                width: "80%",
                cursor: "pointer",
                accentColor: "#00ff99",
                // Remove default appearance for Chrome/Safari
                WebkitAppearance: "none",
                height: "12px",
                borderRadius: "6px",
                border: "2px solid #00ff99", // outline
                background: `linear-gradient(to right, #00ff99 0%, #00ff99 ${brushSize}%, #222 ${brushSize}%, #222 100%)`,
              }}
            />
          </div>

  {/*}
          <div className="flex flex-row items-center justify-evenly w-full">
          {[5, 10, 20, 40].map((s) => (
            <button
              key={s}
              style={{
                width: s + 10,
                height: s + 10,
                borderRadius: "50%",
                background: "#555",
                border: brushSize === s ? "3px solid #333" : "1px solid #999",
              }}
              onClick={() => handleSizeChange(s)}
            />
          ))}
          </div>
  */}
          {/* Undo/Redo */}
          <div className="w-full flex flex-row items-center justify-center">
            <button
              style={{
                borderRadius: "20%",
                background: "white",
                color: "black",
                padding: "5px"
              }}
              name="undo"
              onClick={() => {
                handleUndo()
              }}
            >Undo</button>
            <button
            style={{
                borderRadius: "20%",
                background: "white",
                color: "black",
                padding: "5px"
              }}
              name="redo"
              onClick={() => {
                handleRedo()
              }}
            >Redo</button>
          </div>
          {/* Clear Button */}
          <button
            style={{ padding: "5px 10px", marginLeft: 20, background: "white", color: "black"}}
            onClick={() => {
              if (p5Ref.current) p5Ref.current.background(255);
              strokesRef.current = [];
              undosRef.current = [];
            }}
          >
            Clear
          </button>
          {/* Dropdown to load saved drawings */}
          <select
            className="text-black bg-white p-1 mb-2"
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
          >
            <option value="">Select drawing...</option>
            {drawings.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <button
            className="bg-blue-500 rounded px-3 py-1 mb-2"
            onClick={handleLoad}
          >
            Load Drawing
          </button>
        </div>
        {/* <Link href="/gallery" className="mt-4 underline text-blue-600">
          View Gallery →
        </Link> */}
      </div>

      {/* Drawing Canvas */}
      <P5Sketch sketch={drawingSketch} />
    </div>
  );
}
