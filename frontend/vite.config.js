import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // libraries change less often than app code, so they get their own long-cached files
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            // socket.io is left out so it stays with the client pages that use it
            { name: 'vendor', test: /node_modules[\\/](?!socket\.io|engine\.io|@socket\.io)/ },
          ],
        },
      },
    },
  },
})
