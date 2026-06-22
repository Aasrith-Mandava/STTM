import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', '')
  
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Make env variables available at build time
      __APP_ENV__: JSON.stringify(env.VITE_ENV),
    },
    server: {
      port: 5173,
    },
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
    },
  }
})
