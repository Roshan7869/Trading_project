/**
 * EncryptionService
 * AES-256-GCM encryption/decryption compatible with Python data-engine.
 * Uses PBKDF2 key derivation with SHA-512.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SALT_LENGTH = 64;
const IV_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): string {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return key;
}

function deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * Output format: salt:iv:tag:ciphertext (base64 encoded, colon separated)
 */
export function encrypt(plaintext: string): string {
    if (!plaintext) return '';

    try {
        const salt = crypto.randomBytes(SALT_LENGTH);
        const iv = crypto.randomBytes(IV_LENGTH);
        const key = deriveKey(getEncryptionKey(), salt);

        const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });

        const encrypted = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final()
        ]);

        const tag = cipher.getAuthTag();

        return [
            salt.toString('base64'),
            iv.toString('base64'),
            tag.toString('base64'),
            encrypted.toString('base64')
        ].join(':');
    } catch (error: any) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Decrypts data encrypted by this service or the Python data-engine.
 * Expected format: salt:iv:tag:ciphertext (base64 encoded, colon separated)
 */
export function decrypt(encryptedData: string): string {
    if (!encryptedData) return '';

    try {
        const parts = encryptedData.split(':');
        if (parts.length !== 4) {
            throw new Error('Invalid encrypted data format');
        }

        const salt = Buffer.from(parts[0], 'base64');
        const iv = Buffer.from(parts[1], 'base64');
        const tag = Buffer.from(parts[2], 'base64');
        const ciphertext = Buffer.from(parts[3], 'base64');

        const key = deriveKey(getEncryptionKey(), salt);

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
            authTagLength: AUTH_TAG_LENGTH
        });
        decipher.setAuthTag(tag);

        const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    } catch (error: any) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Encrypts an object's sensitive fields.
 */
export function encryptCredentials(credentials: Record<string, any>): Record<string, any> {
    const SENSITIVE_FIELDS = [
        'apiSecret', 'pin', 'totpSecret', 'consumerSecret',
        'password', 'accessToken', 'MPIN', 'TOTP_SECRET',
        'API_PASSWORD', 'API_SECRET'
    ];

    const encrypted = { ...credentials };

    for (const field of SENSITIVE_FIELDS) {
        if (encrypted[field] && typeof encrypted[field] === 'string') {
            encrypted[field] = encrypt(encrypted[field]);
        }
    }

    return encrypted;
}

export default { encrypt, decrypt, encryptCredentials };
