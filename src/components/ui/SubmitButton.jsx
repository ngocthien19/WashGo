import { useTranslation } from 'react-i18next'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { UI_TRANSITIONS } from '~/utils/constants'
import { cn } from '~/lib/utils'

export default function SubmitButton({ children, loading, disabled }) {
  const { t } = useTranslation()
  return (
    <Button
      className="mt-1 min-h-12 w-full gap-2.5 whitespace-normal rounded-lg px-4 py-3 text-sm font-semibold shadow-sm"
      size="lg"
      type="submit"
      disabled={loading || disabled}
    >
      {loading ? (
        <>
          <LoaderCircle
            className="animate-spin motion-reduce:animate-none"
            size={18}
          />
          {t('common.processing')}
        </>
      ) : (
        <>
          {children}
          <ArrowRight
            size={18}
            aria-hidden="true"
            className={cn(
              'motion-safe:group-hover/button:translate-x-1 motion-safe:group-focus-visible/button:translate-x-1 motion-reduce:translate-x-0',
              UI_TRANSITIONS.ICON
            )}
          />
        </>
      )}
    </Button>
  )
}
