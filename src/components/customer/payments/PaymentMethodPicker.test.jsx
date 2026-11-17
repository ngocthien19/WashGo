import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import i18n from '~/i18n'
import PaymentMethodPicker from './PaymentMethodPicker'

function Picker({ disabled = false, onlineOnly = false, lockedMethod = null, amount }) {
  const [value, setValue] = useState(2)
  return (
    <PaymentMethodPicker
      value={value}
      onChange={setValue}
      disabled={disabled}
      onlineOnly={onlineOnly}
      lockedMethod={lockedMethod}
      amount={amount}
    />
  )
}

describe('payment method selection', () => {
  it('blocks a small VNPay charge, explains why and permits wallet selection', async () => {
    const user = userEvent.setup()
    render(<Picker
      onlineOnly
      amount={9000}
    />)
    const vnpay = screen.getByRole('radio', { name: 'VNPAY', exact: true })
    expect(vnpay).toHaveAttribute('aria-disabled', 'true')
    expect(vnpay).toHaveAccessibleDescription(/10[.,]000/)
    await user.click(screen.getByRole('radio', { name: 'MoMo', exact: true }))
    expect(screen.getByRole('radio', { name: 'MoMo', exact: true })).toBeChecked()
  })
  it('does not unlock another gateway when an existing small VNPay session is locked', () => {
    render(<Picker
      onlineOnly
      amount={9000}
      lockedMethod={2}
    />)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-disabled', 'true')
    }
  })
  it('keeps the active gateway usable while disabling alternatives for mouse and keyboard', async () => {
    const user = userEvent.setup()
    render(<Picker
      onlineOnly
      lockedMethod={2}
    />)
    const vnpay = screen.getByRole('radio', { name: 'VNPAY', exact: true })
    const momo = screen.getByRole('radio', { name: 'MoMo', exact: true })
    expect(vnpay).toBeChecked()
    expect(momo).toHaveAttribute('aria-disabled', 'true')
    vnpay.focus()
    await user.keyboard('{ArrowRight}')
    expect(vnpay).toBeChecked()
  })
  it('selects one gateway, retains the method after translation changes and supports the keyboard', async () => {
    const user = userEvent.setup()
    const view = render(<Picker />)
    await user.click(screen.getByRole('radio', { name: 'MoMo', exact: true }))
    expect(screen.getByRole('radio', { name: 'MoMo', exact: true })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'VNPAY', exact: true })).not.toBeChecked()
    await i18n.changeLanguage('en')
    view.rerender(<Picker />)
    expect(screen.getByRole('radio', { name: 'MoMo', exact: true })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'VNPAY', exact: true }))
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'MoMo', exact: true })).toBeChecked()
  })

  it('hides cash during gateway checkout and disables selection during submission', async () => {
    render(<Picker
      onlineOnly
      disabled
    />)
    expect(screen.getAllByRole('radio')).toHaveLength(2)
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toHaveAttribute('aria-disabled', 'true')
    }
  })
})
