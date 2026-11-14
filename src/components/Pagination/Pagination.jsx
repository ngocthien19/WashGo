import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { getPaginationItems } from '~/utils/formats'
import { cn } from '~/lib/utils'
import usePaginationScroll from './usePaginationScroll'

export default function Pagination({ currentPage, totalPages, onPageChange, disabled = false, className }) {
  const { t } = useTranslation()
  const { navigationRef, prepareScroll } = usePaginationScroll(currentPage, disabled)
  const pageCount = Number.isSafeInteger(totalPages) ? Math.max(0, totalPages) : 0
  const page = Math.min(pageCount, Math.max(1, Number.isSafeInteger(currentPage) ? currentPage : 1))
  if (!pageCount) {
    return null
  }

  const changePage = (next) => {
    if (!disabled && next >= 1 && next <= pageCount && next !== page) {
      prepareScroll(next)
      onPageChange(next)
    }
  }

  return (
    <nav
      ref={navigationRef}
      aria-label={t('common.pagination')}
      className={cn('flex flex-wrap items-center justify-center gap-1.5 sm:gap-2', className)}
    >
      <Button
        variant="outline"
        size="icon"
        className="size-9 rounded-xl bg-card sm:size-12"
        aria-label={t('common.previousPage')}
        disabled={disabled || page <= 1}
        onClick={() => changePage(page - 1)}
      >
        <ChevronLeft size={18} />
      </Button>
      {getPaginationItems(page, pageCount).map((item) => typeof item === 'number' ? (
        <Button
          key={item}
          variant={item === page ? 'default' : 'outline'}
          className={cn('size-9 rounded-xl p-0 text-sm font-semibold sm:size-12 sm:text-base', item === page ? 'bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary' : 'bg-card')}
          aria-label={t('common.page', { item: item })}
          aria-current={item === page ? 'page' : undefined}
          disabled={disabled}
          onClick={() => changePage(item)}
        >
          {item}
        </Button>
      ) : (
        <span
          key={item}
          className="grid size-9 place-items-center text-muted-foreground sm:size-12"
        >
          <MoreHorizontal
            size={18}
            aria-hidden="true"
          />
          <span className="sr-only">
            {t('common.morePages')}
          </span>
        </span>
      ))}
      <Button
        variant="outline"
        size="icon"
        className="size-9 rounded-xl bg-card sm:size-12"
        aria-label={t('common.nextPage')}
        disabled={disabled || page >= pageCount}
        onClick={() => changePage(page + 1)}
      >
        <ChevronRight size={18} />
      </Button>
    </nav>
  )
}
