import { act, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { expect, it, vi } from 'vitest'
import NotificationProvider from './NotificationProvider'
import { useNotifications } from './NotificationContext'
import { notificationHref } from './notificationModel'
import { notify } from '~/utils/notifications'

vi.mock('~/utils/notifications', () => ({ notify: { info: vi.fn() } }))

const mock = vi.hoisted(() => ({ handlers: {}, unread: vi.fn(), stop: vi.fn(async () => {}), options: null, reconnected: null }))
vi.mock('~/apis/notificationApi', () => ({
  notificationApi: { unread: mock.unread },
  isNotification: (item) => Boolean(item?.id)
}))
vi.mock('@microsoft/signalr', () => ({
  LogLevel: { None: 6 },
  HubConnectionBuilder: class {
    withUrl(url, options) {
      mock.options = options; return this
    }
    configureLogging() {
      return this
    }
    withAutomaticReconnect() {
      return this
    }
    build() {
      return {
        on: (name, callback) => {
          mock.handlers[name] = callback
        },
        off: (name) => {
          delete mock.handlers[name]
        },
        start: async () => {}, stop: mock.stop,
        onreconnecting: () => {}, onclose: () => {},
        onreconnected: (callback) => {
          mock.reconnected = callback
        }
      }
    }
  }
}))
function Status() {
  const { unread, live } = useNotifications()
  return (
    <p>
      {String(live)}
      :
      {unread}
    </p>
  )
}
it('reconciles counts on realtime events and reconnect, uses current token and cleans up', async () => {
  mock.unread.mockResolvedValue(2)
  const store = configureStore({ reducer: { auth: (state = { user: { id: 'a' }, accessToken: 'old' }, action) => action.type === 'token' ? { ...state, accessToken: 'new' } : state } })
  const view = render(<Provider store={store}>
    <NotificationProvider>
      <Status />
    </NotificationProvider>
  </Provider>)
  await screen.findByText('true:2')
  expect(notify.info).not.toHaveBeenCalled()
  expect(mock.options.accessTokenFactory()).toBe('old')
  act(() => store.dispatch({ type: 'token' }))
  expect(mock.options.accessTokenFactory()).toBe('new')
  mock.unread.mockResolvedValue(3)
  const incoming = { id: 'new', title: 'Laundry ready', isRead: false, type: 8 }
  act(() => mock.handlers.notification(incoming))
  await screen.findByText('true:3')
  expect(notify.info).toHaveBeenCalledExactlyOnceWith('customer.notification.incoming', { title: 'Laundry ready' }, expect.objectContaining({ id: 'notification-new' }))
  act(() => mock.handlers.notification(incoming))
  act(() => mock.handlers.notification({ ...incoming, id: 'already-read', isRead: true }))
  expect(notify.info).toHaveBeenCalledTimes(1)
  mock.unread.mockResolvedValue(0)
  act(() => mock.reconnected())
  await screen.findByText('true:0')
  act(() => mock.handlers.notification(incoming))
  expect(notify.info).toHaveBeenCalledTimes(1)
  view.unmount()
  await waitFor(() => expect(mock.stop).toHaveBeenCalled())
  expect(mock.handlers.notification).toBeUndefined()
})
it('routes only supported internal targets with valid identifiers', () => {
  const id = '11111111-1111-4111-8111-111111111111'
  expect(notificationHref({ linkType: 'order', linkId: id })).toBe(`/customer/orders/${id}`)
  expect(notificationHref({ linkType: 'incident', linkId: id })).toBe(`/customer/complaints/${id}`)
  expect(notificationHref({ linkType: 'https://example.com', linkId: id })).toBeNull()
  expect(notificationHref({ linkType: 'order', linkId: '../profile' })).toBeNull()
})
