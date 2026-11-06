import { cn } from '~/lib/utils'

export function Table({ className, ...props }) {
  return (
    <div
      data-slot="table-container"
      role="region"
      aria-label={props['aria-label']}
      tabIndex={0}
      className="w-full overflow-x-auto outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <table
        data-slot="table"
        className={cn('w-full text-left text-sm', className)}
        {...props}
      />
    </div>
  )
}

export function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b', className)}
      {...props}
    />
  )
}

export function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn('border-b border-border transition-colors delay-0 duration-200 ease-out hover:bg-muted/25', className)}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      scope="col"
      className={cn('h-12 whitespace-nowrap bg-primary/8 px-5 text-sm font-bold text-foreground dark:bg-primary/12', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn('px-5 py-5 align-middle', className)}
      {...props}
    />
  )
}
