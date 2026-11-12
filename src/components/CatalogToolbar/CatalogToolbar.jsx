import { useId } from 'react'
import { Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export default function CatalogToolbar({ keyword, onSearch, label, placeholder, actions, embedded = false, className, formClassName, resetKey = 0 }) {
  const id = useId()
  return (
    <div className={cn('flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between', !embedded && 'rounded-2xl border border-border/80 bg-card p-4 shadow-sm sm:p-5', className)}>
      <form
        role="search"
        aria-label={label}
        className={cn('flex min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-muted/35 p-1.5 pl-4 focus-within:ring-2 focus-within:ring-ring/20', formClassName)}
        onSubmit={(event) => {
          event.preventDefault()
          onSearch(String(new FormData(event.currentTarget).get('keyword') || '').trim())
        }}
      >
        <label
          htmlFor={id}
          className="sr-only"
        >
          {label}
        </label>
        <Input
          id={id}
          key={`${resetKey}:${keyword}`}
          name="keyword"
          type="search"
          defaultValue={keyword}
          placeholder={placeholder}
          className="h-9 border-0 bg-transparent px-0 shadow-none enabled:hover:border-transparent focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          aria-label={label}
        >
          <Search size={18} />
        </Button>
      </form>
      {actions}
    </div>
  )
}
