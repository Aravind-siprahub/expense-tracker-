import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  clean: true,
  // @repo/db and @repo/validators are TypeScript source packages, so plain `node` cannot load them
  // at runtime. Bundle them into dist/index.js; real npm packages (express, prisma...) stay external.
  noExternal: [/^@repo\//],
  // Prisma loads its generated client and native engine from node_modules, so it must not be bundled.
  external: ['@prisma/client', '.prisma/client'],
});
