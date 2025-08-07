import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node.js environment for language server tests
    environment: 'node',
    
    // Test files pattern
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    
    // Timeout settings (language server operations can take time)
    testTimeout: 30000,
    hookTimeout: 30000,
    
    // Global setup
    globals: true,
  }
}); 