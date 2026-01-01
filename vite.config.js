import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Tăng giới hạn cảnh báo lên 2000kB (2MB) để nó không báo vàng nữa
    chunkSizeWarningLimit: 2000, 
  },
})