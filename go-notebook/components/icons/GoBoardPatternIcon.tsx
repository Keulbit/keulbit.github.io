
import React from 'react';

export const GoBoardPatternIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <rect width="100" height="100" fill="#E2C4A0" /> 
    {Array.from({ length: 9 }).map((_, i) => {
      const pos = 5 + i * 11.25; // Adjusted for 9 lines (0-8)
      return (
        <React.Fragment key={i}>
          <line x1={pos} y1="5" x2={pos} y2="95" stroke="#BA9A72" strokeWidth="0.8" />
          <line x1="5" y1={pos} x2="95" y2={pos} stroke="#BA9A72" strokeWidth="0.8" />
        </React.Fragment>
      );
    })}
    {/* Simplified star points */}
    {[
      { cx: 5 + 2 * 11.25, cy: 5 + 2 * 11.25 }, { cx: 5 + 6 * 11.25, cy: 5 + 2 * 11.25 },
      { cx: 5 + 2 * 11.25, cy: 5 + 6 * 11.25 }, { cx: 5 + 6 * 11.25, cy: 5 + 6 * 11.25 },
      { cx: 5 + 4 * 11.25, cy: 5 + 4 * 11.25}, // Center
    ].map((star, i) => (
       <circle key={`star-${i}`} cx={star.cx} cy={star.cy} r="1.5" fill="#BA9A72" />
    ))}
  </svg>
);
