/**
 * Krypteringshjälp för patientdata (telefonnummer)
 * 
 * Använder AES-256-CBC för reversibel kryptering.
 * Telefonnummer krypteras vid inmatning och dekrypteras vid SMS-utskick.
 */

import crypto from 'crypto';

// Hämta krypteringsnyckel från miljövariabel
// I produktion: sätt POOL_ENCRYPTION_KEY till en säker 32-byte nyckel
const ENCRYPTION_KEY = import.meta.env.POOL_ENCRYPTION_KEY || 'default-dev-key-32-bytes-long!!';
const SALT = 'kort-varsel-salt';

/**
 * Kryptera en textsträng (t.ex. telefonnummer)
 * Returnerar: "iv:krypteradData" (hex)
 */
export function kryptera(plaintext: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Dekryptera en krypterad sträng
 * Input: "iv:krypteradData" (hex)
 */
export function dekryptera(encryptedText: string): string {
  const [ivHex, encrypted] = encryptedText.split(':');
  
  if (!ivHex || !encrypted) {
    throw new Error('Ogiltig krypterad data');
  }
  
  const key = crypto.scryptSync(ENCRYPTION_KEY, SALT, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Maskera telefonnummer för visning
 * "+46701234567" → "070-1** ****"
 */
export function maskeraTelefon(telefon: string): string {
  const clean = telefon.replace(/^\+46/, '0').replace(/\D/g, '');
  if (clean.length >= 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 4)}** ****`;
  }
  return '***-*** ****';
}

/**
 * Formatera telefonnummer till internationellt format
 * "0701234567" → "+46701234567"
 */
export function formateraTelefon(telefon: string): string {
  let clean = telefon.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    return '+46' + clean.slice(1);
  } else if (clean.startsWith('46')) {
    return '+' + clean;
  }
  return '+46' + clean;
}
