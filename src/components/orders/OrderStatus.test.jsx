import { render, screen, cleanup } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import { ORDER_STATUS_OPTIONS } from '~/utils/config/constants'
import OrderStatus from './OrderStatus'
import OrderStatusDescription from './OrderStatusDescription'
import { OrderRoleContext } from './orderPresentation'
import { ORDER_STATUS_COLORS } from '~/utils/config/constants'

it('gives every order status its own badge palette and localized role description', async () => {
  expect(new Set(ORDER_STATUS_OPTIONS.map(option => option.color)).size).toBe(ORDER_STATUS_OPTIONS.length)
  for (const language of ['vi', 'en']) {
    await i18n.changeLanguage(language)
    for (const role of ['Admin', 'Merchant', 'Shipper']) {
      for (const option of ORDER_STATUS_OPTIONS) {
        const status = Number(option.value)
        const description = `orderRoleDescriptions.${role}.${status}`
        expect(i18n.exists(description)).toBe(true)
        expect(ORDER_STATUS_COLORS[option.color]).toContain('dark:')
        render(<OrderRoleContext.Provider value={role}>
          <OrderStatus status={status} />
          <OrderStatusDescription status={status} />
        </OrderRoleContext.Provider>)
        expect(screen.getByTitle(i18n.t(description))).toBeVisible()
        expect(screen.getByText(i18n.t(description))).toBeVisible()
        cleanup()
      }
    }
  }
})

it('provides a translated description and a decorative icon for every supported status', async () => {
  for (const language of ['vi', 'en']) {
    await i18n.changeLanguage(language)
    for (const option of ORDER_STATUS_OPTIONS) {
      const status = Number(option.value)
      expect(i18n.exists(`orderProgress.descriptions.${status}`)).toBe(true)
      const { container } = render(<>
        <OrderStatus status={status} />
        <OrderStatusDescription status={status} />
      </>)
      expect(screen.getByText(i18n.t(option.label))).toBeVisible()
      expect(screen.getByText(i18n.t(`orderProgress.descriptions.${status}`))).toBeVisible()
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
      cleanup()
    }
  }
})

it('keeps unknown legacy statuses readable', () => {
  const { container } = render(<>
    <OrderStatus status={1000} />
    <OrderStatusDescription status={1000} />
  </>)
  expect(screen.getByText(i18n.t('customer.orders.unknown'))).toBeVisible()
  expect(screen.getByText(i18n.t('customer.orders.recordedStep'))).toBeVisible()
  expect(container.querySelector('svg')).toBeInTheDocument()
})
