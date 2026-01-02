import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Tự động cập nhật khi bạn sửa code
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Azota Ultra Cyberpunk', // Tên đầy đủ
        short_name: 'Azota Ultra', // Tên hiện dưới icon
        description: 'Ứng dụng luyện thi trắc nghiệm phong cách tương lai',
        theme_color: '#0f172a', // Màu thanh trạng thái (Trùng màu nền Cyberpunk)
        background_color: '#0f172a', // Màu nền lúc khởi động
        display: 'standalone', // Chế độ toàn màn hình (như App xịn)
        scope: '/',
        start_url: '/',
        orientation: 'portrait', // Khóa màn hình dọc
        icons: [
          {
            src: 'pwa-192x192.png', // Icon nhỏ
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Icon lớn
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Icon bo tròn cho Android mới
          }
        ]
      }
    })
  ],
})