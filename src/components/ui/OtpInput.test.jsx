import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import '~/i18n'
import OtpInput from './OtpInput'

function PinField({ disabled = false }) {
  const [value, setValue] = useState('')
  return (
    <OtpInput
      value={value}
      onChange={setValue}
      masked
      disabled={disabled}
      autoComplete="off"
      label="customer.orders.scan.enterPin"
      digitLabel="customer.orders.scan.pinDigit"
    />
  )
}

describe('shared OTP and locker PIN input', () => {
  it('accepts a pasted PIN, supports keyboard correction and masks every digit', async () => {
    const user = userEvent.setup()
    render(<PinField />)
    const fields = within(screen.getByRole('group')).getAllByDisplayValue('')
    expect(fields).toHaveLength(6)
    await user.click(fields[0])
    await user.paste('123456')
    fields.forEach((field, index) => {
      expect(field).toHaveValue(String(index + 1))
      expect(field).toHaveAttribute('type', 'password')
      expect(field).toHaveAttribute('autocomplete', 'off')
    })
    expect(fields[5]).toHaveFocus()
    await user.keyboard('{Backspace}{Backspace}9')
    expect(fields[4]).toHaveValue('9')
    expect(fields[5]).toHaveValue('')
  })

  it('disables all slots while a locker request is pending', () => {
    render(<PinField disabled />)
    within(screen.getByRole('group')).getAllByDisplayValue('').forEach((field) => {
      expect(field).toBeDisabled()
    })
  })
})
