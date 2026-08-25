import { guidelineRegistry, guidelineData } from '../data/guidelines';

const STATUS_ORDER = {
  withdrawn: 'Withdrawn',
  crl: 'Complete Response Letter',
  approved: 'Approved',
  accelerated: 'Accelerated Approval',
  breakthrough: 'Breakthrough Designation',
  trial: 'Trial-in-Progress',
};

function extractRegulatoryArray(node) {
  if (!node.regulatory) return [];
  return Array.isArray(node.regulatory) ? node.regulatory : [node.regulatory];
}

export function getAllRegulatoryEvents() {
  const events = [];
  for (const guideline of guidelineRegistry) {
    const data = guidelineData[guideline.id];
    if (!data) continue;
    for (const node of data.nodes) {
      const regs = extractRegulatoryArray(node);
      for (const r of regs) {
        if (!r.date) continue;
        events.push({
          guidelineId: guideline.id,
          guidelineName: guideline.name,
          nodeId: node.id,
          nodeLabel: node.label,
          nodeStatus: node.status || 'in-nccn',
          nodeType: node.type,
          agency: r.agency || 'FDA',
          status: r.status,
          statusLabel: STATUS_ORDER[r.status] || r.status,
          date: r.date,
          notes: r.notes,
          url: r.url,
        });
      }
    }
  }
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return events;
}

export function getBeyondNccnNodes() {
  const results = [];
  for (const guideline of guidelineRegistry) {
    const data = guidelineData[guideline.id];
    if (!data) continue;
    for (const node of data.nodes) {
      if (node.status === 'beyond-nccn') {
        results.push({
          guidelineId: guideline.id,
          guidelineName: guideline.name,
          nodeId: node.id,
          nodeLabel: node.label,
          evidenceLevel: node.evidenceLevel,
          detail: node.detail,
          regulatory: extractRegulatoryArray(node),
        });
      }
    }
  }
  return results;
}

export function getWithdrawnNodes() {
  const results = [];
  for (const guideline of guidelineRegistry) {
    const data = guidelineData[guideline.id];
    if (!data) continue;
    for (const node of data.nodes) {
      if (node.status === 'withdrawn') {
        results.push({
          guidelineId: guideline.id,
          guidelineName: guideline.name,
          nodeId: node.id,
          nodeLabel: node.label,
          detail: node.detail,
          regulatory: extractRegulatoryArray(node),
        });
      }
    }
  }
  return results;
}

export function getGuidelineVersions() {
  return guidelineRegistry
    .map((g) => ({
      id: g.id,
      name: g.name,
      version: g.version,
      nccnUrl: g.nccnUrl,
      category: g.category,
    }))
    .sort((a, b) => (a.version < b.version ? 1 : a.version > b.version ? -1 : 0));
}

export function groupEventsByYear(events) {
  const groups = new Map();
  for (const ev of events) {
    const year = ev.date.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(ev);
  }
  return Array.from(groups.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}
