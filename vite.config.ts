import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Safe extraction of API key, ensuring fallback to empty string
  const apiKey = env.API_KEY || env.VITE_API_KEY || env.GEMINI_API_KEY || '';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      open: true
    },
    define: {
      // JSON.stringify is crucial here. It turns the value "123" into the string literal "\"123\""
      // so when Vite replaces it in the code, it becomes: const apiKey = "123";
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  }
})