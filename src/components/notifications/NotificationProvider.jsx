import { createElement, useCallback, useEffect, useRef, useState } from 'react'
import { useSelector, useStore } from 'react-redux'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { notificationApi, isNotification } from '~/apis/notificationApi'
import { API_URL } from '~/utils/authorizedAxios'
import { NOTIFICATION_CONFIG } from '~/utils/constants'
import { NotificationContext } from './NotificationContext'
import NotificationIcon from './NotificationIcon'
import { notify } from '~/utils/notifications'

export default function NotificationProvider({ children, listHref, resolveHref }) {
  const store = useStore()
  const userId = useSelector((state) => state.auth.user?.id)
  return (
    <NotificationSession
      key={userId || 'guest'}
      store={store}
      listHref={listHref}
      resolveHref={resolveHref}
    >
      {children}
    </NotificationSession>
  )
}

function NotificationSession({ children, store, listHref, resolveHref }) {
  const [revision, setRevision] = useState(0)
  const [unread, setUnread] = useState(null)
  const [live, setLive] = useState(false)
  const generation = useRef(0)
  const announced = useRef(new Set())
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    const current = ++generation.current
    notificationApi.unread(controller.signal).then((value) => {
      if (!controller.signal.aborted && current === generation.current) {
        setUnread(value)
      }
    }).catch(() => {
      if (!controller.signal.aborted) {
        setUnread(null)
      }
    })
    return () => controller.abort()
  }, [revision])
  useEffect(() => {
    let disposed = false
    let retryTimer
    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL.replace(/\/$/, '')}${NOTIFICATION_CONFIG.HUB}`, {
        accessTokenFactory: () => store.getState().auth.accessToken || '',
        withCredentials: false
      })
      .configureLogging(LogLevel.None)
      .withAutomaticReconnect()
      .build()
    const received = (item) => {
      if (!disposed && isNotification(item)) {
        refresh()
        if (!item.isRead && !announced.current.has(item.id)) {
          announced.current.add(item.id)
          // Keep a bounded, session-only history across reconnects.
          if (announced.current.size > NOTIFICATION_CONFIG.TOAST_HISTORY_LIMIT) {
            announced.current.delete(announced.current.values().next().value)
          }
          notify.info('customer.notification.incoming', { title: item.title }, {
            id: `notification-${item.id}`,
            icon: createElement(NotificationIcon, { type: item.type, className: 'size-9' })
          })
        }
      }
    }
    connection.on(NOTIFICATION_CONFIG.EVENT, received)
    const start = async () => {
      if (disposed) {
        return
      }
      try {
        await connection.start()
        if (!disposed) {
          setLive(true); refresh()
        }
      } catch {
        if (!disposed) {
          setLive(false)
          refresh()
          retryTimer = setTimeout(start, NOTIFICATION_CONFIG.RETRY_MS)
        }
      }
    }
    connection.onreconnecting(() => {
      if (!disposed) {
        setLive(false)
        refresh()
      }
    })
    connection.onreconnected(() => {
      if (!disposed) {
        setLive(true); refresh()
      }
    })
    connection.onclose(() => {
      if (!disposed) {
        setLive(false); retryTimer = setTimeout(start, NOTIFICATION_CONFIG.RETRY_MS)
      }
    })
    const focus = () => refresh()
    window.addEventListener('focus', focus)
    start()
    return () => {
      disposed = true
      clearTimeout(retryTimer)
      window.removeEventListener('focus', focus)
      connection.off(NOTIFICATION_CONFIG.EVENT, received)
      connection.stop().catch(() => {})
    }
  }, [store, refresh])
  return (
    <NotificationContext.Provider value={{ unread, live, revision, refresh, listHref, resolveHref }}>
      {children}
    </NotificationContext.Provider>
  )
}
