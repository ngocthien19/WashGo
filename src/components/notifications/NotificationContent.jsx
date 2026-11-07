import { useTranslation } from 'react-i18next'
import { notificationHighlights, notificationText } from './notificationModel'

export default function NotificationContent({ item }) {
  const { t } = useTranslation()
  return notificationHighlights(item, notificationText(item, t).content).map((part, index) => part.bold ? (
    <strong
      key={index}
      className={part.reason ? 'font-semibold text-[oklch(50.5%_0.213_27.518)]' : 'font-semibold text-foreground'}
    >
      {part.text}
    </strong>
  ) : part.text)
}
