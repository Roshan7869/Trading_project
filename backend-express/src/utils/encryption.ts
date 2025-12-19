/**
 * Encryption Service
 * Uses AES-256-GCM for secure encryption of sensitive data like API keys and secrets.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

// Get encryption key from environment (must be 32 bytes for AES-256)
const getEncryptionKey = (): string => {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    return key;
};

/**
 * Derives a key from password using PBKDF2
 */
const deriveKey = (password: string, salt: Buffer): Buffer => {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
};

/**
 * Encrypts a plaintext string
 * Returns: salt:iv:tag:ciphertext (all base64 encoded)
 */
export const encrypt = (plaintext: string): string => {
    if (!plaintext) return '';

    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = deriveKey(getEncryptionKey(), salt);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Combine all parts: salt:iv:tag:ciphertext
    return [
        salt.toString('base64'),
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted.toString('base64')
    ].join(':');
};

/**
 * Decrypts an encrypted string
 * Input format: salt:iv:tag:ciphertext (all base64 encoded)
 */
export const decrypt = (encryptedData: string): string => {
    if (!encryptedData) return '';

    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
        throw new Error('Invalid encrypted data format');
    }

    const [saltB64, ivB64, tagB64, ciphertextB64] = parts;

    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const key = deriveKey(getEncryptionKey(), salt);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
};

/**
 * Masks a string for display (shows first 4 and last 4 characters)
 */
export const maskSensitive = (value: string): string => {
    if (!value || value.length < 10) return '****';
    return `${value.substring(0, 4)}****${value.substring(value.length - 4)}`;
};

export default {
    encrypt,
    decrypt,
    maskSensitive
};
