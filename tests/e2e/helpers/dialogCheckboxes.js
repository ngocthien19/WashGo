import { expect } from '@playwright/test'

export async function expectDialogCheckboxLabels(dialog) {
  const labels = dialog.locator('label:has(> [data-slot="checkbox"]), label:has(> input[type="checkbox"]:not([role="switch"]))')
  await expect(labels.first()).toBeVisible()
  const metrics = await labels.evaluateAll(elements => elements.map(label => {
    const checkbox = label.querySelector('[data-slot="checkbox"], input[type="checkbox"]')
    const labelBox = label.getBoundingClientRect()
    const box = checkbox.getBoundingClientRect()
    return {
      fontSize: getComputedStyle(label).fontSize,
      alignItems: getComputedStyle(label).alignItems,
      width: checkbox.offsetWidth,
      height: checkbox.offsetHeight,
      centerDifference: Math.abs((labelBox.top + labelBox.bottom - box.top - box.bottom) / 2)
    }
  }))
  for (const metric of metrics) {
    expect(metric.fontSize).toBe('16px')
    expect(metric.alignItems).toBe('center')
    expect(metric.width).toBe(20)
    expect(metric.height).toBe(20)
    expect(metric.centerDifference).toBeLessThan(1)
  }
}
