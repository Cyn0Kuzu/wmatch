// jest.config.js

module.exports = {
  // React Native için varsayılan preset'i kullan
  preset: 'react-native',

  // Proje kök dizini
  rootDir: '.',

  // Test ortamını ayarla
  testEnvironment: 'node',

  // Jest'in hangi dosyalarda test arayacağını belirleyen desenler
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  // TypeScript dosyalarını (`.ts` ve `.tsx`) işlemek için `ts-jest` kullan
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  // Modül ve dosya uzantıları
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test kurulum dosyaları
  // Her test çalışmadan önce bu dosyalar çalıştırılır
  setupFilesAfterEnv: [
    '<rootDir>/jest-setup.js', // Örneğin, react-native-testing-library için ek ayarlar
  ],

  // Mock'lanacak modüller
  // Örneğin, stil dosyaları veya resimler gibi test ortamında çalışmayan dosyalar
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '\\.(css|less)$': '<rootDir>/__mocks__/styleMock.js',
  },

  // Kod kapsamı (coverage) raporlamasını etkinleştir
  collectCoverage: true,

  // Kapsam raporlarının nereye oluşturulacağı
  coverageDirectory: 'coverage',

  // Hangi dosyalardan kapsam bilgisi toplanacağı
  // Sadece `src` dizinindeki dosyaları dahil et, `node_modules` veya test dosyalarını hariç tut
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],

  // TypeScript için ts-jest ayarları
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json', // Test için ayrı bir tsconfig kullanmak iyi bir pratiktir
    },
  },
};
