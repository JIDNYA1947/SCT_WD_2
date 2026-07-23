/* =========================================================
   storage.js — Local Storage persistence layer
   Handles auto-save, session restore & settings storage
========================================================= */

const Storage = (() => {
  const STATE_KEY = 'swpro_state_v1';
  const SETTINGS_KEY = 'swpro_settings_v1';

  const DEFAULT_SETTINGS = {
    theme: 'dark',
    autoSave: true,
    soundEffects: false,
    animations: true
  };

  /** Save the current stopwatch state (elapsed time + laps) */
  function saveState(state) {
    const settings = loadSettings();
    if (!settings.autoSave) return;
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn('StopWatch Pro: could not save state', err);
    }
  }

  /** Load a previously saved stopwatch state, or null if none exists */
  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('StopWatch Pro: could not load state', err);
      return null;
    }
  }

  function clearState() {
    localStorage.removeItem(STATE_KEY);
  }

  /** Save user settings (theme, auto-save, sound, animations) */
  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (err) {
      console.warn('StopWatch Pro: could not save settings', err);
    }
  }

  /** Load settings, falling back to defaults for any missing keys */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (err) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function resetSettings() {
    saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }

  return {
    saveState,
    loadState,
    clearState,
    saveSettings,
    loadSettings,
    resetSettings,
    DEFAULT_SETTINGS
  };
})();
