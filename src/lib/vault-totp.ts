import { TOTP, Secret } from 'otpauth';

export function generateTOTPSecret(): { secret: string; uri: string } {
  const totp = new TOTP({
    issuer: 'Clawdbot Hub',
    label: 'Vault',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new Secret(),
  });
  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new TOTP({
    issuer: 'Clawdbot Hub',
    label: 'Vault',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  });
  // Allow 1 period window for clock drift
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}
