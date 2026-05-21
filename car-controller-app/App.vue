<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useConnectionStore } from './stores/connectionStore'

onLaunch(() => {
  console.log('[App] onLaunch')
  const connStore = useConnectionStore()
  connStore.loadSettings()
})

onShow(() => {
  console.log('[App] onShow')
})

onHide(() => {
  console.log('[App] onHide')
})
</script>

<style>
page {
  background-color: #111827;
  color: #F9FAFB;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 全局滚动条隐藏 */
::-webkit-scrollbar {
  display: none;
}
</style>
