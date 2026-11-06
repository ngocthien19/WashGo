import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { expect, it } from 'vitest'
import preferences from '~/redux/preferences/preferencesSlice'
import { Button } from '~/components/ui/button'
import ServiceTerms from './ServiceTerms'

it('shows once per account and can reopen without clearing the saved preference', async () => {
  const user = userEvent.setup()
  const store = configureStore({ reducer: { preferences } })
  const content = (id) => (
    <Provider store={store}>
      <ServiceTerms
        key={id}
        userId={id}
      >
        {(open) => <Button onClick={open}>Footer terms</Button>}
      </ServiceTerms>
    </Provider>
  )
  const view = render(content('first'))
  expect(screen.getByRole('dialog', { name: 'Điều khoản dịch vụ' })).toBeVisible()
  expect(screen.getByRole('heading', { name: '5. Báo cáo sự cố và khiếu nại', exact: true })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tôi đã hiểu' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(store.getState().preferences.serviceTermsSeen).toEqual({ first: true })
  view.rerender(content('second'))
  expect(screen.getByRole('dialog')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Đóng', exact: true }))
  view.rerender(content('first'))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Footer terms' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  expect(store.getState().preferences.serviceTermsSeen).toEqual({ first: true, second: true })
})
