// Bu dosya, projenin ana test dizinine (`__tests__/utils/`) yerleştirilmelidir.
// Örnek olarak burada sunulmuştur.

// Import edilecek fonksiyonlar (yolun doğru olduğunu varsayarak)
import { validateEmail } from '../../src/utils/validation';

describe('validation.ts - Email Validation', () => {

  // ===================================
  // Test Senaryosu 1: Geçerli E-posta Adresleri
  // ===================================
  test('should return valid for a standard email address', () => {
    const result = validateEmail('test@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('should return valid for an email with a subdomain', () => {
    const result = validateEmail('test@sub.example.com');
    expect(result.isValid).toBe(true);
  });

  test('should return valid for an email with numbers', () => {
    const result = validateEmail('test123@example.co.uk');
    expect(result.isValid).toBe(true);
  });

  test('should return valid for an email with a plus alias', () => {
    const result = validateEmail('test+alias@example.com');
    expect(result.isValid).toBe(true);
  });

  // ===================================
  // Test Senaryosu 2: Geçersiz E-posta Adresleri
  // ===================================
  test('should return invalid for an email without @ symbol', () => {
    const result = validateEmail('testexample.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Geçerli bir e-posta adresi girin');
  });

  test('should return invalid for an email without a domain', () => {
    const result = validateEmail('test@');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Geçerli bir e-posta adresi girin');
  });

  test('should return invalid for an email with spaces', () => {
    const result = validateEmail('test @example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Geçerli bir e-posta adresi girin');
  });

  test('should return invalid for an email with multiple @ symbols', () => {
    const result = validateEmail('test@@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Geçerli bir e-posta adresi girin');
  });

  test('should return invalid for an email ending with a dot', () => {
    const result = validateEmail('test@example.com.');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Geçerli bir e-posta adresi girin');
  });


  // ===================================
  // Test Senaryosu 3: Kenar Durumlar (Edge Cases)
  // ===================================
  test('should return invalid for an empty string', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('E-posta adresi boş bırakılamaz');
  });

  test('should return invalid for a string with only spaces', () => {
    const result = validateEmail('   ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('E-posta adresi boş bırakılamaz');
  });
});
