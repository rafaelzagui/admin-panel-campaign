import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

type ProxyServer = {
  on(event: 'proxyReq', callback: (proxyReq: { setHeader: (name: string, value: string) => void }) => void): void
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const campaignApiTarget = env.CAMPAIGN_API_PROXY_TARGET || 'http://localhost:3000'
  const dispatchApiTarget = env.DISPATCH_API_PROXY_TARGET || 'http://localhost:3002'
  const governanceSecret = env.GOVERNANCE_API_SECRET || ''

  const governanceProxy = (governancePath: string) => ({
    target: dispatchApiTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/admin\/[^/]+/, `/api/governance/${governancePath}`),
    configure: (proxy: ProxyServer) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (governanceSecret) proxyReq.setHeader('x-governance-secret', governanceSecret)
      })
    },
  })

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
        '/api/admin/dispatch-config': governanceProxy('dispatch-config'),
        '/api/admin/dispatch-targets': governanceProxy('dispatch-targets'),
        '/api/admin/categories': governanceProxy('categories'),
        '/api/admin/governance-rules': governanceProxy('rules'),
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
