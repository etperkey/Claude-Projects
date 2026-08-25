import { guidelineData } from '../data/guidelines';

export async function loadGuideline(guidelineId) {
  const data = guidelineData[guidelineId];
  if (!data) {
    throw new Error(`Guideline "${guidelineId}" not found`);
  }

  const { meta, nodes, edges } = data;

  // Basic validation
  const nodeIds = new Set(nodes.map((n) => n.id));

  const errors = [];
  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references unknown source "${edge.source}"`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references unknown target "${edge.target}"`);
    }
  }

  for (const node of nodes) {
    if (
      !node.position ||
      typeof node.position.x !== 'number' ||
      typeof node.position.y !== 'number'
    ) {
      errors.push(`Node "${node.id}" missing valid position { x, y }`);
    }
    if (!node.page) {
      errors.push(`Node "${node.id}" missing page assignment`);
    }
  }

  if (errors.length > 0) {
    console.warn('Guideline validation warnings:', errors);
  }

  return {
    ...meta,
    nodes,
    edges,
  };
}
