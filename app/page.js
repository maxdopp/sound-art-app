"use client";

import P5Sketch from "@/components/P5Sketch";
import { useState } from "react";

export default function Home() {
  const [brushColor, setBrushColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(10);

  const mySketch = (p) => {
    let x = 0;

    p.setup = () => {
      p.createCanvas(window.innerWidth * (3/4), window.innerHeight);
      p.background(220);
    };

    p.draw = () => {
      p.fill(brushColor);
      p.circle(p.pmouseX, p.pmouseY, brushSize);
    };

    p.windowResized = () => {
        p.resizeCanvas(window.innerWidth * (3/4), window.innerHeight);
    };
  };

  const bar = (p) => {
    p.setup = () => {
      p.createCanvas(window.innerWidth * (1/4), window.innerHeight);
      p.background(0);
    }

    p.windowResized = () => {
        p.resizeCanvas(window.innerWidth * (1/4), window.innerHeight);
    };
  }

  return (
    <main className="flex flex-row items-center justify-center min-h-screen">
      <P5Sketch sketch={bar} />
      <P5Sketch sketch={mySketch} />
    </main>
  );
}