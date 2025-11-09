"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Tone from "tone";
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

  // Global key handler for undo (Ctrl/Cmd+Z)
  useEffect(() => {
    const onKeyDown = (e) => {
      // Support Ctrl+Z on Windows/Linux and Cmd+Z on macOS
      if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === "z") {
        // Prevent browser's default undo
        e.preventDefault();
        if (p5Ref.current && typeof p5Ref.current.undo === "function") {
          p5Ref.current.undo();
        } else {
          // Optional: helpful debug if undo isn't available yet
          console.log('[keydown] undo requested but p5Ref.current.undo not available');
        }
      }else if ((e.ctrlKey || e.metaKey) && e.key && e.key.toLowerCase() === "y") {
        // Prevent browser's default undo
        e.preventDefault();
        if (p5Ref.current && typeof p5Ref.current.undo === "function") {
          p5Ref.current.redo();
        } else {
          // Optional: helpful debug if undo isn't available yet
          console.log('[keydown] undo requested but p5Ref.current.undo not available');
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  //define synths
  const synthsRef = useRef(null);
    
  // Initialize synths in useEffect to ensure client-side only
  useEffect(() => {
    if (!synthsRef.current) {
      synthsRef.current = {
        red: new Tone.MonoSynth().toDestination(),
        orange: new Tone.MonoSynth().toDestination(),
        yellow: new Tone.MonoSynth().toDestination(),
        green: new Tone.MonoSynth().toDestination(),
        cyan: new Tone.MonoSynth().toDestination(),
        blue: new Tone.MonoSynth().toDestination(),
        purple: new Tone.MonoSynth().toDestination(),
        magenta: new Tone.MonoSynth().toDestination(),

      };
    }
    
    // Cleanup function to dispose synths
    return () => {
      if (synthsRef.current) {
        Object.values(synthsRef.current).forEach(synth => synth.dispose());
      }
    };
  }, []);

  const colorToNote = {
    red: "B4",
    orange: "A4",
    yellow: "G4",
    green: "F#4",
    cyan: "F4",
    blue: "E4",
    purple: "D4",
    magenta: "C4",
  };

  function colorToSound(colorHex) {
    const { h } = hexToHSL(colorHex);
  
    // Define the colors and their central hue points
    const colorMap = [
      { name: "red", hue: 0 },
      { name: "orange", hue: 45 },
      { name: "yellow", hue: 75 },
      { name: "green", hue: 120 },
      { name: "cyan", hue: 180 },
      { name: "blue", hue: 210 },
      { name: "purple", hue: 270 },
      { name: "magenta", hue: 330 },
    ];
  
    // Find the color whose hue is closest to the actual hue
    let closest = colorMap[0];
    let minDiff = 360; // max hue difference
  
    colorMap.forEach((c) => {
      // calculate circular distance in hue (0-360)
      let diff = Math.abs(h - c.hue);
      if (diff > 180) diff = 360 - diff;
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    });
  
    return closest.name;
  }

  function hexToHSL(H) {
    // Convert hex -> HSL
    let r = 0, g = 0, b = 0;
    if (H.length === 4) {
      r = "0x" + H[1] + H[1];
      g = "0x" + H[2] + H[2];
      b = "0x" + H[3] + H[3];
    } else if (H.length === 7) {
      r = "0x" + H[1] + H[2];
      g = "0x" + H[3] + H[4];
      b = "0x" + H[5] + H[6];
    }
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;
    let h = 0;
    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    const l = (cmax + cmin) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    return { h, s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
  }

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

    //make sure tone is triggered
    async function playNote(color) {
      const soundColor = colorToSound(color);
      const note = colorToNote[soundColor];
      const synth = synthsRef.current?.[soundColor];
      if (!note || !synth) return;
    
      // Ensure Tone context is started
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("Audio context started");
      }
    
      synth.triggerAttackRelease(note, "8n");
    }

    p.mouseDragged = () => {
      if (drawing && p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
        const stroke = {
          x1: p.pmouseX,
          y1: p.pmouseY,
          x2: p.mouseX,
          y2: p.mouseY,
          color: color,
          size: size
        };
        strokesRef.current[strokesRef.current.length - 1].push(stroke);
    
        p.stroke(color);
        p.strokeWeight(size);
        p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
    
        playNote(color);
      }
    };
    
    p.mousePressed = async () => {
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("Audio context started");
      }
      if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
        undosRef.current = [];
        strokesRef.current.push([]);
        drawing = true;
      }
    };
    
    p.mouseReleased = async () => {
      drawing = false;
    };

    p.keyPressed = async () => {
      if (p.key === "s") {
        p.saveJSON();
      }
      else if (p.key === "u"){
        p.undo();
      }
      else if (p.key === "r"){
        p.redo();
      }
    };

    p.saveJSON = async () => {
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

    p.undo = () => {
      console.log(strokesRef.current);
      console.log(undosRef.current);
      if(strokesRef.current.length > 0 && strokesRef.current[strokesRef.current.length - 1].length === 0){
        strokesRef.current.pop();
      }
      let undo = strokesRef.current.pop();
      if (undo !== undefined) {
        undosRef.current.push(undo);
        // Redraw entire canvas
        p.background(255);
        p.redrawFromStrokes();
      } else {
        console.log('[p.undo] nothing to undo');
      }
      console.log(strokesRef.current);
      console.log(undosRef.current);
    }

    p.redo = () => {
      console.log(strokesRef.current);
      console.log(undosRef.current);
      let redo = undosRef.current.pop();
      console.log(redo);
      if (redo !== undefined) {
        // Add back the stroke group
        strokesRef.current.push(redo);
        // Draw the entire stroke group
        redo.forEach((stroke) => {
          p.stroke(stroke.color);
          p.strokeWeight(stroke.size);
          p.line(stroke.x1, stroke.y1, stroke.x2, stroke.y2);
        });
      } else {
        console.log('[p.redo] nothing to redo');
      }
      console.log(strokesRef.current);
      console.log(undosRef.current);
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
      p5Ref.current.undo();
    }
  }

  const handleRedo = () => {
    console.log('[handleRedo] called');
    if (p5Ref.current) {
      p5Ref.current.redo();
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
      <div className="flex flex-col justify-start px-6">
        <h1 className="text-4xl font-bold text-center my-10">SoundBrush</h1>
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
          <div className="flex flex-col items-center text-white w-full mb-1">
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
                borderRadius: "50%",
                background: "white",
                color: "black",
                padding: "5px",
                margin: "0px 10px",
                width: "50px",
                height: "50px"
              }}
              name="undo"
              onClick={handleUndo}
            >{"<"}</button>
            <button
            style={{
                borderRadius: "50%",
                background: "white",
                color: "black",
                padding: "5px",
                margin: "0px 10px",
                width: "50px",
                height: "50px"
              }}
              name="redo"
              onClick={handleRedo}
            >{">"}</button>
          </div>
          {/* Clear Button and Save Button*/}
          <div>
            <button
              style={{ borderRadius: "20%", padding: "5px 10px", margin: "0px 10px", background: "white", color: "black"}}
              onClick={() => {
                if (p5Ref.current) p5Ref.current.background(255);
                strokesRef.current = [];
                undosRef.current = [];
              }}
            >
              Clear
            </button>
            <button
              style={{ borderRadius: "20%", padding: "5px 10px", margin: "0px 10px", background: "white", color: "black"}}
              onClick={() => {
                if (p5Ref.current) p5Ref.current.saveJSON();
              }}
            >
              Save
            </button>
          </div>
          
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
