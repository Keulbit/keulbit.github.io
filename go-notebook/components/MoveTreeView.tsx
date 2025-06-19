import React from 'react';
import { MoveNode, StoneColor } from '../types';
import { findNodeAndPathById, getMainLinePath } from '../utils/treeUtils'; // Import utils

const NODE_RADIUS = 12;
const STROKE_WIDTH = 1.5;
const ACTIVE_STROKE_WIDTH = 3;
const ACTIVE_COLOR = 'rgb(59 130 246)'; // Tailwind's blue-500

// New layout constants
const X_PADDING = 20; // Padding at the start and end of the SVG (for width calculation)
const Y_PADDING = 20; // Padding at the top and bottom (for height calculation)
const H_SPACING_HORIZONTAL = NODE_RADIUS * 4; // Horizontal spacing between moves in a sequence
const V_SPACING_BETWEEN_BRANCHES = NODE_RADIUS * 2.5; // Vertical spacing between variations / root branches


interface NodeLayoutInfo {
  id: string;
  x: number;
  y: number;
  path: string[]; // Path from a root to this node
}

interface TreeNodeProps {
  node: MoveNode;
  nodeLayout: NodeLayoutInfo; 
  activePath: string[]; 
  onNodeSelect: (path: string[]) => void;
  isNodeOnSelectedPath: boolean;
  isTipOfSelectedPath: boolean;
  isNodeOnDefaultMainLine: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  nodeLayout,
  activePath,
  onNodeSelect,
  isNodeOnSelectedPath,
  isTipOfSelectedPath,
  isNodeOnDefaultMainLine,
}) => {
  const { x, y, path: currentPath } = nodeLayout; 

  const stoneFill = node.player === StoneColor.Black ? 'url(#blackStoneGradient)' : 'url(#whiteStoneGradient)';
  const textFill = node.player === StoneColor.Black ? 'white' : 'black';
  const moveNumberDisplay = currentPath.length;

  let strokeColor = '#9ca3af'; // gray-400 (default for non-path, non-mainline)
  let currentStrokeWidth = STROKE_WIDTH;

  if (isNodeOnSelectedPath) {
    strokeColor = ACTIVE_COLOR;
  }

  if (isTipOfSelectedPath) {
    currentStrokeWidth = ACTIVE_STROKE_WIDTH;
    strokeColor = ACTIVE_COLOR; 
  } else if (isNodeOnDefaultMainLine && !isNodeOnSelectedPath && activePath.length > 0) {
    strokeColor = '#d1d5db'; // gray-300
  } else if (isNodeOnDefaultMainLine && activePath.length === 0) {
     strokeColor = ACTIVE_COLOR;
  }


  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onNodeSelect(currentPath)}
      style={{ cursor: 'pointer' }}
      aria-label={`Move ${moveNumberDisplay} by ${node.player === StoneColor.Black ? 'Black' : 'White'}: ${node.coord}`}
    >
      <circle
        r={NODE_RADIUS}
        fill={stoneFill}
        stroke={strokeColor}
        strokeWidth={currentStrokeWidth}
      />
      <text
        dy="0.32em"
        textAnchor="middle"
        fontSize={NODE_RADIUS * 0.8}
        fill={textFill}
        fontWeight="semibold"
        fontFamily="sans-serif"
      >
        {moveNumberDisplay}
      </text>
    </g>
  );
};

interface LineProps {
  parentLayout: NodeLayoutInfo;
  childLayout: NodeLayoutInfo;
  isActiveBranch: boolean; 
}

const TreeLine: React.FC<LineProps> = ({ parentLayout, childLayout, isActiveBranch }) => {
  return (
    <line
      x1={parentLayout.x + NODE_RADIUS} 
      y1={parentLayout.y}
      x2={childLayout.x - NODE_RADIUS} 
      y2={childLayout.y}
      stroke={isActiveBranch ? ACTIVE_COLOR : '#cbd5e1'} // slate-300
      strokeWidth={isActiveBranch ? STROKE_WIDTH * 1.2 : STROKE_WIDTH}
    />
  );
};


interface MoveTreeViewProps {
  treeData: MoveNode[];
  activePath: string[];
  onNodeSelect: (path: string[]) => void;
  initialPlayer: StoneColor; 
}

export const MoveTreeView: React.FC<MoveTreeViewProps> = ({
  treeData,
  activePath,
  onNodeSelect,
  initialPlayer,
}) => {
  const [layouts, setLayouts] = React.useState<Map<string, NodeLayoutInfo>>(new Map());
  const [lines, setLines] = React.useState<Array<{ parentId: string, childId: string }>>([]);
  const [svgDimensions, setSvgDimensions] = React.useState({ width: 200, height: 100, minX: 0 });


  function findNodeByIdRecursive(nodesToSearch: MoveNode[], id: string): MoveNode | null {
      for (const n of nodesToSearch) {
          if (n.id === id) return n;
          const foundInChildren = findNodeByIdRecursive(n.children, id);
          if (foundInChildren) return foundInChildren;
      }
      return null;
  }
  
  React.useEffect(() => {
    const newLayouts = new Map<string, NodeLayoutInfo>();
    const newLines: Array<{ parentId: string, childId: string }> = [];
    let tempSvgWidth = X_PADDING; 
    // tempSvgHeight will be determined by the maximum Y reached.

    // This function calculates positions and returns the maximum Y coordinate
    // it or its descendants occupied, to inform the next sibling's Y position.
    function calculateBranchLayout(
      node: MoveNode,
      depth: number,
      assignedY: number, // The Y coordinate assigned to this current node
      parentId?: string,
      currentPathToParent: string[] = []
    ): number { // Returns: max Y used by this node and its entire subtree
      const nodeX = X_PADDING + depth * H_SPACING_HORIZONTAL;
      const pathForThisNode = [...currentPathToParent, node.id];
      
      newLayouts.set(node.id, { id: node.id, x: nodeX, y: assignedY, path: pathForThisNode });
      tempSvgWidth = Math.max(tempSvgWidth, nodeX + NODE_RADIUS); // Update width based on X (node center)

      if (parentId) {
        newLines.push({ parentId, childId: node.id });
      }

      let maxYSofarInThisSubtree = assignedY; // Current node's Y is the initial max for this branch.

      node.children.forEach((child, childIndex) => {
        let yForChildBranch: number;
        if (childIndex === 0) {
          // First child (main line of this branch) continues from the parent's Y line.
          yForChildBranch = assignedY;
        } else {
          // Subsequent children (variations) start below the max Y of the *previous sibling's entire branch*.
          yForChildBranch = maxYSofarInThisSubtree + V_SPACING_BETWEEN_BRANCHES;
        }
        
        const maxYFromChildBranchLayout = calculateBranchLayout(
          child,
          depth + 1,
          yForChildBranch,
          node.id,
          pathForThisNode 
        );
        maxYSofarInThisSubtree = Math.max(maxYSofarInThisSubtree, maxYFromChildBranchLayout);
      });

      return maxYSofarInThisSubtree; // Max Y occupied by this node and all its children branches
    }

    let overallYCursor = Y_PADDING - V_SPACING_BETWEEN_BRANCHES; // Initialize cursor before the first element's potential Y

    treeData.forEach((rootNode) => {
      // Each root node's branch starts after the previous root's branch has fully completed.
      const startYForThisRootBranch = overallYCursor + V_SPACING_BETWEEN_BRANCHES;
      overallYCursor = calculateBranchLayout(rootNode, 0, startYForThisRootBranch, undefined, []);
    });
    
    // Final SVG height calculation
    const tempSvgHeight = overallYCursor + NODE_RADIUS + Y_PADDING; // Add NODE_RADIUS and Y_PADDING at the end

    setLayouts(newLayouts);
    setLines(newLines);
    setSvgDimensions({
      width: Math.max(tempSvgWidth + X_PADDING, 200), // Add X_PADDING for right-side padding
      height: Math.max(tempSvgHeight, 100), // Ensure minimum height
      minX: 0,
    });

  }, [treeData]);

  if (!treeData || treeData.length === 0) {
    return <div className="p-4 text-center text-slate-500 italic">No moves in this record yet.</div>;
  }
  
  const defaultMainLinePath = getMainLinePath(treeData); 

  return (
    <div className="w-full overflow-auto border border-slate-200 rounded-md bg-slate-50 p-2" style={{ maxHeight: '300px', minHeight: '150px' }}>
      <svg 
        width={svgDimensions.width} 
        height={svgDimensions.height} 
        viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
        aria-label="Move variation tree"
      >
        <g>
          {lines.map((line, i) => {
            const parentLayout = layouts.get(line.parentId);
            const childLayout = layouts.get(line.childId);
            if (!parentLayout || !childLayout) return null;
            
            let isActiveBranchLine = false;
            if (activePath.length > 0) {
                const parentIndexInActivePath = activePath.indexOf(line.parentId);
                if (parentIndexInActivePath !== -1 && activePath[parentIndexInActivePath + 1] === line.childId) {
                    isActiveBranchLine = true;
                }
            } else {
                const parentIndexInDefaultPath = defaultMainLinePath.indexOf(line.parentId);
                if (parentIndexInDefaultPath !== -1 && defaultMainLinePath[parentIndexInDefaultPath + 1] === line.childId) {
                    isActiveBranchLine = true;
                }
            }

            return <TreeLine key={`line-${i}`} parentLayout={parentLayout} childLayout={childLayout} isActiveBranch={isActiveBranchLine} />;
          })}
          
          {Array.from(layouts.values()).map(layout => {
            const node = findNodeByIdRecursive(treeData, layout.id);
            if (!node) return null;

            const currentDisplayPath = layout.path;
            
            let isNodeOnDefaultMainLine = false;
            if (defaultMainLinePath.length >= currentDisplayPath.length) {
                isNodeOnDefaultMainLine = currentDisplayPath.every((id, idx) => id === defaultMainLinePath[idx]);
            }

            const isNodeOnSelectedPath = activePath.length > 0 && activePath.join('-').startsWith(currentDisplayPath.join('-'));
            const isTipOfSelectedPath = activePath.length > 0 && activePath[activePath.length - 1] === node.id;

            return (
              <TreeNode
                key={node.id}
                node={node}
                nodeLayout={layout}
                activePath={activePath}
                onNodeSelect={onNodeSelect}
                isNodeOnSelectedPath={isNodeOnSelectedPath}
                isTipOfSelectedPath={isTipOfSelectedPath}
                isNodeOnDefaultMainLine={isNodeOnDefaultMainLine}
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
};
