import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use Node.js environment for language server tests
    environment: 'node',
    
    // Test files pattern - only GVariant validation
    include: ['src/gvariant-validation.test.ts'],
    
    // Timeout settings (language server operations can take time)
    testTimeout: 240000, // 4 minutes per test
    hookTimeout: 240000,
    
    // Global setup
    globals: true,
    
    // Use threads pool with single thread to avoid worker communication issues
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: false, // Reduce isolation overhead
      }
    },
    
    // Reduce concurrency to avoid resource conflicts
    maxConcurrency: 1,
  }
}); 