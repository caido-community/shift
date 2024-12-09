/**
 * Centralized logging utility that only logs in development mode
 */
const logger = {
  /**
   * Checks if we're in development mode
   */
  isDev: () => window.name.includes("devlog"),

  /**
   * Log info messages
   * @param {...any} args - Arguments to log
   */
  log: (...args) => {
    if (logger.isDev()) {
      console.log("[Shift Plugin]", ...args);
    }
  },

  /**
   * Log warning messages
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (logger.isDev()) {
      console.warn("[Shift Plugin]", ...args);
    }
  },

  /**
   * Log error messages
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    if (logger.isDev()) {
      console.error("[Shift Plugin]", ...args);
    }
  },

  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (logger.isDev()) {
      console.debug("[Shift Plugin]", ...args);
    }
  }
};

export default logger; 