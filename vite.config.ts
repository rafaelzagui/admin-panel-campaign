import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const campaignApiTarget = env.CAMPAIGN_API_PROXY_TARGET || 'http://localhost:3000'
  const dispatchApiTarget = env.DISPATCH_API_PROXY_TARGET || 'http://localhost:3002'

  return {
    plugins: [
      tailwindcss(),
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      proxy: {
        '/api': {
          target: campaignApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/dispatch-api': {
          target: dispatchApiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/dispatch-api/, '/api'),
        },
      },
    },
  }
})
