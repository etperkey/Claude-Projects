// Stat gauge UI — displays in the bezel area above the canvas

const GAUGE_DEFS = [
  { id: 'cells', label: 'Tumor', color: '#aa66cc', max: 10000, getValue: s => s.tumor.cellCount },
  { id: 'energy', label: 'ATP', color: '#ffcc00', max: 100, getValue: s => s.tumor.energy },
  { id: 'immuno', label: 'Suppress', color: '#66ff88', max: 100, getValue: s => s.tumor.immunosuppression },
  { id: 'angio', label: 'Angio', color: '#ff4444', max: 100, getValue: s => s.tumor.angiogenesis },
  { id: 'apopt', label: 'Apoptosis', color: '#ff8800', max: 100, getValue: s => s.tumor.apoptosisResistance },
  { id: 'cytokine', label: 'Cytokine', color: '#44ddff', max: 50, getValue: s => s.tumor.cytokineStockpile },
];

let gaugeElements = {};

export function initGauges() {
  const container = document.getElementById('gauges');
  container.innerHTML = '';
  gaugeElements = {};

  for (const def of GAUGE_DEFS) {
    const gauge = document.createElement('div');
    gauge.className = 'gauge';

    const label = document.createElement('div');
    label.className = 'gauge-label';
    label.textContent = def.label;

    const bar = document.createElement('div');
    bar.className = 'gauge-bar';

    const fill = document.createElement('div');
    fill.className = 'gauge-fill';
    fill.style.background = def.color;
    fill.style.width = '0%';

    const value = document.createElement('div');
    value.className = 'gauge-value';
    value.textContent = '0';

    bar.appendChild(fill);
    gauge.appendChild(label);
    gauge.appendChild(bar);
    gauge.appendChild(value);
    container.appendChild(gauge);

    gaugeElements[def.id] = { fill, value, def };
  }
}

export function updateGauges(state) {
  for (const [id, elem] of Object.entries(gaugeElements)) {
    const raw = elem.def.getValue(state);
    const val = Math.max(0, Math.min(elem.def.max, raw));
    const pct = (val / elem.def.max) * 100;

    elem.fill.style.width = `${pct}%`;

    // Color coding for danger
    if (id === 'apopt') {
      // Low = bad for apoptosis resistance
      elem.fill.style.background = val < 20 ? '#ff4444' : val < 40 ? '#ff8800' : elem.def.color;
    } else if (id === 'cytokine') {
      // Low = can't recruit
      elem.fill.style.background = val < 10 ? '#ff8800' : elem.def.color;
    }

    // Format value display
    if (id === 'cells') {
      elem.value.textContent = raw >= 1000 ? `${(raw / 1000).toFixed(1)}k` : raw;
    } else {
      elem.value.textContent = Math.floor(val);
    }
  }
}
