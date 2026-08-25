import { getOutgoingEdges, findNode } from './graphUtils';

/**
 * Get possible starting nodes for the walker (typically diagnosis nodes).
 */
export function getStartNodes(nodes) {
  return nodes.filter((n) => n.type === 'diagnosis');
}

/**
 * Given a node and all edges/nodes, return the available next steps.
 * For decision nodes, returns structured options matching the node's options array.
 * For other nodes, returns outgoing edges as options.
 */
export function getNextOptions(nodeId, allNodes, allEdges) {
  const node = findNode(allNodes, nodeId);
  if (!node) return [];

  const outgoing = getOutgoingEdges(allEdges, nodeId);

  if (node.type === 'decision' && node.options) {
    // Map decision options to their target edges
    return node.options.map((opt, idx) => {
      const matchingEdge = outgoing.find((e) => e.conditionIndex === idx);
      return {
        label: opt.label,
        description: opt.description,
        targetNodeId: matchingEdge ? matchingEdge.target : null,
        edgeLabel: matchingEdge ? matchingEdge.label : null,
        optionIndex: idx,
      };
    }).filter((opt) => opt.targetNodeId !== null);
  }

  // Non-decision nodes: auto-advance if single outgoing, show choices if multiple
  return outgoing.map((e, idx) => {
    const targetNode = findNode(allNodes, e.target);
    return {
      label: e.label || targetNode?.label || 'Continue',
      description: targetNode?.detail || '',
      targetNodeId: e.target,
      edgeLabel: e.label,
      optionIndex: idx,
    };
  });
}

/**
 * Check if a node is terminal (no outgoing edges).
 */
export function isTerminalNode(nodeId, allEdges) {
  return getOutgoingEdges(allEdges, nodeId).length === 0;
}

/**
 * Build a summary of the walker's path from history.
 */
export function buildPathSummary(history, currentNodeId, allNodes) {
  const steps = history.map((entry) => {
    const node = findNode(allNodes, entry.nodeId);
    return {
      nodeId: entry.nodeId,
      label: node?.label || entry.nodeId,
      type: node?.type || 'unknown',
      selectedOption: entry.selectedOptionIndex,
    };
  });

  const currentNode = findNode(allNodes, currentNodeId);
  if (currentNode) {
    steps.push({
      nodeId: currentNodeId,
      label: currentNode.label,
      type: currentNode.type,
      selectedOption: null,
    });
  }

  return steps;
}

/**
 * Check if a reference node should trigger a page change.
 */
export function isPageReference(node) {
  return node?.type === 'reference' && node?.targetPage;
}
