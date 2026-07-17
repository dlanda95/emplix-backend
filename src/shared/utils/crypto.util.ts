import { randomBytes } from 'crypto';

// Caracteres excluidos: 0, O, 1, l, I — confusión visual en tipografías sans-serif
const CHARSET_UPPER   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const CHARSET_LOWER   = 'abcdefghjkmnpqrstuvwxyz';
const CHARSET_DIGITS  = '23456789';
const CHARSET_SYMBOLS = '@#$%&!';
const CHARSET_ALL     = CHARSET_UPPER + CHARSET_LOWER + CHARSET_DIGITS + CHARSET_SYMBOLS;

/**
 * Genera una contraseña criptográficamente segura de `length` caracteres.
 * Garantiza al menos un carácter de cada grupo (mayúscula, minúscula, dígito, símbolo).
 * Usa Fisher-Yates shuffle con bytes de crypto.randomBytes.
 */
export function generateSecurePassword(length = 12): string {
  const bytes = randomBytes(length + 8);

  const chars: string[] = [
    CHARSET_UPPER  [bytes[0] % CHARSET_UPPER.length],
    CHARSET_LOWER  [bytes[1] % CHARSET_LOWER.length],
    CHARSET_DIGITS [bytes[2] % CHARSET_DIGITS.length],
    CHARSET_SYMBOLS[bytes[3] % CHARSET_SYMBOLS.length],
  ];

  for (let i = 4; i < length; i++) {
    chars.push(CHARSET_ALL[bytes[i] % CHARSET_ALL.length]);
  }

  const shuffleBytes = randomBytes(length);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
