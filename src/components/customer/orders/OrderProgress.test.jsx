import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '~/i18n'
import { TooltipProvider } from '~/components/ui/tooltip'
import OrderProgress from './OrderProgress'

it('shows localized milestone completion on hover with a bold percentage', async () => {
  const user = userEvent.setup()
  render(<TooltipProvider>
    <OrderProgress
      order={{ status: 12 }}
      compact
    />
  </TooltipProvider>)
  await user.hover(screen.getByRole('progressbar'))
  const tooltip = await screen.findByRole('tooltip')
  expect(tooltip).toHaveTextContent('Đã hoàn thành 100%')
  expect(tooltip.querySelector('strong')).toHaveTextContent('100%')
  await i18n.changeLanguage('en')
  expect(tooltip).toHaveTextContent('Completed 100%')
})

it('supports keyboard focus and does not invent percentages for unknown progress', async () => {
  const user = userEvent.setup()
  render(<TooltipProvider>
    <OrderProgress
      order={{ status: 99 }}
      compact
    />
  </TooltipProvider>)
  await user.tab()
  expect(screen.getByRole('progressbar')).toHaveFocus()
  const tooltip = await screen.findByRole('tooltip')
  expect(tooltip).not.toHaveTextContent('%')
  expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow')
})
