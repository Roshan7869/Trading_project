
import os
import base64
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from logzero import logger

ALGORITHM = 'aes-256-gcm'
SALT_LENGTH = 64
IV_LENGTH = 12  # AESGCM standard IV length is 12 bytes (96 bits), but backend used 16?
# Wait, backend code said: const IV_LENGTH = 16;
# Node's crypto.createCipheriv('aes-256-gcm', key, iv) accepts 16 bytes?
# Standard GCM IV is 12 bytes. Node allows others but 12 is recommended.
# However, if backend sends 16 bytes, we must use 16 bytes.
# Python cryptography AESGCM expects 12 bytes usually, but let's see.
# Actually, AESGCM in cryptography library strictly enforces 12 bytes (96 bits) for security?
# Let's check docs or be careful. 
# If backend used 16 bytes IV, we might have a problem if python library handles it differently.
# Node.js 'aes-256-gcm' supports other IV lengths. 
# Python `cryptography.hazmat.primitives.ciphers.modes.GCM` supports other lengths if using `Cipher` class instead of `AESGCM` helper.

KEY_LENGTH = 32
ITERATIONS = 100000

def get_encryption_key() -> bytes:
    key = os.getenv('ENCRYPTION_KEY')
    if not key:
        raise ValueError('ENCRYPTION_KEY environment variable is required')
    return key.encode('utf-8')

def derive_key(password: bytes, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA512(),
        length=KEY_LENGTH,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password)

def decrypt(encrypted_data: str) -> str:
    """
    Decrypts data encrypted by the Node.js backend.
    Format: salt:iv:tag:ciphertext (base64 encoded)
    """
    if not encrypted_data:
        return ""

    try:
        parts = encrypted_data.split(':')
        if len(parts) != 4:
            raise ValueError('Invalid encrypted data format')

        salt = base64.b64decode(parts[0])
        iv = base64.b64decode(parts[1])
        tag = base64.b64decode(parts[2])
        ciphertext = base64.b64decode(parts[3])

        key = derive_key(get_encryption_key(), salt)

        # Use Cipher class to support non-standard IV length (16 bytes) if needed
        # Backend uses 16 bytes IV.
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend

        # Construct the GCM tag which is appended to ciphertext in some implementations, 
        # but Node crypto.createCipheriv + getAuthTag separates them.
        # Python cryptography GCM mode takes tag as argument to finalize.
        
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(iv, tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        
        # GCM decryption
        decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()
        
        return decrypted_data.decode('utf-8')

    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return ""

def encrypt(plaintext: str) -> str:
    """
    Encrypts data compatible with Node.js backend.
    """
    if not plaintext:
        return ""
        
    try:
        salt = os.urandom(SALT_LENGTH)
        iv = os.urandom(16) # Match backend's 16 bytes
        
        key_bytes = derive_key(get_encryption_key(), salt)
        
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        
        cipher = Cipher(
            algorithms.AES(key_bytes),
            modes.GCM(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        
        ciphertext = encryptor.update(plaintext.encode('utf-8')) + encryptor.finalize()
        tag = encryptor.tag
        
        return ":".join([
            base64.b64encode(salt).decode('utf-8'),
            base64.b64encode(iv).decode('utf-8'),
            base64.b64encode(tag).decode('utf-8'),
            base64.b64encode(ciphertext).decode('utf-8')
        ])
        
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return ""
