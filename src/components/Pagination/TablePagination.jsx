import { useTranslation } from 'react-i18next'
import Pagination from './Pagination'
import { cn } from '~/lib/utils'

export default function TablePagination({ currentPage, totalPages, total, pageSize, rowCount, onPageChange, disabled = false, compact = false, className }) {
  const { t } = useTranslation()
  const offset = (Math.max(1, currentPage) - 1) * pageSize
  const count = rowCount ?? Math.max(0, Math.min(pageSize, total - offset))
  return (
    <footer className={cn('flex flex-wrap items-center justify-between gap-4 border-t border-border p-5', className)}>
      <p className="text-sm text-muted-foreground">
        {t('customer.showing', { firstResult: count ? offset + 1 : 0, lastResult: count ? Math.min(total, offset + count) : 0, total })}
      </p>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        disabled={disabled}
        compact={compact}
        className="ml-auto justify-end"
      />
    </footer>
  )
}
