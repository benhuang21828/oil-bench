"use client";
import React, { useState, useRef, useLayoutEffect } from "react";

export default function InfoTooltip({ label, content }: { label: string, content: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: -9999, left: -9999 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!show || !tooltipRef.current) return;
    
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    
    let top = e.clientY + 15;
    let left = e.clientX + 15;

    // Ensure tooltip doesn't get cut off vertically by viewport
    if (top + tooltipRect.height > window.innerHeight - 10) {
      // Pop it UP instead of DOWN
      top = e.clientY - tooltipRect.height - 15;
    }
    
    // Ensure tooltip doesn't get cut off horizontally by viewport
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    // Prevent left edge clipping
    if (left < 10) {
      left = 10;
    }

    setCoords({ top, left });
  };

  return (
    <div 
      className="inline-flex items-center gap-1 cursor-help border-b border-dashed border-slate-500 pb-[1px]"
      onMouseEnter={(e) => {
        setShow(true);
        // Initial coords
        setCoords({ top: e.clientY + 15, left: e.clientX + 15 });
      }}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMouseMove}
      ref={triggerRef}
    >
      {label} <span className="text-slate-500 text-[10px] bg-slate-800 rounded-full px-1">(?)</span>
      
      {show && (
        <div
          ref={tooltipRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          className="z-[9999] w-56 p-2 bg-slate-800 text-slate-300 text-xs rounded shadow-2xl border border-white/10 normal-case font-normal whitespace-normal pointer-events-none"
        >
          {content}
        </div>
      )}
    </div>
  );
}
