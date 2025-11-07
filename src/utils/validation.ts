export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email.trim()) {
    return { isValid: false, error: 'E-posta adresi gereklidir' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Geçerli bir e-posta adresi giriniz' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Şifre gereklidir' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Şifre en az 8 karakter olmalıdır' };
  }
  
  if (password.length > 50) {
    return { isValid: false, error: 'Şifre en fazla 50 karakter olmalıdır' };
  }
  
  // Şifre güçlülük kontrolü
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase) {
    return { isValid: false, error: 'Şifre en az bir büyük harf içermelidir' };
  }
  
  if (!hasLowerCase) {
    return { isValid: false, error: 'Şifre en az bir küçük harf içermelidir' };
  }
  
  if (!hasNumbers) {
    return { isValid: false, error: 'Şifre en az bir rakam içermelidir' };
  }
  
  if (!hasSpecialChar) {
    return { isValid: false, error: 'Şifre en az bir özel karakter içermelidir' };
  }
  
  return { isValid: true };
};

export const validateName = (name: string, fieldName: string = 'İsim'): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: `${fieldName} gereklidir` };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} en az 2 karakter olmalıdır` };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, error: `${fieldName} en fazla 50 karakter olmalıdır` };
  }
  
  return { isValid: true };
};

export const validateOptionalName = (name: string, fieldName: string = 'İsim'): ValidationResult => {
  // Boş string ise geçerli (opsiyonel)
  if (!name.trim()) {
    return { isValid: true };
  }
  
  if (name.trim().length < 2) {
    return { isValid: false, error: `${fieldName} en az 2 karakter olmalıdır` };
  }
  
  if (name.trim().length > 50) {
    return { isValid: false, error: `${fieldName} en fazla 50 karakter olmalıdır` };
  }
  
  return { isValid: true };
};

export const validateUsername = (username: string): ValidationResult => {
  if (!username.trim()) {
    return { isValid: false, error: 'Kullanıcı adı gereklidir' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Kullanıcı adı en az 3 karakter olmalıdır' };
  }
  
  if (username.length > 20) {
    return { isValid: false, error: 'Kullanıcı adı en fazla 20 karakter olmalıdır' };
  }
  
  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir' };
  }
  
  return { isValid: true };
};

export const validatePasswordMatch = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Şifre tekrarı gereklidir' };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Şifreler eşleşmiyor' };
  }
  
  return { isValid: true };
};

export const validateUrl = (url: string, fieldName: string = 'URL'): ValidationResult => {
  if (!url.trim()) {
    return { isValid: true }; // URL opsiyonel
  }
  
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: `Geçerli bir ${fieldName} giriniz` };
  }
};

export const validateMovieSelection = (movies: any[], minCount: number = 5): ValidationResult => {
  if (!Array.isArray(movies)) {
    return { isValid: false, error: 'Film listesi geçersiz' };
  }
  
  if (movies.length < minCount) {
    return { isValid: false, error: `En az ${minCount} film/dizi seçmelisiniz` };
  }
  
  return { isValid: true };
};
