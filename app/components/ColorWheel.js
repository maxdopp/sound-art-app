"use client";
import { useEffect, useRef, useState } from "react";

export default function ColorWheel({ onColorChange }) {
  const canvasRef = useRef(null);
  const [selectedHue, setSelectedHue] = useState(0);
  const [lightness, setLightness] = useState(0.5);
  const [saturation, setSaturation] = useState(1);
  const [selectedColor, setSelectedColor] = useState("#000000");
  const [markerPos, setMarkerPos] = useState(null);

  const CSS_SIZE = 300;
  const INNER_RADIUS_CSS = 80;

  function getColorName(hue) {
    // Approximate color names based on hue in degrees (0-360)
    if (hue >= 0 && hue < 15) return "Red";
    if (hue >= 15 && hue < 45) return "Orange";
    if (hue >= 45 && hue < 75) return "Yellow";
    if (hue >= 75 && hue < 150) return "Green";
    if (hue >= 150 && hue < 195) return "Cyan";
    if (hue >= 195 && hue < 255) return "Blue";
    if (hue >= 255 && hue < 285) return "Purple";
    if (hue >= 285 && hue < 330) return "Magenta";
    return "Red"; // wrap-around
  }
  const [colorName, setColorName] = useState("Red");


  // Draw color wheel (rainbow ring)
  useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const backingSize = Math.floor(CSS_SIZE * dpr);
    canvas.width = backingSize;
    canvas.height = backingSize;
    canvas.style.width = `${CSS_SIZE}px`;
    canvas.style.height = `${CSS_SIZE}px`;

    const ctx = canvas.getContext("2d");
    const outerRadius = backingSize / 2;
    const innerRadius = INNER_RADIUS_CSS * dpr;
    const img = ctx.createImageData(backingSize, backingSize);
    const data = img.data;

    for (let j = 0; j < backingSize; j++) {
      for (let i = 0; i < backingSize; i++) {
        const dx = i - outerRadius;
        const dy = j - outerRadius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= outerRadius && dist >= innerRadius) {
          const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 180;
          const [r, g, b] = hslToRgb(angle / 360, 1, 0.5);
          const idx = (j * backingSize + i) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(img, 0, 0);
  }, []);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
  
    const dpr = window.devicePixelRatio || 1;
    const x = (cssX - CSS_SIZE / 2) * dpr;
    const y = (cssY - CSS_SIZE / 2) * dpr;
    const dist = Math.sqrt(x * x + y * y);
    const innerRadius = INNER_RADIUS_CSS * dpr;
    const outerRadius = (CSS_SIZE / 2) * dpr;
  
    if (dist < innerRadius || dist > outerRadius) return;
  
    const angle = Math.atan2(y, x) * (180 / Math.PI) + 180;
    setSelectedHue(angle);
  
    const [r, g, b] = hslToRgb(angle / 360, saturation, lightness);
    const hex = rgbToHex(r, g, b);
  
    setSelectedColor(hex);
    setColorName(getColorName(angle));
    onColorChange?.(hex);
  
    setMarkerPos({ x: cssX, y: cssY });
  };
  
  const handleLightnessChange = (e) => {
    const newL = parseFloat(e.target.value);
    setLightness(newL);
  
    const [r, g, b] = hslToRgb(selectedHue / 360, saturation, newL);
    const hex = rgbToHex(r, g, b);
  
    setSelectedColor(hex);
    setColorName(getColorName(selectedHue));
    onColorChange?.(hex);
  };

  const handleSaturationChange = (e) => {
    const newS = parseFloat(e.target.value);
    setSaturation(newS);

    const [r, g, b] = hslToRgb(selectedHue / 360, newS, lightness);
    const hex = rgbToHex(r, g, b);

    setSelectedColor(hex);
    setColorName(getColorName(selectedHue));
    onColorChange?.(hex);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: CSS_SIZE, height: CSS_SIZE }}>
        <canvas
          ref={canvasRef}
          onClick={handleClick}
          style={{ display: "block", borderRadius: "50%", cursor: "crosshair" }}
        />
        {markerPos && (
          <div
            style={{
              position: "absolute",
              left: markerPos.x,
              top: markerPos.y,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: "50%",
                border: "3px solid white",
                boxShadow: "0 0 0 1px rgba(0,0,0,0.3)",
                backgroundColor: selectedColor,
              }}
            />
          </div>
        )}
      </div>

      {/* Lightness Slider */}
      <div style={{ width: 260, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginTop: "20px" }}>
        <label>Lightness</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={lightness}
          onChange={handleLightnessChange}
          style={{
            width: "80%",
            cursor: "pointer",
            accentColor: selectedColor,
            // Remove default appearance for Chrome/Safari
            WebkitAppearance: "none",
            height: "12px",
            borderRadius: "6px",
            border: `2px solid ${selectedColor}`, // outline
            backgroundImage: "linear-gradient(to right, #000000, #ffffff)"
            }}
        />
      </div>

      {/* Saturation Slider */}
      <div style={{ width: 260, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: "20px"
      }}>
        <label>Saturation</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={saturation}
          onChange={handleSaturationChange}
          style={{
            width: "80%",
            cursor: "pointer",
            accentColor: selectedColor,
            WebkitAppearance: "none",
            height: "12px",
            borderRadius: "6px",
            border: `2px solid ${selectedColor}`,
            backgroundImage: `linear-gradient(to right, hsl(${selectedHue}, 0%, 50%), hsl(${selectedHue}, 100%, 50%))`
          }}
        />
      </div>

      {/* Color Preview */}
      <div
        style={{
          width: 120,
          height: 48,
          borderRadius: 8,
          border: "1px solid #ccc",
          backgroundColor: selectedColor,
        }}
      />
      <div style={{ fontFamily: "monospace" }}>{colorName} - {selectedColor}</div>
    </div>
  );
}

/* ---------- Helpers ---------- */
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) r = g = b = l;
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("");
}
