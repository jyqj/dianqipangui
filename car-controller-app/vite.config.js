import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

// 本项目采用 HBuilderX 常见的扁平目录结构（App.vue/pages.json/manifest.json 在根目录）。
// 新版 vite-plugin-uni 默认读取 src/，这里显式指定输入目录，保证 CLI 构建可复现。
process.env.UNI_INPUT_DIR = projectRoot
process.env.UNI_OUTPUT_DIR = fileURLToPath(new URL('./dist', import.meta.url))

export default defineConfig({
  plugins: [uni()],
})
