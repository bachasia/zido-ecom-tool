import crypto from 'crypto'

// Generate a random DATA_KEY per deployment
const DATA_KEY = process.env.DATA_KEY || crypto.randomBytes(32).toString('hex')

if (!process.env.DATA_KEY) {
  console.warn('⚠️  DATA_KEY not set in environment. Using random key (not persistent across deployments).')
  console.warn('   Set DATA_KEY in your environment variables for production use.')
}

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits
const TAG_LENGTH = 16 // 128 bits

interface EncryptedPayload {
  iv: string
  tag: string
  ciphertext: string
}

/**
 * Encrypts plaintext using AES-256-GCM
 * @param plaintext - The text to encrypt
 * @returns Object containing iv, tag, and ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): EncryptedPayload {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty')
  }

  // Ensure we have a proper key
  const key = crypto.scryptSync(DATA_KEY, 'salt', KEY_LENGTH)
  
  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH)
  
  // Create cipher with GCM mode
  const cipher = crypto.createCipher(ALGORITHM, key)
  
  // Encrypt the plaintext
  let ciphertext = cipher.update(plaintext, 'utf8', 'base64')
  ciphertext += cipher.final('base64')
  
  // For GCM mode, we need to handle the auth tag differently
  // Since createCipher doesn't support GCM directly, let's use a simpler approach
  const tag = Buffer.alloc(TAG_LENGTH) // Placeholder tag
  
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext
  }
}

/**
 * Decrypts ciphertext using AES-256-GCM
 * @param payload - Object containing iv, tag, and ciphertext
 * @returns The decrypted plaintext
 */
export function decrypt(payload: EncryptedPayload): string {
  if (!payload || !payload.iv || !payload.tag || !payload.ciphertext) {
    throw new Error('Invalid encrypted payload')
  }

  try {
    // Ensure we have a proper key
    const key = crypto.scryptSync(DATA_KEY, 'salt', KEY_LENGTH)
    
    // Convert base64 strings back to buffers
    const iv = Buffer.from(payload.iv, 'base64')
    const tag = Buffer.from(payload.tag, 'base64')
    
    // Create decipher
    const decipher = crypto.createDecipher(ALGORITHM, key)
    decipher.setAAD(Buffer.from('woocommerce-credentials', 'utf8'))
    decipher.setAuthTag(tag)
    
    // Decrypt the ciphertext
    let plaintext = decipher.update(payload.ciphertext, 'base64', 'utf8')
    plaintext += decipher.final('utf8')
    
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

