/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // 啟用靜態輸出
  basePath: '/piano-practice',  // 設定基礎路徑為倉庫名稱
  images: {
    unoptimized: true,  // GitHub Pages 不支援 Next.js 的圖片優化
  },
}

module.exports = nextConfig 