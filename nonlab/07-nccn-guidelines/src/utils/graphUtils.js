/**
 * Get distinct pages from guideline metadata.
 */
export function getPageList(guideline) {
  return guideline.pages || [];
}

/**
 * Filter nodes to a specific algorithm page.
 */
export function getNodesForPage(nodes, pageId) {
  if (!pageId) return nodes;
  return nodes.filter((n) => n.page === pageId);
}

/**
 * Get edges relevant to a set of page nodes.
 * Only includes edges where BOTH source and target exist in the page node set.
 * React Flow crashes silently if an edge references a missing node.
 */
export function getEdgesForPage(edges, pageNodes) {
  const nodeIds = new Set(pageNodes.map((n) => n.id));
  return edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
}

/**
 * Build the rendered node/edge set for a given page, including synthetic
 * "entry stubs" for incoming cross-page edges so users see where flow
 * originates on this page.
 */
export function buildPageGraph(allNodes, allEdges, pageId) {
  if (!pageId) return { pageNodes: allNodes, pageEdges: allEdges };

  const pageNodes = allNodes.filter((n) => n.page === pageId);
  const pageNodeIds = new Set(pageNodes.map((n) => n.id));

  const samePageEdges = allEdges.filter(
    (e) => pageNodeIds.has(e.source) && pageNodeIds.has(e.target)
  );

  const incomingCrossPage = allEdges.filter(
    (e) => e.crossPage && pageNodeIds.has(e.target) && !pageNodeIds.has(e.source)
  );

  const entryStubs = [];
  const entryEdges = [];

  for (const edge of incomingCrossPage) {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    const targetNode = allNodes.find((n) => n.id === edge.target);
    if (!sourceNode || !targetNode) continue;

    const stubId = `__entry_${edge.id}`;
    const targetX = targetNode.position?.x ?? 0;
    const targetY = targetNode.position?.y ?? 0;

    entryStubs.push({
      id: stubId,
      type: 'reference',
      page: pageId,
      label: `From ${sourceNode.page}`,
      position: { x: targetX - 280, y: targetY },
      isEntryStub: true,
      targetPage: sourceNode.page,
    });

    entryEdges.push({
      id: `__entry_edge_${edge.id}`,
      source: stubId,
      target: edge.target,
      crossPage: true,
    });
  }

  return {
    pageNodes: [...pageNodes, ...entryStubs],
    pageEdges: [...samePageEdges, ...entryEdges],
  };
}

/**
 * Get all edges leaving a given node.
 */
export function getOutgoingEdges(edges, nodeId) {
  return edges.filter((e) => e.source === nodeId);
}

/**
 * Get all edges entering a given node.
 */
export function getIncomingEdges(edges, nodeId) {
  return edges.filter((e) => e.target === nodeId);
}

/**
 * Find a node by ID.
 */
export function findNode(nodes, nodeId) {
  return nodes.find((n) => n.id === nodeId) || null;
}

/**
 * Get neighbor node IDs (both directions).
 */
export function getNeighbors(edges, nodeId) {
  const neighbors = new Set();
  for (const e of edges) {
    if (e.source === nodeId) neighbors.add(e.target);
    if (e.target === nodeId) neighbors.add(e.source);
  }
  return [...neighbors];
}

/**
 * Convert guideline nodes to React Flow format.
 */
export function toFlowNodes(nodes) {
  return nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position || { x: 0, y: 0 },
    data: { ...n },
  }));
}

/**
 * Convert guideline edges to React Flow format.
 */
export function toFlowEdges(edges) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label || '',
    type: 'smoothstep',
    animated: e.crossPage || false,
    style: e.crossPage
      ? { strokeDasharray: '5 5', stroke: '#94a3b8', strokeWidth: 2 }
      : { stroke: '#475569', strokeWidth: 2 },
    labelStyle: { fontSize: 13, fontWeight: 600, fill: '#1e293b' },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.92 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: 'arrowclosed', color: e.crossPage ? '#94a3b8' : '#475569', width: 16, height: 16 },
  }));
}
