/**
 * Lightweight structured logger for the AuraOne SDK.
 * Wraps console methods with a consistent "[AuraOne SDK]" prefix.
 * Only emits output when `enabled` is true (typically tied to ClientConfig.debug).
 */

export interface SDKLogger {
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, error?: unknown, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
}

const PREFIX = "[AuraOne SDK]";

class SDKLoggerImpl implements SDKLogger {
  private enabled: boolean;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  setEnabled(value: boolean): void {
    this.enabled = value;
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    if (context) {
      console.log(`${PREFIX} ${message}`, context);
    } else {
      console.log(`${PREFIX} ${message}`);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    if (context) {
      console.warn(`${PREFIX} ${message}`, context);
    } else {
      console.warn(`${PREFIX} ${message}`);
    }
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    // Errors are always emitted regardless of debug flag
    if (error && context) {
      console.error(`${PREFIX} ${message}`, error, context);
    } else if (error) {
      console.error(`${PREFIX} ${message}`, error);
    } else if (context) {
      console.error(`${PREFIX} ${message}`, context);
    } else {
      console.error(`${PREFIX} ${message}`);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.enabled) return;
    if (context) {
      console.log(`${PREFIX} [debug] ${message}`, context);
    } else {
      console.log(`${PREFIX} [debug] ${message}`);
    }
  }
}

/**
 * Create a new SDK logger instance.
 * @param enabled Whether logging is enabled (maps to ClientConfig.debug).
 */
export function createSDKLogger(enabled = false): SDKLoggerImpl {
  return new SDKLoggerImpl(enabled);
}

/** Default (disabled) logger instance for shared use. */
export const sdkLogger = new SDKLoggerImpl(false);
