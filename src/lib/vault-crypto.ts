/**
 * Vault Crypto — Client-side AES-256-GCM encryption via Web Crypto API
 * ZERO plaintext ever leaves the browser.
 */

const PBKDF2_ITERATIONS = 600_000;
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;

function toBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an AES-256-GCM key from a password + salt using PBKDF2
 */
export async function deriveKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext with a password. Returns base64-encoded encrypted value, IV, and salt.
 */
export async function encrypt(
  plaintext: string,
  password: string
): Promise<{ encrypted: string; iv: string; salt: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext)
  );

  return {
    encrypted: toBase64(encrypted),
    iv: toBase64(iv),
    salt: toBase64(salt),
  };
}

/**
 * Decrypt an encrypted value back to plaintext using the password.
 * Throws on wrong password (GCM auth tag verification fails).
 */
export async function decrypt(
  encrypted: string,
  iv: string,
  salt: string,
  password: string
): Promise<string> {
  const saltBytes = fromBase64(salt);
  const ivBytes = fromBase64(iv);
  const encBytes = fromBase64(encrypted);
  const key = await deriveKey(password, saltBytes);
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes.buffer as ArrayBuffer },
    key,
    encBytes.buffer as ArrayBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
