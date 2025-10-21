import crypto from 'crypto'

// Generate a random DATA_KEY per deployment
const DATA_KEY = process.env.DATA_KEY || crypto.randomBytes(32).toString('hex')

if (!process.env.DATA_KEY) {
  console.warn('⚠️  DATA_KEY not set in environment. Using random key (not persistent across deployments).')
  console.warn('   Set DATA_KEY in your environment variables for production use.')
}

const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits

interface EncryptedPayload {
  iv: string
  tag: string
  ciphertext: string
}

/**
 * Encrypts plaintext using AES-256-CBC
 * @param plaintext - The text to encrypt
 * @returns Object containing iv, tag, and ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): EncryptedPayload {
  // Allow empty strings for placeholder encryption (e.g., DB-only mode)
  const textToEncrypt = plaintext || '__EMPTY__'

  // Derive a proper key from DATA_KEY
  const key = crypto.scryptSync(DATA_KEY, 'salt', KEY_LENGTH)
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Create cipher with explicit IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  // Encrypt the plaintext
  let ciphertext = cipher.update(textToEncrypt, 'utf8', 'base64')
  ciphertext += cipher.final('base64')
  
  // For CBC mode, we don't have an auth tag, so we'll use a placeholder
  const tag = Buffer.alloc(16).toString('base64')
  
  return {
    iv: iv.toString('base64'),
    tag: tag,
    ciphertext
  }
}

/**
 * Decrypts ciphertext using AES-256-CBC
 * @param payload - Object containing iv, tag, and ciphertext
 * @returns The decrypted plaintext
 */
export function decrypt(payload: EncryptedPayload): string {
  if (!payload || !payload.iv || !payload.ciphertext) {
    throw new Error('Invalid encrypted payload')
  }

  try {
    // Derive the same key from DATA_KEY
    const key = crypto.scryptSync(DATA_KEY, 'salt', KEY_LENGTH)
    
    // Convert base64 IV back to buffer
    const iv = Buffer.from(payload.iv, 'base64')
    
    // Create decipher with explicit IV
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    // Decrypt the ciphertext
    let plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8')
    plaintext += decipher.final('utf8')
    
    // Handle placeholder for empty encrypted values (DB-only mode)
    if (plaintext === '__EMPTY__') {
      return ''
    }
    
    return plaintext
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generates a new random DATA_KEY for environment setup
 * @returns A random 32-byte hex string suitable for DATA_KEY
 */
export function generateDataKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Validates that the current DATA_KEY is properly configured
 * @returns True if DATA_KEY is set in environment, false otherwise
 */
export function isDataKeyConfigured(): boolean {
  return !!process.env.DATA_KEY
}
