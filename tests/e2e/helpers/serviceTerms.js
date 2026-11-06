// Other feature suites represent returning customers; terms have their own first-visit tests.
export async function seedSeenTerms(page, userId) {
  await page.addInitScript((id) => {
    if (!localStorage.getItem('persist:root')) {
      localStorage.setItem('persist:root', JSON.stringify({
        preferences: JSON.stringify({ language: 'vi', serviceTermsSeen: { [id]: true } }),
        _persist: JSON.stringify({ version: 1, rehydrated: true })
      }))
    }
  }, userId)
}
