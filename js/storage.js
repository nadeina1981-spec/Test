// storage.js - Local storage management
// Version: 14 (Fixed & Optimized)

window.Storage = (function() {
  const KEY = "mws-math-trainer";

  /**
   * Save user settings to localStorage
   * @param {Object} settings - Settings object (level, mode, series, lang)
   */
  function saveSettings(settings) {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      data.settings = settings;
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }

  /**
   * Load user settings from localStorage
   * @returns {Object|null} Settings object or null if not found
   */
  function loadSettings() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      return data.settings || null;
    } catch (e) {
      console.error("Error loading settings:", e);
      return null;
    }
  }

  /**
   * Log a result (correct/incorrect answer)
   * @param {Object} entry - Result entry with ok, task, value, ts
   */
  function logResult(entry) {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      data.log = data.log || [];
      data.log.push({
        ...entry,
        ts: Date.now()
      });
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error logging result:", e);
    }
  }

  /**
   * Export all data as JSON string
   * @returns {string} JSON string with all data
   */
  function exportJSON() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      return JSON.stringify(data, null, 2);
    } catch (e) {
      console.error("Error exporting data:", e);
      return "{}";
    }
  }

  /**
   * Clear all stored data
   */
  function clearAll() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      console.error("Error clearing data:", e);
    }
  }

  /**
   * Get statistics from logs
   * @returns {Object} Statistics object
   */
  function getStats() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || "{}");
      const log = data.log || [];
      
      return {
        total: log.length,
        correct: log.filter(e => e.ok).length,
        wrong: log.filter(e => !e.ok).length,
        accuracy: log.length > 0 ? (log.filter(e => e.ok).length / log.length * 100).toFixed(1) : 0
      };
    } catch (e) {
      console.error("Error getting stats:", e);
      return { total: 0, correct: 0, wrong: 0, accuracy: 0 };
    }
  }

  return { 
    saveSettings, 
    loadSettings, 
    logResult, 
    exportJSON,
    clearAll,
    getStats
  };
})();