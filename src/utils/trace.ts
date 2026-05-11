function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomBytes(length: number): Uint8Array {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    const out = new Uint8Array(length);
    globalThis.crypto.getRandomValues(out);
    return out;
  }

  // Node fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const nodeCrypto = require('crypto') as typeof import('crypto');
  return nodeCrypto.randomBytes(length);
}

export function createTraceparent(): string {
  // W3C trace context: version(00)-trace-id(16 bytes)-parent-id(8 bytes)-flags(01)
  const traceId = hex(randomBytes(16));
  const spanId = hex(randomBytes(8));
  return `00-${traceId}-${spanId}-01`;
}

export function traceHeaders(): Record<string, string> {
  const enabled =
    process.env.OTEL_DISABLED === 'true'
      ? false
      : process.env.OTEL_ENABLED === 'true' || (process.env.NODE_ENV ?? 'development') === 'production';

  if (!enabled) return {};

  return {
    traceparent: createTraceparent(),
  };
}
