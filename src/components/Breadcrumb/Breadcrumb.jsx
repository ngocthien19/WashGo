import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { TEXT_LINK_STYLES } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function Breadcrumb({ items, className }) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('common.breadcrumb')}
      className={cn('text-base text-muted-foreground', className)}
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li
            key={item.to || item.label}
            className="flex min-w-0 items-center gap-2"
          >
            {index > 0 && (
              <ChevronRight
                className="size-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {index < items.length - 1 && item.to ? (
              <Link
                to={item.to}
                className={cn('break-words hover:text-primary', TEXT_LINK_STYLES)}
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={index === items.length - 1 ? 'page' : undefined}
                className="break-words text-foreground font-bold text-primary"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
