/* =========================================================
   app.js — Application bootstrap
   Navigation, keyboard shortcuts, ripple FX, settings page,
   sidebar toggle and initial wiring for every module.
========================================================= */

(() => {

  /* ---------- PAGE NAVIGATION ---------- */
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const target = item.dataset.page;

        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        pages.forEach(p => p.classList.remove('active'));

        // "stopwatch" and "history" both live on the dashboard page,
        // just scroll to the relevant section for a smooth UX.
        const pageId = (target === 'stopwatch' || target === 'history') ? 'dashboard' : target;
        const pageEl = document.getElementById('page-' + pageId);
        if (pageEl) pageEl.classList.add('active');

        if (target === 'history') {
          setTimeout(() => {
            document.getElementById('lapHistorySection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 60);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        if (target === 'statistics') Dashboard.renderStatsChart();

        closeSidebarOnMobile();
      });
    });
  }

  /* ---------- SIDEBAR / MOBILE ---------- */
  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger');

    hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));

    document.addEventListener('click', (e) => {
      if (window.innerWidth > 760) return;
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== hamburger && !hamburger.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  function closeSidebarOnMobile() {
    if (window.innerWidth <= 760) {
      document.getElementById('sidebar').classList.remove('open');
    }
  }

  /* ---------- THEME TOGGLES ---------- */
  function initThemeControls() {
    document.getElementById('themeToggle').addEventListener('click', () => Theme.toggle());
    document.getElementById('darkModeBtn').addEventListener('click', () => Theme.toggle());

    document.getElementById('settingsThemeSwitch').addEventListener('change', (e) => {
      Theme.apply(e.target.checked ? 'dark' : 'light');
      const settings = Storage.loadSettings();
      settings.theme = e.target.checked ? 'dark' : 'light';
      Storage.saveSettings(settings);
    });
  }

  /* ---------- RIPPLE EFFECT ---------- */
  function initRipple() {
    document.querySelectorAll('.sw-btn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const settings = Storage.loadSettings();
        if (!settings.animations) return;
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
      });
    });
  }

  /* ---------- KEYBOARD SHORTCUTS ---------- */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ignore when typing in an input/select
      const tag = document.activeElement.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        Stopwatch.running() ? Stopwatch.pause() : Stopwatch.start();
      } else if (e.key.toLowerCase() === 'l') {
        if (Stopwatch.running()) Stopwatch.lap();
      } else if (e.key.toLowerCase() === 'r') {
        if (Stopwatch.running()) Stopwatch.pause();
        Stopwatch.reset();
      }
    });
  }

  /* ---------- SETTINGS PAGE ---------- */
  function initSettingsPage() {
    const settings = Storage.loadSettings();
    document.getElementById('settingsAutoSave').checked = settings.autoSave;
    document.getElementById('settingsSound').checked = settings.soundEffects;
    document.getElementById('settingsAnimations').checked = settings.animations;

    document.getElementById('settingsAutoSave').addEventListener('change', (e) => {
      const s = Storage.loadSettings(); s.autoSave = e.target.checked; Storage.saveSettings(s);
      Dashboard.showToast(`Auto save ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    });
    document.getElementById('settingsSound').addEventListener('change', (e) => {
      const s = Storage.loadSettings(); s.soundEffects = e.target.checked; Storage.saveSettings(s);
      Dashboard.showToast(`Sound effects ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    });
    document.getElementById('settingsAnimations').addEventListener('change', (e) => {
      const s = Storage.loadSettings(); s.animations = e.target.checked; Storage.saveSettings(s);
      Dashboard.showToast(`Animations ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
    });

    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
      const defaults = Storage.resetSettings();
      document.getElementById('settingsAutoSave').checked = defaults.autoSave;
      document.getElementById('settingsSound').checked = defaults.soundEffects;
      document.getElementById('settingsAnimations').checked = defaults.animations;
      Theme.apply(defaults.theme);
      Dashboard.showToast('Settings restored to default', 'success');
    });
  }

  /* ---------- INIT ---------- */
  // Each step runs in its own try/catch: if one module has a problem
  // (e.g. a CDN asset like Chart.js fails to load on a slow/offline
  // connection), it must never prevent navigation, shortcuts or the
  // rest of the app from initializing.
  function safeInit(name, fn) {
    try {
      fn();
    } catch (err) {
      console.error(`StopWatch Pro: "${name}" failed to initialize`, err);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    safeInit('theme', () => Theme.init());
    safeInit('dashboard', () => Dashboard.init());
    safeInit('navigation', () => initNavigation());
    safeInit('sidebar', () => initSidebar());
    safeInit('theme controls', () => initThemeControls());
    safeInit('ripple', () => initRipple());
    safeInit('keyboard shortcuts', () => initKeyboardShortcuts());
    safeInit('settings page', () => initSettingsPage());
  });

})();
