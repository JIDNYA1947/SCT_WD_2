/* =========================================================
   theme.js — Dark / Light neon theme controller
========================================================= */

const Theme = (() => {
  let current = 'dark';

  function apply(theme) {
    current = theme;
    document.body.classList.toggle('light', theme === 'light');

    // Sync sidebar toggle label + icon
    const sidebarToggle = document.getElementById('themeToggle');
    if (sidebarToggle) {
      const icon = sidebarToggle.querySelector('i');
      const label = sidebarToggle.querySelector('span');
      if (theme === 'light') {
        icon.className = 'fa-solid fa-sun';
        label.textContent = 'Light Mode';
      } else {
        icon.className = 'fa-solid fa-moon';
        label.textContent = 'Dark Mode';
      }
    }

    // Sync topbar quick toggle icon
    const darkModeBtn = document.getElementById('darkModeBtn');
    if (darkModeBtn) {
      darkModeBtn.querySelector('i').className =
        theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-circle-half-stroke';
    }

    // Sync settings page switch
    const settingsSwitch = document.getElementById('settingsThemeSwitch');
    if (settingsSwitch) settingsSwitch.checked = theme === 'dark';
  }

  function toggle() {
    const next = current === 'dark' ? 'light' : 'dark';
    apply(next);
    persist();
    return next;
  }

  function persist() {
    const settings = Storage.loadSettings();
    settings.theme = current;
    Storage.saveSettings(settings);
  }

  function init() {
    const settings = Storage.loadSettings();
    apply(settings.theme || 'dark');
  }

  function get() {
    return current;
  }

  return { init, apply, toggle, get };
})();
