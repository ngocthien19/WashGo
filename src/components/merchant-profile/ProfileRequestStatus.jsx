import { useTranslation } from 'react-i18next'
import { Clock3, CheckCircle2, XCircle } from 'lucide-react'

const states = {
  1: { icon: Clock3, style: 'bg-[#f3e8d7] text-[#795329] dark:bg-[#3c3020] dark:text-amber-200' },
  2: { icon: CheckCircle2, style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300' },
  3: { icon: XCircle, style: 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300' }
}

export default function ProfileRequestStatus({ status }) {
  const { t } = useTranslation()
  const { icon: Icon, style } = states[status] || states[1]
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold ${style}`}>
      <Icon
        size={16}
        className="shrink-0"
      />
      {t(`admin.merchants.requestStates.${status}`)}
    </span>
  )
}
