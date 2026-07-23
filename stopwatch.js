/* =========================================================
   stopwatch.js — Core timing engine
   Pure logic: start / pause / resume / reset / lap
   Broadcasts custom events so other modules can react
========================================================= */

const Stopwatch = (() => {
  let startTimestamp = 0;   // performance.now() at (re)start
  let elapsedBeforePause = 0; // ms accumulated before current run
  let rafId = null;
  let isRunning = false;
  let laps = []; // { id, lapTime, totalTime }

  /* ---------- helpers ---------- */

  function now() {
    return elapsedBeforePause + (isRunning ? performance.now() - startTimestamp : 0);
  }

  function emit(name, detail) {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function tick() {
    if (!isRunning) return;
    emit('sw:tick', { elapsed: now() });
    rafId = requestAnimationFrame(tick);
  }

  /* ---------- public actions ---------- */

  function start() {
    if (isRunning) return;
    isRunning = true;
    startTimestamp = performance.now();
    rafId = requestAnimationFrame(tick);
    emit('sw:start', { elapsed: now() });
  }

  function pause() {
    if (!isRunning) return;
    elapsedBeforePause = now();
    isRunning = false;
    cancelAnimationFrame(rafId);
    emit('sw:pause', { elapsed: elapsedBeforePause });
  }

  function reset() {
    isRunning = false;
    cancelAnimationFrame(rafId);
    elapsedBeforePause = 0;
    startTimestamp = 0;
    laps = [];
    emit('sw:reset', { elapsed: 0 });
  }

  function lap() {
    const totalTime = now();
    const prevTotal = laps.length ? laps[laps.length - 1].totalTime : 0;
    const lapTime = totalTime - prevTotal;
    const entry = { id: laps.length + 1, lapTime, totalTime };
    laps.push(entry);
    emit('sw:lap', { lap: entry, laps: [...laps] });
    return entry;
  }

  function deleteLap(id) {
    laps = laps.filter(l => l.id !== id);
    // Renumber & recompute lap times relative to remaining totals
    let prevTotal = 0;
    laps = laps.map((l, i) => {
      const lapTime = l.totalTime - prevTotal;
      prevTotal = l.totalTime;
      return { ...l, id: i + 1, lapTime };
    });
    emit('sw:lapsChanged', { laps: [...laps] });
  }

  function clearLaps() {
    laps = [];
    emit('sw:lapsChanged', { laps: [] });
  }

  /** Restore a previously saved session (used by storage/dashboard on load) */
  function restore(state) {
    if (!state) return;
    elapsedBeforePause = state.elapsed || 0;
    laps = Array.isArray(state.laps) ? state.laps : [];
    isRunning = false;
    emit('sw:restored', { elapsed: elapsedBeforePause, laps: [...laps] });
  }

  function getState() {
    return { elapsed: now(), laps: [...laps], isRunning };
  }

  function getLaps() {
    return [...laps];
  }

  function running() {
    return isRunning;
  }

  /* ---------- formatting ---------- */

  function format(ms) {
    const totalMs = Math.max(0, Math.floor(ms));
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const millis = Math.floor((totalMs % 1000) / 10); // 2-digit centiseconds
    const pad = (n, l = 2) => String(n).padStart(l, '0');
    return {
      hours: pad(hours), minutes: pad(minutes), seconds: pad(seconds), ms: pad(millis),
      full: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
      fullWithMs: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(millis)}`
    };
  }

  return {
    start, pause, reset, lap, deleteLap, clearLaps,
    restore, getState, getLaps, running, format, now
  };
})();
