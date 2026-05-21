import { defineStore } from 'pinia'

const MAX_ALARMS = 100

export const useAlarmStore = defineStore('alarm', {
  state: () => ({
    alarms: [],
    hasUnread: false,
    unreadCount: 0,
  }),

  getters: {
    criticalAlarms: (state) => state.alarms.filter(a => a.level === 'critical'),
    warningAlarms: (state) => state.alarms.filter(a => a.level === 'warning'),
    infoAlarms: (state) => state.alarms.filter(a => a.level === 'info'),
    latestAlarm: (state) => state.alarms.length > 0 ? state.alarms[0] : null,
    hasCritical: (state) => state.alarms.some(a => a.level === 'critical' && !a.read),
  },

  actions: {
    addAlarm(alarm) {
      const entry = {
        ...alarm,
        read: false,
        ts: alarm.ts || Date.now(),
      }
      this.alarms.unshift(entry)
      if (this.alarms.length > MAX_ALARMS) {
        this.alarms.pop()
      }
      this.hasUnread = true
      this.unreadCount++
    },

    markRead(alarmId) {
      const alarm = this.alarms.find(a => a.id === alarmId)
      if (alarm && !alarm.read) {
        alarm.read = true
        this.unreadCount = Math.max(0, this.unreadCount - 1)
        this.hasUnread = this.unreadCount > 0
      }
    },

    markAllRead() {
      this.alarms.forEach(a => { a.read = true })
      this.hasUnread = false
      this.unreadCount = 0
    },

    clearAlarms() {
      this.alarms = []
      this.hasUnread = false
      this.unreadCount = 0
    },
  },
})
