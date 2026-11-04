import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import preferences from '~/redux/preferences/preferencesSlice'
import LanguageProvider from '~/components/LanguageProvider/LanguageProvider'
import { TooltipProvider } from '~/components/ui/tooltip'
import LanguageSwitcher from './LanguageSwitcher'

describe('language selection', () => {
  it('shows the current language, opens with keyboard and updates the selected option', async () => {
    const user = userEvent.setup()
    const store = configureStore({ reducer: { preferences } })
    render(
      <Provider store={store}>
        <LanguageProvider>
          <TooltipProvider>
            <LanguageSwitcher />
          </TooltipProvider>
        </LanguageProvider>
      </Provider>
    )
    const trigger = screen.getByRole('button', { name: 'Đổi ngôn ngữ' })
    expect(trigger).toHaveTextContent('VI')
    trigger.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: 'Tiếng Việt' })).toHaveAttribute('aria-current', 'true')
    await user.click(screen.getByRole('menuitem', { name: 'English' }))
    await waitFor(() => expect(trigger).toHaveTextContent('EN'))
    expect(store.getState().preferences.language).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    expect(await screen.findByRole('menuitem', { name: 'English' })).toHaveAttribute('aria-current', 'true')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })
})
