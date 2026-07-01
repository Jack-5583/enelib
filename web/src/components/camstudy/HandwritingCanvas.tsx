"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface HandwritingCanvasHandle {
  clear: () => void;
  getDataUrl: () => string | null;
}

export const HandwritingCanvas = forwardRef<HandwritingCanvasHandle, { penColor: string; initialDataUrl?: string | null }>(
  function HandwritingCanvas({ penColor, initialDataUrl }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const sizeRef = useRef({ w: 0, h: 0 });
    const penColorRef = useRef(penColor);
    penColorRef.current = penColor;

    useEffect(() => {
      const node = canvasRef.current;
      if (!node) return;

      const setup = () => {
        const rect = node.getBoundingClientRect();
        if (rect.width === 0) {
          setTimeout(setup, 30);
          return;
        }
        const dpr = window.devicePixelRatio || 1;
        node.width = Math.round(rect.width * dpr);
        node.height = Math.round(rect.height * dpr);
        const ctx = node.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctxRef.current = ctx;
        sizeRef.current = { w: rect.width, h: rect.height };
        if (initialDataUrl) {
          const img = new Image();
          img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
          img.src = initialDataUrl;
        }
      };
      setup();

      const rel = (e: PointerEvent) => {
        const r = node.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      };
      let drawing = false;
      let last = { x: 0, y: 0 };

      const onDown = (e: PointerEvent) => {
        e.preventDefault();
        if (!ctxRef.current) return;
        drawing = true;
        last = rel(e);
        try {
          node.setPointerCapture(e.pointerId);
        } catch {}
      };
      const onMove = (e: PointerEvent) => {
        if (!drawing || !ctxRef.current) return;
        const p = rel(e);
        const ctx = ctxRef.current;
        ctx.strokeStyle = penColorRef.current;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        last = p;
      };
      const onUp = () => {
        drawing = false;
      };

      node.addEventListener("pointerdown", onDown);
      node.addEventListener("pointermove", onMove);
      node.addEventListener("pointerup", onUp);
      node.addEventListener("pointercancel", onUp);
      return () => {
        node.removeEventListener("pointerdown", onDown);
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerup", onUp);
        node.removeEventListener("pointercancel", onUp);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useImperativeHandle(ref, () => ({
      clear: () => {
        const ctx = ctxRef.current;
        const { w, h } = sizeRef.current;
        if (ctx && w) ctx.clearRect(0, 0, w, h);
      },
      getDataUrl: () => canvasRef.current?.toDataURL("image/png") || null,
    }));

    return (
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
      />
    );
  }
);
