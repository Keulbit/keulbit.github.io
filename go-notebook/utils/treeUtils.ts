import { MoveNode, StoneColor, SgfCoord } from '../types';

let nodeIdCounter = 0; // Simple counter for unique IDs if not using path based.
                      // For more robust IDs, consider UUIDs or path-based generation.

/**
 * Generates a unique ID for a move node.
 * This is a simplified version. For true uniqueness across sessions or distributed systems,
 * a more robust ID generation (like UUID) would be needed.
 * Path-based IDs (e.g., "0-1-2") can also be very useful for debugging and certain traversal algorithms.
 */
export const generateNodeId = (): string => {
  // Simple incrementing ID. Could be enhanced with parent path.
  return `node-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
};

export const createMoveNode = (
    player: StoneColor, 
    coord: SgfCoord, 
    comment?: string
): MoveNode => {
    return {
        id: generateNodeId(),
        player,
        coord,
        comment,
        children: [],
    };
};


/**
 * Retrieves a node from the tree given a path of IDs.
 * @param roots The root nodes of the tree (or gameTree).
 * @param path An array of node IDs representing the path from a root to the target node.
 * @returns The target MoveNode or null if not found.
 */
export const getNodeByPath = (roots: MoveNode[], path: string[]): MoveNode | null => {
  if (!path || path.length === 0) return null;

  let currentNode: MoveNode | undefined = roots.find(r => r.id === path[0]);
  if (!currentNode) return null;

  for (let i = 1; i < path.length; i++) {
    const nextNodeId = path[i];
    currentNode = currentNode.children.find(child => child.id === nextNodeId);
    if (!currentNode) return null;
  }
  return currentNode;
};

export interface PathMove {
  id: string;
  player: StoneColor;
  coord: SgfCoord;
  comment?: string;
}

/**
 * Extracts a linear sequence of moves (player, coord, id, comment) for a given path.
 * @param roots The root nodes of the tree.
 * @param path An array of node IDs.
 * @returns An array of PathMove objects.
 */
export const getMovesForPath = (roots: MoveNode[], path: string[]): PathMove[] => {
  const moves: PathMove[] = [];
  if (!path || path.length === 0) return moves;

  let currentNode: MoveNode | undefined = roots.find(r => r.id === path[0]);
  if (!currentNode) return moves;
  
  moves.push({ id: currentNode.id, player: currentNode.player, coord: currentNode.coord, comment: currentNode.comment });

  for (let i = 1; i < path.length; i++) {
    const nextNodeId = path[i];
    currentNode = currentNode.children.find(child => child.id === nextNodeId);
    if (!currentNode) break; 
    moves.push({ id: currentNode.id, player: currentNode.player, coord: currentNode.coord, comment: currentNode.comment });
  }
  return moves;
};


/**
 * Recursively finds a node by its ID and returns the node and its path from a root.
 * @param nodes The current array of nodes to search within.
 *   @param targetId The ID of the node to find.
 * @param currentPath The path accumulated so far to reach the current `nodes` level.
 * @returns An object containing the found node and its full path, or null if not found.
 */
export const findNodeAndPathById = (
  nodes: MoveNode[],
  targetId: string,
  currentPath: string[] = []
): { node: MoveNode; path: string[] } | null => {
  for (const node of nodes) {
    const path = [...currentPath, node.id];
    if (node.id === targetId) {
      return { node, path };
    }
    const foundInChildren = findNodeAndPathById(node.children, targetId, path);
    if (foundInChildren) {
      return foundInChildren;
    }
  }
  return null;
};


/**
 * Adds a new child node to a parent specified by its path.
 * Modifies the tree in place (returns a new tree root array for React state updates).
 * @param roots The root nodes of the tree.
 * @param parentPath The path to the parent node. If empty, adds to roots.
 * @param newChildNode The child node to add.
 * @returns New root array of the tree, or null if parentPath is invalid.
 */
export const addChildNodeToPath = (
  roots: MoveNode[],
  parentPath: string[],
  newChildNode: MoveNode
): MoveNode[] => {
  const newRoots = roots.map(r => deepCopyNode(r)); // Deep copy for immutability

  if (!parentPath || parentPath.length === 0) {
    // Adding as a new root variation
    newRoots.push(newChildNode);
    return newRoots;
  }

  const parentNode = getNodeByPath(newRoots, parentPath);
  if (parentNode) {
    parentNode.children.push(newChildNode);
    return newRoots;
  }
  
  console.error("Parent node not found for path:", parentPath);
  return roots; // Return original roots if parent not found
};

export const deepCopyNode = (node: MoveNode): MoveNode => {
    return {
        ...node,
        children: node.children.map(child => deepCopyNode(child)),
    };
};

export const deepCopyTree = (tree: MoveNode[]): MoveNode[] => {
    return tree.map(node => deepCopyNode(node));
};

/**
 * Removes a node and its descendants from the tree.
 * @param roots The root nodes of the tree.
 * @param nodePath The path to the node to remove.
 * @returns New root array of the tree, or original roots if node not found.
 */
export const removeNodeByPath = (
    roots: MoveNode[],
    nodePath: string[]
): MoveNode[] => {
    if (!nodePath || nodePath.length === 0) return roots;

    const newRoots = deepCopyTree(roots);
    
    if (nodePath.length === 1) { // Removing a root node
        const nodeIdToRemove = nodePath[0];
        return newRoots.filter(node => node.id !== nodeIdToRemove);
    }

    const parentPath = nodePath.slice(0, -1);
    const nodeIdToRemove = nodePath[nodePath.length - 1];
    
    const parentNode = getNodeByPath(newRoots, parentPath);

    if (parentNode) {
        parentNode.children = parentNode.children.filter(child => child.id !== nodeIdToRemove);
    } else {
        console.warn("Could not find parent to remove child:", nodePath);
        return roots; // Return original if parent not found
    }
    return newRoots;
};

// Function to find parent of a node
export const getParentNodeAndPath = (
  roots: MoveNode[],
  childPath: string[]
): { parentNode: MoveNode | null; parentPath: string[] } | null => {
  if (!childPath || childPath.length <= 1) { // Root nodes or invalid path
    return { parentNode: null, parentPath: [] };
  }
  const parentPath = childPath.slice(0, -1);
  const parentNode = getNodeByPath(roots, parentPath);
  if (!parentNode) return null;
  return { parentNode, parentPath };
};

// Traverses to the "main line" (first child preference) to a certain depth or end of line.
export const getMainLinePath = (roots: MoveNode[], maxDepth?: number): string[] => {
    const path: string[] = [];
    if (!roots || roots.length === 0) return path;

    let currentNode: MoveNode | undefined = roots[0]; // Assume first root is main start
    if (!currentNode) return path;
    
    path.push(currentNode.id);
    let currentDepth = 1;

    while (currentNode.children && currentNode.children.length > 0 && (maxDepth === undefined || currentDepth < maxDepth)) {
        currentNode = currentNode.children[0]; // Always take the first child
        path.push(currentNode.id);
        currentDepth++;
    }
    return path;
};
