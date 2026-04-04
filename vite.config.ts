import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
  },
})
