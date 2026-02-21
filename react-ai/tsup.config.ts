import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    react: '../bridge/src/index.ts',
    server: '../server/src/index.ts',
    scanner: '../scanner/src/index.ts',
    sdk: '../sdk/src/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  tsconfig: './tsconfig.json',
  external: ['react', 'react-dom'],
})
