import { useTranslation } from 'react-i18next'
export default function LoadingScreen() {
  const { t } = useTranslation()
  return (
    <p
      className="grid min-h-dvh place-items-center bg-background text-primary"
      role="status"
    >
      {t('common.loadingWashgo')}
    </p>
  )
}
