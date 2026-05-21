import { defineStore } from 'pinia'

export const useOrderStore = defineStore('order', {
  state: () => ({
    currentOrder: null,
    // currentOrder: {
    //   id: 'WO-001',
    //   type: 'transport',
    //   from: 'A1',
    //   to: 'B3',
    //   status: 'executing', // pending / executing / paused / completed / cancelled
    //   progressPct: 0,
    //   assignedAt: 0,
    //   startedAt: 0,
    //   completedAt: 0,
    // }
    recentOrders: [],
    pendingCmds: [],
  }),

  getters: {
    hasActiveOrder: (state) => {
      return state.currentOrder && ['pending', 'executing', 'paused'].includes(state.currentOrder.status)
    },

    currentOrderStatusLabel: (state) => {
      if (!state.currentOrder) return '无'
      const labels = {
        pending: '待执行',
        executing: '执行中',
        paused: '已暂停',
        completed: '已完成',
        cancelled: '已取消',
      }
      return labels[state.currentOrder.status] || state.currentOrder.status
    },

    currentOrderSummary: (state) => {
      if (!state.currentOrder) return '无工单'
      return `${state.currentOrder.id} ${state.currentOrder.status === 'executing' ? '执行中' : ''} ${state.currentOrder.progressPct || 0}%`
    },
  },

  actions: {
    assignOrder(order) {
      this.currentOrder = {
        ...order,
        id: order.id || order.order_id,
        orderNo: order.orderNo || order.order_no,
        title: order.title || order.order_no || '未命名工单',
        status: 'pending',
        progressPct: 0,
        assignedAt: Date.now(),
        startedAt: 0,
        completedAt: 0,
      }
    },

    startOrder() {
      if (this.currentOrder) {
        this.currentOrder.status = 'executing'
        this.currentOrder.startedAt = Date.now()
      }
    },

    updateProgress(pct) {
      if (this.currentOrder) {
        this.currentOrder.progressPct = pct
      }
    },

    pauseOrder() {
      if (this.currentOrder && this.currentOrder.status === 'executing') {
        this.currentOrder.status = 'paused'
      }
    },

    resumeOrder() {
      if (this.currentOrder && this.currentOrder.status === 'paused') {
        this.currentOrder.status = 'executing'
      }
    },

    completeOrder() {
      if (this.currentOrder) {
        this.currentOrder.status = 'completed'
        this.currentOrder.progressPct = 100
        this.currentOrder.completedAt = Date.now()
        // 归档到最近工单
        this.recentOrders.unshift({ ...this.currentOrder })
        if (this.recentOrders.length > 20) {
          this.recentOrders.pop()
        }
        this.currentOrder = null
      }
    },

    cancelOrder() {
      if (this.currentOrder) {
        this.currentOrder.status = 'cancelled'
        this.currentOrder.completedAt = Date.now()
        this.recentOrders.unshift({ ...this.currentOrder })
        if (this.recentOrders.length > 20) {
          this.recentOrders.pop()
        }
        this.currentOrder = null
      }
    },

    addPendingCmd(cmd) {
      this.pendingCmds.push(cmd)
      if (this.pendingCmds.length > 50) {
        this.pendingCmds.shift()
      }
    },

    removePendingCmd(cmdId) {
      this.pendingCmds = this.pendingCmds.filter(c => c.id !== cmdId)
    },

    clearPendingCmds() {
      this.pendingCmds = []
    },
  },
})
