import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.DASHBOARD_PORT),
    },
    define: {
      'import.meta.env.API_GATEWAY_PORT': JSON.stringify(env.API_GATEWAY_PORT || '8081')
    }
  }
})
