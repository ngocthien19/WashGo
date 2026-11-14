import { useTranslation } from 'react-i18next'
import Spinner from '~/components/ui/spinner'
export default function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background text-primary"
      role="status"
    >
      <div className="grid size-24 place-items-center rounded-3xl border border-primary/10 bg-primary/5 shadow-sm">
        <Spinner
          decorative
          className="size-12"
        />
      </div>
      <p className="text-base font-medium text-muted-foreground">
        {t('common.loadingWashgo')}
      </p>
    </div>
  )
}
