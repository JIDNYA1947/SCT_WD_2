/* =========================================================
   statistics.js — Derives & renders lap statistics
   Total Time / Total Laps / Best / Average / Fastest / Slowest
========================================================= */

const Statistics = (() => {

  /** Compute the full stat set from the current laps + elapsed time */
  function compute(laps, totalElapsed) {
    if (!laps.length) {
      return {
        totalTime: totalElapsed || 0,
        totalLaps: 0,
        bestLap: null,
        avgLap: null,
        fastestLap: null,
        slowestLap: null
      };
    }

    const lapTimes = laps.map(l => l.lapTime);
    const fastest = Math.min(...lapTimes);
    const slowest = Math.max(...lapTimes);
    const avg = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length;

    return {
      totalTime: totalElapsed || 0,
      totalLaps: laps.length,
      bestLap: fastest,   // best === fastest by definition
      avgLap: avg,
      fastestLap: fastest,
      slowestLap: slowest
    };
  }

  /** Push computed stats into a set of DOM elements, given an id suffix ('' or '2') */
  function render(stats, suffix = '') {
    const set = (id, text) => {
      const el = document.getElementById(id + suffix);
      if (!el) return;
      el.textContent = text;
      el.classList.remove('bump');
      // Force reflow so the animation can retrigger
      void el.offsetWidth;
      el.classList.add('bump');
    };

    const fmt = ms => (ms === null || ms === undefined) ? '--:--:--' : Stopwatch.format(ms).full;

    set('statTotalTime', Stopwatch.format(stats.totalTime).full);
    set('statTotalLaps', String(stats.totalLaps));
    set('statBestLap', fmt(stats.bestLap));
    set('statAvgLap', fmt(stats.avgLap));
    set('statFastestLap', fmt(stats.fastestLap));
    set('statSlowestLap', fmt(stats.slowestLap));
  }

  return { compute, render };
})();
