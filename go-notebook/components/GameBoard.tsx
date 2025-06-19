
import React from 'react';
import { BoardState, StoneColor, SgfCoord } from '../types';
import { STAR_POINTS as NINETEEN_STAR_POINTS } from '../constants'; // Renamed to avoid confusion
import { toSgfCoord as convertToSgfCoord } from '../utils/sgfUtils';

export interface ThumbnailOptions {
  paddingRatio?: number;
  starPointRatio?: number;
  stoneRadiusRatio?: number;
  lineStrokeWidth?: number;
  omitStarPoints?: boolean;
}

interface GameBoardProps extends React.SVGProps<SVGSVGElement> {
  boardState: BoardState;
  onPointClick?: (row: number, col: number) => void;
  interactive?: boolean;
  highlightedPoint?: { row: number; col: number } | null;
  onMouseEnterPoint?: (row: number, col: number) => void;
  onMouseLeaveBoard?: () => void; // Typically onMouseLeave of the SVG itself
  currentPlayer?: StoneColor | null;
  moveNumbersMap?: { [coord: string]: number };
  displayJosekiCornerSize?: number; 
  thumbnailOptions?: ThumbnailOptions;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  boardState,
  onPointClick,
  interactive = false,
  highlightedPoint,
  onMouseEnterPoint,
  onMouseLeaveBoard,
  currentPlayer,
  moveNumbersMap,
  displayJosekiCornerSize,
  thumbnailOptions,
  className,
  ...svgProps
}) => {
  const numRows = boardState.length;
  const numCols = boardState[0]?.length || 0;

  const renderRows = displayJosekiCornerSize || numRows;
  const renderCols = displayJosekiCornerSize || numCols;

  if (renderRows === 0 || renderCols === 0) {
    return <svg className={className || "w-full h-full"} viewBox="0 0 100 100" {...svgProps}><text x="50" y="50" textAnchor="middle">No Board</text></svg>;
  }

  const cell_size = 30; // Conceptual base size, actual rendering scales via SVG
  
  // Default values
  let internalPadding = thumbnailOptions ? cell_size * (thumbnailOptions.paddingRatio ?? 0.1) : 20;
  let starPointRadius = thumbnailOptions ? cell_size * (thumbnailOptions.starPointRatio ?? 0.1) : 3.5;
  let stoneRadius = thumbnailOptions ? cell_size * (thumbnailOptions.stoneRadiusRatio ?? 0.45) : 13;
  let lineStrokeWidth = thumbnailOptions ? (thumbnailOptions.lineStrokeWidth ?? 0.5) : 1;
  const omitStarPoints = thumbnailOptions?.omitStarPoints ?? false;


  const viewboxDimension = (renderCols -1) * cell_size + 2 * internalPadding;
  const boardLineColor = "#4A3B31"; // Dark wood/line color

  const lineOverhang = displayJosekiCornerSize ? cell_size * 0.3 : 0;

  const handleBoardEvent = (event: React.MouseEvent<SVGSVGElement>, action: 'click' | 'mousemove') => {
    if (!interactive) return;

    const svg = event.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const col = Math.round((svgP.x - internalPadding) / cell_size);
    const row = Math.round((svgP.y - internalPadding) / cell_size);

    if (row >= 0 && row < renderRows && col >= 0 && col < renderCols) {
      if (action === 'click' && onPointClick) {
        onPointClick(row, col);
      } else if (action === 'mousemove' && onMouseEnterPoint) {
        if (!highlightedPoint || highlightedPoint.row !== row || highlightedPoint.col !== col) {
             onMouseEnterPoint(row, col);
        }
      }
    } else {
        if (action === 'mousemove' && onMouseLeaveBoard && highlightedPoint) {
            onMouseLeaveBoard(); // This is called if mouse leaves SVG bounds if handler is on SVG
        }
    }
  };
  
  const getSgfCoord = (c: number, r: number): SgfCoord => {
    return convertToSgfCoord(c, r, numCols, numRows); // Pass actual board dimensions
  };

  const gridStartCoord = internalPadding;
  const gridEndCoord = internalPadding + (renderCols > 1 ? (renderCols - 1) : 0) * cell_size; // Handle 1xN boards
  
  const defaultLineDrawStart = gridStartCoord;
  const defaultLineDrawEnd = gridEndCoord;
  const overhangLineDrawEnd = gridEndCoord + lineOverhang;

  const StarPointsToRender = NINETEEN_STAR_POINTS.filter(sp => sp.row < renderRows && sp.col < renderCols);


  return (
      <svg
        viewBox={`0 0 ${viewboxDimension} ${viewboxDimension}`}
        className={className || "w-full h-full"} // Default to w-full h-full
        onClick={(e) => handleBoardEvent(e, 'click')}
        onMouseMove={interactive && onMouseEnterPoint ? (e) => handleBoardEvent(e, 'mousemove') : undefined}
        onMouseLeave={interactive && onMouseLeaveBoard ? onMouseLeaveBoard : undefined}
        style={{ cursor: interactive ? 'pointer' : 'default', ...svgProps.style }}
        aria-label={`Go board${displayJosekiCornerSize ? ` (Joseki View ${displayJosekiCornerSize}x${displayJosekiCornerSize})` : ` (${numCols}x${numRows})`}`}
        {...svgProps}
      >
        {/* Board Lines */}
        {Array.from({ length: renderCols }).map((_, i) => {
          const xPos = internalPadding + i * cell_size;
          const vertY1 = defaultLineDrawStart;
          const vertY2 = displayJosekiCornerSize && renderRows > 1 ? overhangLineDrawEnd : defaultLineDrawEnd;
          
          if (renderRows > 0) { // Only draw vertical lines if there are rows
            return (
              <line
                key={`vline-${i}`}
                x1={xPos} y1={vertY1}
                x2={xPos} y2={vertY2}
                stroke={boardLineColor} strokeWidth={lineStrokeWidth}
                aria-hidden="true"
              />
            );
          }
          return null;
        })}
        {Array.from({ length: renderRows }).map((_, i) => {
          const yPos = internalPadding + i * cell_size;
          const horzX1 = defaultLineDrawStart;
          const horzX2 = displayJosekiCornerSize && renderCols > 1 ? overhangLineDrawEnd : defaultLineDrawEnd;
          
          if (renderCols > 0) { // Only draw horizontal lines if there are columns
            return (
              <line
                key={`hline-${i}`}
                x1={horzX1} y1={yPos}
                x2={horzX2} y2={yPos}
                stroke={boardLineColor} strokeWidth={lineStrokeWidth}
                aria-hidden="true"
              />
            );
          }
          return null;
        })}

        {/* Star Points - Filter for current render size */}
        {!omitStarPoints && starPointRadius > 0 && StarPointsToRender.map((sp, i) => (
          <circle
            key={`star-${i}`}
            cx={internalPadding + sp.col * cell_size}
            cy={internalPadding + sp.row * cell_size}
            r={starPointRadius}
            fill={boardLineColor}
            aria-hidden="true"
          />
        ))}

        {/* Stones - Render only within renderRows/renderCols */}
        {boardState.slice(0, renderRows).map((rowItems, r) =>
          rowItems.slice(0, renderCols).map((stone, c) => {
            if (stone) {
              const stoneFill = stone === StoneColor.Black ? "url(#blackStoneGradient)" : "url(#whiteStoneGradient)";
              const sgfCoordKey = getSgfCoord(c, r);
              // Only show move numbers if moveNumbersMap is provided and not in thumbnail mode (implicitly)
              const moveNum = (thumbnailOptions || !moveNumbersMap) ? null : moveNumbersMap?.[sgfCoordKey];
              
              return (
                <g key={`stone-group-${r}-${c}`}>
                  <circle
                    cx={internalPadding + c * cell_size}
                    cy={internalPadding + r * cell_size}
                    r={stoneRadius}
                    fill={stoneFill}
                    stroke={stone === StoneColor.Black ? 'rgb(5,5,5)' : '#A9A9A9'} 
                    strokeWidth={thumbnailOptions ? 0.25 : 0.5} // Thinner stroke for thumbnails
                    className={thumbnailOptions ? "" : "stone-shadow"} // No shadow for thumbnails
                    aria-label={`${stone === StoneColor.Black ? 'Black' : 'White'} stone at ${String.fromCharCode(97 + c)}${renderRows - r}${moveNum ? `, move ${moveNum}`: ''}`}
                  />
                  {moveNum && ( // Ensure moveNum exists and is not suppressed by thumbnailOptions
                    <text
                      x={internalPadding + c * cell_size}
                      y={internalPadding + r * cell_size}
                      dy="0.32em" 
                      textAnchor="middle"
                      fontSize={stoneRadius * (moveNum > 99 ? 0.65 : moveNum > 9 ? 0.75 : 0.9)}
                      fill={stone === StoneColor.Black ? 'white' : 'black'}
                      pointerEvents="none"
                      className="font-sans font-semibold"
                      aria-hidden="true"
                    >
                      {moveNum}
                    </text>
                  )}
                </g>
              );
            }
            return null;
          })
        )}
        
        {/* Highlight for interactive mode */}
        {interactive && highlightedPoint && 
         highlightedPoint.row < renderRows && highlightedPoint.col < renderCols &&
         boardState[highlightedPoint.row][highlightedPoint.col] === null && currentPlayer && (
           <circle
            cx={internalPadding + highlightedPoint.col * cell_size}
            cy={internalPadding + highlightedPoint.row * cell_size}
            r={stoneRadius}
            fill={currentPlayer === StoneColor.Black ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)'}
            pointerEvents="none" 
            aria-hidden="true"
          />
        )}
      </svg>
  );
};
