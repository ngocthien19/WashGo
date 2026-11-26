import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import i18n from '~/i18n'
import { DialogLoadingContext } from '~/components/ui/dialogLoadingContext'
import ResourceFeedback from './ResourceFeedback'

it('keeps loading accessible without visible loading text inside dialogs', async () => {
  await i18n.changeLanguage('en')
  const { rerender } = render(<ResourceFeedback
    loading
    loadingText="common.loading"
  />)
  expect(screen.getByText(i18n.t('common.loading'))).not.toHaveClass('sr-only')
  rerender(<DialogLoadingContext.Provider value={true}>
    <ResourceFeedback
      loading
      loadingText="common.loading"
    />
  </DialogLoadingContext.Provider>)
  expect(screen.getByRole('status')).toHaveTextContent(i18n.t('common.loading'))
  expect(screen.getByText(i18n.t('common.loading'))).toHaveClass('sr-only')
  rerender(<DialogLoadingContext.Provider value={true}>
    <ResourceFeedback
      error="customer.profile.requestError"
      retry={() => {}}
    />
  </DialogLoadingContext.Provider>)
  expect(screen.getByRole('alert')).toBeVisible()
  expect(screen.getByRole('button', { name: i18n.t('common.tryAgain') })).toBeEnabled()
})
