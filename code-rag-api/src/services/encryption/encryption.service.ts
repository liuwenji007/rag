import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly tagPosition = this.saltLength + this.ivLength;
  private readonly encryptedPosition = this.tagPosition + this.tagLength;

  private getKey(): Buffer {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }
    // 使用 SHA-256 哈希确保密钥长度为 32 字节
    return crypto.createHash('sha256').update(encryptionKey).digest();
  }

  /**
   * 加密敏感信息
   */
  encrypt(text: string): string {
    if (!text) {
      return text;
    }

    const key = this.getKey();
    const iv = crypto.randomBytes(this.ivLength);
    const salt = crypto.randomBytes(this.saltLength);

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // 组合：salt + iv + tag + encrypted
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]).toString('base64');

    return result;
  }

  /**
   * 解密敏感信息
   */
  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      return encryptedText;
    }

    try {
      const key = this.getKey();
      const data = Buffer.from(encryptedText, 'base64');

      const salt = data.subarray(0, this.saltLength);
      const iv = data.subarray(this.saltLength, this.tagPosition);
      const tag = data.subarray(this.tagPosition, this.encryptedPosition);
      const encrypted = data.subarray(this.encryptedPosition);

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Decryption failed: ${message}`);
    }
  }
}

