import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['lib/**/*.test.js'],
        exclude: ['node_modules/**', '.next/**'],
    },
    resolve: {
        alias: {
            '@': __dirname,
        },
    },
});
