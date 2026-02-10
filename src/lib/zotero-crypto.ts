/**
 * Kryptering för Zotero API-nycklar
 * 
 * Använder AES-256-GCM för säker kryptering av API-nycklar.
 * Nycklar lagras aldrig i klartext - endast krypterad form sparas i databasen.
 * 
 * Säkerhetsmodell:
 * - Master key från miljövariabel (ZOTERO_ENCRYPTION_KEY)
 * - User ID som salt för unik nyckel per användare
 * - AES-256-GCM med autentiserad kryptering
 */

import crypto from 'crypto';

// Master encryption key från miljövariabel
// I produktion: sätt ZOTERO_ENCRYPTION_KEY till en säker 32+ tecken nyckel
const MASTER_KEY = import.meta.env.ZOTERO_ENCRYPTION_KEY || 'zotero-dev-key-change-in-prod!!';

// Algorithm constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits

/**
 * Derivera en unik nyckel för varje användare
 * Använder PBKDF2 med user_id som salt
 */
function deriveKey(userId: string): Buffer {
  return crypto.pbkdf2Sync(
    MASTER_KEY,
    `zotero-salt-${userId}`,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Kryptera en Zotero API-nyckel
 * 
 * @param apiKey - API-nyckeln i klartext
 * @param userId - Användarens ID (används som salt)
 * @returns Krypterad sträng i format: "iv:authTag:encryptedData" (hex)
 */
export function encryptApiKey(apiKey: string, userId: string): string {
  if (!apiKey || !userId) {
    throw new Error('API-nyckel och användar-ID krävs för kryptering');
  }

  const key = deriveKey(userId);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Dekryptera en Zotero API-nyckel
 * 
 * @param encryptedData - Krypterad sträng från encryptApiKey
 * @param userId - Användarens ID (måste matcha vid kryptering)
 * @returns API-nyckeln i klartext
 */
export function decryptApiKey(encryptedData: string, userId: string): string {
  if (!encryptedData || !userId) {
    throw new Error('Krypterad data och användar-ID krävs för dekryptering');
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Ogiltig krypterad dataformat');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  
  const key = deriveKey(userId);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Validera att en API-nyckel har rätt format
 * Zotero API-nycklar är 24 tecken alfanumeriska
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  // Zotero API keys are 24 alphanumeric characters
  return /^[a-zA-Z0-9]{24}$/.test(apiKey);
}

/**
 * Maskera API-nyckel för säker visning
 * "abcdefghijklmnopqrstuvwx" → "abcd...uvwx"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) {
    return '****';
  }
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

/**
 * Generera en säker session-token för temporär lagring
 * Används för session-baserad API-nyckelhantering (MVP)
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash en session-token för säker jämförelse
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
