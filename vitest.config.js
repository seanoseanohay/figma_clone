import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for faster DOM simulation (alternative to jsdom)
    environment: 'happy-dom',
    
    // Enable global test APIs (describe, it, expect, etc.)
    globals: true,
    
    // Setup files to run before each test file
    setupFiles: ['./src/test/setup.js'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '*.config.js',
        'dist/',
        'functions/',
        'docs/',
        'notes/',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
        statements: 75,
      },
    },
    
    // Test file patterns
    include: ['**/*.{test,spec}.{js,jsx}'],
    
    // Parallel test execution
    threads: true,
    
    // Test timeout (30 seconds)
    testTimeout: 30000,
    
    // Mock reset behavior
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@test': path.resolve(__dirname, './src/test'),
    },
  },
});

