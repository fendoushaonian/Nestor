import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    setupFiles: ['reflect-metadata'],
  },
  // SWC 转译以支持 emitDecoratorMetadata (TypeORM/Nest 装饰器需要)
  plugins: [swc.vite()],
});
