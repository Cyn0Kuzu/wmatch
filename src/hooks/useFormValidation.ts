import { useState, useCallback } from 'react';
import * as yup from 'yup';

interface ValidationError {
  field: string;
  message: string;
}

interface UseFormValidationProps<T> {
  initialValues: T;
  validationSchema: yup.ObjectSchema<any>;
  onSubmit: (values: T) => void | Promise<void>;
}

export const useFormValidation = <T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormValidationProps<T>) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  }, [errors]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field as string]: true }));
  }, []);

  const validateField = useCallback(async (field: keyof T) => {
    try {
      await validationSchema.validateAt(field as string, values);
      setErrors(prev => ({ ...prev, [field as string]: '' }));
      return true;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        setErrors(prev => ({ ...prev, [field as string]: error.message }));
        return false;
      }
      return false;
    }
  }, [validationSchema, values]);

  const validateForm = useCallback(async () => {
    try {
      await validationSchema.validate(values, { abortEarly: false });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        error.inner.forEach((err) => {
          if (err.path) {
            newErrors[err.path] = err.message;
          }
        });
        setErrors(newErrors);
        return false;
      }
      return false;
    }
  }, [validationSchema, values]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    setIsSubmitting(true);
    
    const isValid = await validateForm();
    if (isValid) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      }
    }
    
    setIsSubmitting(false);
  }, [validateForm, onSubmit, values]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }));
  }, []);

  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field],
    onChangeText: (text: string) => handleChange(field, text),
    onBlur: () => handleBlur(field),
    error: touched[field as string] ? errors[field as string] : undefined,
  }), [values, handleChange, handleBlur, touched, errors]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    validateField,
    validateForm,
    resetForm,
    setFieldValue,
    setFieldError,
    getFieldProps,
    isValid: Object.keys(errors).length === 0,
    isDirty: JSON.stringify(values) !== JSON.stringify(initialValues),
  };
};

// Common validation schemas
export const validationSchemas = {
  email: yup.string()
    .email('Geçerli bir e-posta adresi girin')
    .required('E-posta adresi gereklidir'),
    
  password: yup.string()
    .min(6, 'Şifre en az 6 karakter olmalıdır')
    .required('Şifre gereklidir'),
    
  confirmPassword: yup.string()
    .oneOf([yup.ref('password')], 'Şifreler eşleşmiyor')
    .required('Şifre tekrarı gereklidir'),
    
  username: yup.string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalıdır')
    .max(20, 'Kullanıcı adı en fazla 20 karakter olabilir')
    .matches(/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir')
    .required('Kullanıcı adı gereklidir'),
    
  firstName: yup.string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(50, 'Ad en fazla 50 karakter olabilir')
    .required('Ad gereklidir'),
    
  lastName: yup.string()
    .min(2, 'Soyad en az 2 karakter olmalıdır')
    .max(50, 'Soyad en fazla 50 karakter olabilir')
    .required('Soyad gereklidir'),
    
  age: yup.number()
    .min(13, 'Yaş en az 13 olmalıdır')
    .max(120, 'Geçerli bir yaş girin')
    .required('Yaş gereklidir'),
    
  bio: yup.string()
    .max(500, 'Biyografi en fazla 500 karakter olabilir'),
    
  location: yup.string()
    .max(100, 'Konum en fazla 100 karakter olabilir'),
};


