/* =========================================================
   chart-engine.js — Lightweight, dependency-free chart renderer
   Renders a purple-neon line/area chart as inline SVG.
   No CDN, no external library, no network request — so it can
   never fail to load and the graph is always guaranteed to render.
========================================================= */

const ChartEngine = (() => {

  const NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs = {}) {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function clear(container) {
    container.innerHTML = '';
  }

  function emptyState(container, message) {
    clear(container);
    const div = document.createElement('div');
    div.className = 'chart-empty';
    div.innerHTML = `<i class="fa-solid fa-chart-line"></i><span>${message}</span>`;
    container.appendChild(div);
  }

  /**
   * Renders a line/area chart into `container`.
   * points: [{ label: 'Lap 1', value: 12.34 }, ...]  (value in seconds)
   * options: { type: 'line' | 'bar', emptyMessage }
   */
  function render(container, points, options = {}) {
    if (!container) return;
    if (!points || !points.length) {
      emptyState(container, options.emptyMessage || 'No lap data yet — record a lap to see the graph.');
      return;
    }

    clear(container);

    const width = Math.max(container.clientWidth, 280);
    const height = Math.max(container.clientHeight, 200);
    const padL = 44, padR = 18, padT = 18, padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const values = points.map(p => p.value);
    const maxVal = Math.max(...values, 0.01);
    const niceMax = maxVal * 1.15;

    const svg = el('svg', {
      viewBox: `0 0 ${width} ${height}`,
      width: '100%',
      height: '100%',
      preserveAspectRatio: 'none',
      class: 'chart-svg'
    });

    // Defs: gradients
    const defs = el('defs');
    const gradId = 'fillGrad-' + Math.random().toString(36).slice(2, 9);
    const grad = el('linearGradient', { id: gradId, x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': 'var(--neon-purple)', 'stop-opacity': '0.45' }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': 'var(--neon-cyan)', 'stop-opacity': '0.02' }));
    defs.appendChild(grad);

    const lineGradId = 'lineGrad-' + Math.random().toString(36).slice(2, 9);
    const lineGrad = el('linearGradient', { id: lineGradId, x1: '0', y1: '0', x2: '1', y2: '0' });
    lineGrad.appendChild(el('stop', { offset: '0%', 'stop-color': 'var(--neon-purple)' }));
    lineGrad.appendChild(el('stop', { offset: '100%', 'stop-color': 'var(--neon-cyan)' }));
    defs.appendChild(lineGrad);
    svg.appendChild(defs);

    // Horizontal grid lines + y-axis labels
    const gridSteps = 4;
    for (let i = 0; i <= gridSteps; i++) {
      const y = padT + (plotH / gridSteps) * i;
      const val = niceMax - (niceMax / gridSteps) * i;
      svg.appendChild(el('line', {
        x1: padL, x2: width - padR, y1: y.toFixed(1), y2: y.toFixed(1),
        stroke: 'var(--chart-grid, rgba(255,255,255,0.07))', 'stroke-width': '1'
      }));
      const label = el('text', {
        x: padL - 8, y: (y + 3).toFixed(1), 'text-anchor': 'end',
        class: 'chart-axis-label'
      });
      label.textContent = val.toFixed(1) + 's';
      svg.appendChild(label);
    }

    // X positions
    const n = points.length;
    const xFor = (i) => n === 1 ? padL + plotW / 2 : padL + (plotW / (n - 1)) * i;
    const yFor = (v) => padT + plotH - (v / niceMax) * plotH;

    // X-axis labels (skip some if too many points)
    const labelEvery = Math.max(1, Math.ceil(n / 8));
    points.forEach((p, i) => {
      if (i % labelEvery !== 0 && i !== n - 1) return;
      const label = el('text', {
        x: xFor(i).toFixed(1), y: height - 8, 'text-anchor': 'middle',
        class: 'chart-axis-label'
      });
      label.textContent = p.label;
      svg.appendChild(label);
    });

    if (options.type === 'bar') {
      const barW = Math.min(38, (plotW / n) * 0.55);
      points.forEach((p, i) => {
        const x = xFor(i) - barW / 2;
        const y = yFor(p.value);
        const bar = el('rect', {
          x: x.toFixed(1), y: y.toFixed(1), width: barW.toFixed(1),
          height: (padT + plotH - y).toFixed(1),
          rx: 5, fill: `url(#${gradId})`, stroke: `url(#${lineGradId})`, 'stroke-width': '1.5',
          class: 'chart-bar'
        });
        bar.appendChild(el('title')).textContent = `${p.label}: ${p.value}s`;
        svg.appendChild(bar);
      });
    } else {
      // Smooth path (line) + area fill
      const coords = points.map((p, i) => [xFor(i), yFor(p.value)]);
      const linePath = smoothPath(coords);
      const areaPath = `${linePath} L ${coords[coords.length - 1][0].toFixed(1)} ${padT + plotH} L ${coords[0][0].toFixed(1)} ${padT + plotH} Z`;

      svg.appendChild(el('path', { d: areaPath, fill: `url(#${gradId})`, stroke: 'none' }));
      const path = el('path', {
        d: linePath, fill: 'none', stroke: `url(#${lineGradId})`,
        'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
        class: 'chart-line'
      });
      svg.appendChild(path);

      coords.forEach(([x, y], i) => {
        const dot = el('circle', {
          cx: x.toFixed(1), cy: y.toFixed(1), r: '4.5',
          fill: 'var(--neon-cyan)', stroke: 'var(--bg-1, #0c1120)', 'stroke-width': '2',
          class: 'chart-point'
        });
        dot.appendChild(el('title')).textContent = `${points[i].label}: ${points[i].value}s`;
        svg.appendChild(dot);
      });
    }

    container.appendChild(svg);
  }

  /** Catmull-Rom to Bezier smoothing for a pleasant curved line */
  function smoothPath(coords) {
    if (coords.length < 2) {
      const [x, y] = coords[0];
      return `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    let d = `M ${coords[0][0].toFixed(1)} ${coords[0][1].toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i - 1] || coords[i];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2] || p2;
      const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
      const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
      const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
      const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d;
  }

  return { render };
})();
