/* =========================================================
   dashboard.js — Wires the Stopwatch engine to the UI:
   digit display, stat cards, lap table, Chart.js graph,
   progress bar, CSV export and toasts.
========================================================= */

const Dashboard = (() => {
  const GOAL_MS = 10 * 60 * 1000; // 10 minute session goal for the progress bar
  let graphFilter = 'all';

  /* ---------- DOM refs ---------- */
  const els = {};
  function cacheEls() {
    els.hours = document.getElementById('swHours');
    els.minutes = document.getElementById('swMinutes');
    els.seconds = document.getElementById('swSeconds');
    els.ms = document.getElementById('swMs');
    els.display = document.getElementById('swDisplay');
    els.statusPill = document.getElementById('statusPill');
    els.startBtn = document.getElementById('startBtn');
    els.pauseBtn = document.getElementById('pauseBtn');
    els.lapBtn = document.getElementById('lapBtn');
    els.resetBtn = document.getElementById('resetBtn');
    els.tableBody = document.getElementById('lapTableBody');
    els.progressFill = document.getElementById('progressFill');
    els.progressPercent = document.getElementById('progressPercent');
    els.progressText = document.getElementById('progressText');
    els.graphFilter = document.getElementById('graphFilter');
    els.toast = document.getElementById('toast');
  }

  /* ---------- toast ---------- */
  let toastTimer = null;
  function showToast(message, type = '') {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  /* ---------- sound ---------- */
  let audioCtx = null;
  function beep(freq = 880, duration = 0.08) {
    const settings = Storage.loadSettings();
    if (!settings.soundEffects) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) { /* audio not available — fail silently */ }
  }

  /* ---------- display ---------- */
  function updateDisplay(ms) {
    const f = Stopwatch.format(ms);
    els.hours.textContent = f.hours;
    els.minutes.textContent = f.minutes;
    els.seconds.textContent = f.seconds;
    els.ms.textContent = f.ms;
    updateProgress(ms);
  }

  function updateProgress(ms) {
    const pct = Math.min(100, (ms / GOAL_MS) * 100);
    els.progressFill.style.width = pct.toFixed(1) + '%';
    els.progressPercent.textContent = Math.floor(pct) + '%';
    if (ms === 0) {
      els.progressText.textContent = 'Start the clock to begin tracking your goal.';
    } else if (pct >= 100) {
      els.progressText.textContent = 'Goal reached! Keep going or wrap up the session.';
    } else {
      els.progressText.textContent = `${Stopwatch.format(GOAL_MS - ms).full} remaining to hit your goal.`;
    }
  }

  function setStatus(state) {
    els.statusPill.classList.remove('running', 'paused');
    if (state === 'running') {
      els.statusPill.textContent = 'Running';
      els.statusPill.classList.add('running');
      els.display.classList.add('pulsing');
    } else if (state === 'paused') {
      els.statusPill.textContent = 'Paused';
      els.statusPill.classList.add('paused');
      els.display.classList.remove('pulsing');
    } else {
      els.statusPill.textContent = 'Idle';
      els.display.classList.remove('pulsing');
    }
  }

  function setButtons(state) {
    if (state === 'running') {
      els.startBtn.disabled = true;
      els.pauseBtn.disabled = false;
      els.lapBtn.disabled = false;
      els.resetBtn.disabled = false;
      els.startBtn.querySelector('span').textContent = 'Start';
    } else if (state === 'paused') {
      els.startBtn.disabled = false;
      els.startBtn.querySelector('span').textContent = 'Resume';
      els.pauseBtn.disabled = true;
      els.lapBtn.disabled = true;
      els.resetBtn.disabled = false;
    } else {
      els.startBtn.disabled = false;
      els.startBtn.querySelector('span').textContent = 'Start';
      els.pauseBtn.disabled = true;
      els.lapBtn.disabled = true;
      els.resetBtn.disabled = laps().length === 0 && Stopwatch.now() === 0;
    }
  }

  function laps() { return Stopwatch.getLaps(); }

  /* ---------- lap table ---------- */
  function renderTable() {
    const list = laps();
    if (!list.length) {
      els.tableBody.innerHTML = `<tr class="empty-row"><td colspan="5">No laps recorded yet. Hit <strong>Lap</strong> during a session to log one.</td></tr>`;
      return;
    }

    const lapTimes = list.map(l => l.lapTime);
    const fastest = Math.min(...lapTimes);
    const slowest = Math.max(...lapTimes);

    els.tableBody.innerHTML = list.slice().reverse().map((l, idx) => {
      const rowClass = l.lapTime === fastest ? 'best-row' : (l.lapTime === slowest ? 'worst-row' : '');
      const prevIndex = list.findIndex(x => x.id === l.id) - 1;
      const diff = prevIndex >= 0 ? l.lapTime - list[prevIndex].lapTime : 0;
      const diffClass = diff > 0 ? 'diff-up' : (diff < 0 ? 'diff-down' : '');
      const diffSign = diff > 0 ? '+' : (diff < 0 ? '−' : '');
      const diffText = prevIndex >= 0 ? `${diffSign}${Stopwatch.format(Math.abs(diff)).full}` : '—';

      return `
        <tr class="${rowClass}">
          <td>Lap ${l.id}</td>
          <td>${Stopwatch.format(l.lapTime).fullWithMs}</td>
          <td>${Stopwatch.format(l.totalTime).full}</td>
          <td class="${diffClass}">${diffText}</td>
          <td><button class="delete-lap-btn" data-lap-id="${l.id}" title="Delete lap"><i class="fa-solid fa-trash-can"></i></button></td>
        </tr>`;
    }).join('');
  }

  /* ---------- chart ---------- */
  function getFilteredLaps() {
    const list = laps();
    if (graphFilter === 'fastest') {
      return [...list].sort((a, b) => a.lapTime - b.lapTime).slice(0, 5).sort((a, b) => a.id - b.id);
    }
    if (graphFilter === 'slowest') {
      return [...list].sort((a, b) => b.lapTime - a.lapTime).slice(0, 5).sort((a, b) => a.id - b.id);
    }
    return list;
  }

  function toChartPoints(list) {
    return list.map(l => ({ label: 'Lap ' + l.id, value: +(l.lapTime / 1000).toFixed(2) }));
  }

  function renderChart() {
    const container = document.getElementById('lapChart');
    if (!container) return;
    try {
      const list = getFilteredLaps();
      ChartEngine.render(container, toChartPoints(list), {
        type: 'line',
        emptyMessage: 'No lap data yet — hit Lap during a session to see the graph.'
      });
    } catch (err) {
      console.warn('StopWatch Pro: could not render lap graph', err);
    }
  }

  function renderStatsChart() {
    const container = document.getElementById('statsChart');
    if (!container) return;
    try {
      ChartEngine.render(container, toChartPoints(laps()), {
        type: 'bar',
        emptyMessage: 'No lap data yet — start a session to build your statistics.'
      });
    } catch (err) {
      console.warn('StopWatch Pro: could not render statistics graph', err);
    }
  }

  // Redraw the currently visible chart(s) on window resize, since the
  // SVG chart is sized from its container's live pixel dimensions.
  let resizeTimer = null;
  function bindResize() {
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderChart();
        if (document.getElementById('page-statistics')?.classList.contains('active')) {
          renderStatsChart();
        }
      }, 150);
    });
  }

  /* ---------- stats + persistence ---------- */
  function refreshStats() {
    const state = Stopwatch.getState();
    const stats = Statistics.compute(state.laps, state.elapsed);
    Statistics.render(stats, '');
    Statistics.render(stats, '2');
  }

  function persist() {
    const state = Stopwatch.getState();
    Storage.saveState({ elapsed: state.elapsed, laps: state.laps });
  }

  /* ---------- CSV export ---------- */
  function exportCsv() {
    const list = laps();
    if (!list.length) { showToast('No laps to export yet', 'error'); return; }
    const rows = [['Lap No', 'Lap Time', 'Total Time']];
    list.forEach(l => rows.push([l.id, Stopwatch.format(l.lapTime).fullWithMs, Stopwatch.format(l.totalTime).full]));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stopwatch-laps-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Laps exported to CSV', 'success');
  }

  /* ---------- event wiring ---------- */
  function bindEvents() {
    document.addEventListener('sw:tick', e => updateDisplay(e.detail.elapsed));

    document.addEventListener('sw:start', e => {
      setStatus('running'); setButtons('running'); beep(880);
    });

    document.addEventListener('sw:pause', e => {
      updateDisplay(e.detail.elapsed);
      setStatus('paused'); setButtons('paused'); beep(440);
      refreshStats(); persist();
    });

    document.addEventListener('sw:reset', e => {
      updateDisplay(0);
      setStatus('idle'); setButtons('idle');
      renderTable(); renderChart(); refreshStats(); persist();
      beep(220, 0.12);
    });

    document.addEventListener('sw:lap', e => {
      renderTable(); renderChart(); refreshStats(); persist();
      beep(660, 0.06);
    });

    document.addEventListener('sw:lapsChanged', e => {
      renderTable(); renderChart(); refreshStats(); persist();
    });

    document.addEventListener('sw:restored', e => {
      updateDisplay(e.detail.elapsed);
      renderTable(); renderChart(); refreshStats();
      setStatus('idle'); setButtons('idle');
    });

    els.startBtn.addEventListener('click', () => Stopwatch.start());
    els.pauseBtn.addEventListener('click', () => Stopwatch.pause());
    els.lapBtn.addEventListener('click', () => Stopwatch.lap());
    els.resetBtn.addEventListener('click', () => {
      if (Stopwatch.running()) Stopwatch.pause();
      Stopwatch.reset();
    });

    els.tableBody.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-lap-btn');
      if (!btn) return;
      const id = Number(btn.dataset.lapId);
      Stopwatch.deleteLap(id);
      showToast(`Lap ${id} deleted`, 'success');
    });

    document.getElementById('clearAllBtn').addEventListener('click', () => {
      if (!laps().length) { showToast('Lap history is already empty', 'error'); return; }
      Stopwatch.clearLaps();
      showToast('All laps cleared', 'success');
    });

    document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

    els.graphFilter.addEventListener('change', (e) => {
      graphFilter = e.target.value;
      renderChart();
    });
  }

  function init() {
    cacheEls();
    bindEvents();
    bindResize();

    const saved = Storage.loadState();
    if (saved) {
      Stopwatch.restore(saved);
    } else {
      updateDisplay(0);
      setButtons('idle');
      setStatus('idle');
      renderTable();
      renderChart();
      refreshStats();
    }
    renderStatsChart();
  }

  return { init, showToast, renderStatsChart, refreshStats };
})();
