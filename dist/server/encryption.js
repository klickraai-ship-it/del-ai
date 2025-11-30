import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DEV_KEY_FILE = path.join(process.cwd(), '.encryption-key-dev');
let developmentKey = null;
function loadOrGenerateDevelopmentKey() {
    try {
        if (fs.existsSync(DEV_KEY_FILE)) {
            const key = fs.readFileSync(DEV_KEY_FILE, 'utf8').trim();
            if (key.length >= 32) {
                console.log('✅ Loaded persistent development encryption key from .encryption-key-dev');
                return key;
            }
        }
    }
    catch (error) {
        console.warn('⚠️  Could not read development encryption key file:', error);
    }
    const newKey = generateEncryptionKey();
    try {
        fs.writeFileSync(DEV_KEY_FILE, newKey, { mode: 0o600 });
        console.log('✅ Generated and saved new development encryption key to .encryption-key-dev');
        console.warn('⚠️  IMPORTANT: Do not commit .encryption-key-dev to version control!');
        console.warn('⚠️  Set ENCRYPTION_KEY environment variable in production.');
    }
    catch (error) {
        console.error('❌ Failed to save development encryption key:', error);
        console.warn('⚠️  Using temporary key - encrypted data will be lost on restart!');
    }
    return newKey;
}
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('ENCRYPTION_KEY environment variable is not set. This is required in production for encrypting sensitive data.');
        }
        if (!developmentKey) {
            developmentKey = loadOrGenerateDevelopmentKey();
        }
        return developmentKey;
    }
    if (key.length < 32) {
        throw new Error('ENCRYPTION_KEY must be at least 32 characters long for security.');
    }
    return key;
}
function deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
}
export function encrypt(plaintext) {
    if (!plaintext) {
        throw new Error('Cannot encrypt empty value');
    }
    const password = getEncryptionKey();
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(password, salt);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    const result = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
    ]);
    return result.toString('base64');
}
export function decrypt(ciphertext) {
    if (!ciphertext) {
        throw new Error('Cannot decrypt empty value');
    }
    const password = getEncryptionKey();
    const buffer = Buffer.from(ciphertext, 'base64');
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const key = deriveKey(password, salt);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
export function encryptObject(obj) {
    const encrypted = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'string' && value.length > 0) {
            encrypted[key] = encrypt(value);
        }
        else {
            encrypted[key] = value;
        }
    }
    return encrypted;
}
export function decryptObject(obj) {
    const decrypted = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value && typeof value === 'string' && value.length > 0) {
            try {
                decrypted[key] = decrypt(value);
            }
            catch (error) {
                decrypted[key] = value;
            }
        }
        else {
            decrypted[key] = value;
        }
    }
    return decrypted;
}
export function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('base64');
}
