import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useState } from 'react'
import i18n from '~/i18n'
import TablePagination from './TablePagination'

let frames
let nextFrame
beforeEach(async () => {
  await i18n.changeLanguage('en')
  frames = new Map(); nextFrame = 0
  vi.stubGlobal('requestAnimationFrame', (callback) => {
    frames.set(++nextFrame, callback); return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (id) => frames.delete(id))
})
afterEach(() => vi.unstubAllGlobals())
const flushFrames = () => act(() => {
  const callbacks = [...frames.values()]
  frames.clear(); callbacks.forEach((callback) => callback())
})

function Region({ page = 1, loading = false, change = () => {}, name = 'results' }) {
  return (
    <section
      data-pagination-scope
      aria-label={name}
    >
      {loading ? <p>Loading</p> : (
        <>
          <table>
            <thead data-slot="table-header">
              <tr>
                <th>Order</th>
              </tr>
            </thead>
          </table>
          <TablePagination
            currentPage={page}
            totalPages={3}
            total={30}
            pageSize={10}
            rowCount={10}
            onPageChange={change}
          />
        </>
      )}
    </section>
  )
}

it('waits through async loading and scrolls the newly mounted table header once', () => {
  const change = vi.fn()
  const view = render(<Region change={change} />)
  const firstHeader = view.container.querySelector('thead')
  firstHeader.scrollIntoView = vi.fn()
  flushFrames()
  expect(firstHeader.scrollIntoView).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Next page', exact: true }))
  expect(change).toHaveBeenCalledWith(2)
  view.rerender(<Region
    page={2}
    loading
  />)
  flushFrames()
  expect(firstHeader.scrollIntoView).not.toHaveBeenCalled()
  view.rerender(<Region page={2} />)
  const newHeader = view.container.querySelector('thead')
  newHeader.scrollIntoView = vi.fn()
  flushFrames(); flushFrames()
  expect(newHeader.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', inline: 'nearest', behavior: 'smooth' })
})

it('supports local pagination and cancels an obsolete scheduled page', () => {
  function LocalTable() {
    const [page, change] = useState(1)
    return (
      <Region
        page={page}
        change={change}
      />
    )
  }
  const view = render(<LocalTable />)
  const header = view.container.querySelector('thead')
  header.scrollIntoView = vi.fn()
  fireEvent.click(screen.getByRole('button', { name: 'Next page', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Next page', exact: true }))
  flushFrames()
  expect(header.scrollIntoView).toHaveBeenCalledTimes(1)
})

it('does not scroll on filters or a programmatic page reset without a pagination click', () => {
  const view = render(<Region />)
  const header = view.container.querySelector('thead')
  header.scrollIntoView = vi.fn()
  view.rerender(<Region page={2} />)
  flushFrames()
  view.rerender(<Region page={1} />)
  flushFrames()
  expect(header.scrollIntoView).not.toHaveBeenCalled()
})

it('isolates nested result regions and resets only their own vertical list', () => {
  const change = vi.fn()
  const view = render(
    <section data-pagination-scope>
      <h2>Outer results</h2>
      <div data-pagination-scope>
        <ul data-pagination-scroll>
          <li>First result</li>
        </ul>
        <TablePagination
          currentPage={1}
          totalPages={2}
          total={20}
          pageSize={10}
          onPageChange={change}
        />
      </div>
    </section>
  )
  const outer = view.container.firstElementChild
  const inner = outer.querySelector('[data-pagination-scope]')
  outer.scrollIntoView = vi.fn(); inner.scrollIntoView = vi.fn()
  inner.querySelector('ul').scrollTo = vi.fn()
  fireEvent.click(screen.getByRole('button', { name: 'Next page', exact: true }))
  view.rerender(
    <section data-pagination-scope>
      <h2>Outer results</h2>
      <div data-pagination-scope>
        <ul data-pagination-scroll>
          <li>Next result</li>
        </ul>
        <TablePagination
          currentPage={2}
          totalPages={2}
          total={20}
          pageSize={10}
          onPageChange={change}
        />
      </div>
    </section>
  )
  flushFrames()
  expect(outer.scrollIntoView).not.toHaveBeenCalled()
  expect(inner.scrollIntoView).toHaveBeenCalledTimes(1)
  expect(inner.querySelector('ul').scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0, behavior: 'smooth' })
})

it('does not carry a pending scroll to a replacement result region or a different route', () => {
  const view = render(<Region />)
  fireEvent.click(screen.getByRole('button', { name: 'Next page', exact: true }))
  view.rerender(<Region
    key="other-route"
    page={2}
  />)
  const header = view.container.querySelector('thead')
  header.scrollIntoView = vi.fn()
  flushFrames()
  expect(header.scrollIntoView).not.toHaveBeenCalled()
})

it('ignores disabled, current-page and out-of-range navigation', () => {
  const change = vi.fn()
  const view = render(<Region change={change} />)
  const header = view.container.querySelector('thead')
  header.scrollIntoView = vi.fn()
  fireEvent.click(screen.getByRole('button', { name: 'Previous page', exact: true }))
  fireEvent.click(screen.getByRole('button', { name: 'Page 1', exact: true }))
  flushFrames()
  expect(change).not.toHaveBeenCalled()
  expect(header.scrollIntoView).not.toHaveBeenCalled()
})

it('keeps pagination scrolling instant when reduced motion is enabled', () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })))
  const view = render(<Region />)
  fireEvent.click(screen.getByRole('button', { name: 'Next page', exact: true }))
  view.rerender(<Region page={2} />)
  const header = view.container.querySelector('thead')
  header.scrollIntoView = vi.fn()
  flushFrames()
  expect(header.scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'start', inline: 'nearest', behavior: 'instant' })
})
