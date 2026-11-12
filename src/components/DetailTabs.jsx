import { useId, useRef } from 'react'

export default function DetailTabs({ label, tabs, value, onChange, children }) {
  const id = useId(), buttons = useRef({})
  const move = (event, index) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (!keys.includes(event.key)) {
      return
    }
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length
    onChange(tabs[next].value); buttons.current[tabs[next].value]?.focus()
  }
  return (
    <div className="min-w-0 space-y-5">
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-2 overflow-x-auto border-b border-border"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            ref={element => {
              buttons.current[tab.value] = element
            }}
            type="button"
            role="tab"
            id={`${id}-${tab.value}`}
            aria-controls={`${id}-panel`}
            aria-selected={value === tab.value}
            tabIndex={value === tab.value ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={event => move(event, index)}
            className={`shrink-0 cursor-pointer border-b-2 px-4 py-3 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${value === tab.value ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-primary'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
        className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {children}
      </div>
    </div>
  )
}
