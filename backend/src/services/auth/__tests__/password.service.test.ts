import { PasswordService } from '../password.service';

describe('PasswordService', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123';
      const hash = await PasswordService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123';
      const hash1 = await PasswordService.hashPassword(password);
      const hash2 = await PasswordService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123';
      const hash = await PasswordService.hashPassword(password);
      
      const isValid = await PasswordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await PasswordService.hashPassword(password);
      
      const isValid = await PasswordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('Property: Password hashing is one-way', () => {
    it('should not be possible to reverse hash to original password', async () => {
      const password = 'TestPassword123';
      const hash = await PasswordService.hashPassword(password);
      
      // Hash should not contain the original password
      expect(hash).not.toContain(password);
      expect(hash).not.toBe(password);
      
      // Verifying with hash as password should fail
      const canReverseHash = await PasswordService.verifyPassword(hash, hash);
      expect(canReverseHash).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = PasswordService.validatePasswordStrength('StrongPass123');
      expect(result.valid).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = PasswordService.validatePasswordStrength('Short1');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = PasswordService.validatePasswordStrength('lowercase123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('uppercase');
    });

    it('should reject password without lowercase', () => {
      const result = PasswordService.validatePasswordStrength('UPPERCASE123');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('lowercase');
    });

    it('should reject password without number', () => {
      const result = PasswordService.validatePasswordStrength('NoNumbers');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('number');
    });
  });
});
