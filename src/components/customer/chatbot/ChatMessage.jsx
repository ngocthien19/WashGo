import { useTranslation } from 'react-i18next'
import { Bot } from 'lucide-react'
import UserAvatar from '~/components/UserAvatar/UserAvatar'
import { CHATBOT_CONFIG } from '~/utils/constants'
import ChatResult from './ChatResult'

export default function ChatMessage({ message, user, onNavigate, onOpenTerms }) {
  const { t } = useTranslation()
  const customer = message.role === 1
  return (
    <article
      data-chat-message={message.id}
      className={`flex items-start gap-2.5 ${customer ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`w-fit min-w-0 max-w-[80%] shrink rounded-2xl border px-3 py-2.5 ${customer ? 'rounded-tr-md border-primary/15 bg-primary/10 text-foreground' : 'rounded-tl-md bg-card'}`}>
        <p className="mb-1 text-xs font-semibold text-muted-foreground">
          {t(customer ? 'chatbot.you' : 'chatbot.title')}
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 [overflow-wrap:anywhere]">
          {message.content}
        </p>
        {customer && message.status === CHATBOT_CONFIG.FAILED && (
          <p className="mt-2 text-xs">
            {t('chatbot.failedMessage')}
          </p>
        )}
        {!customer && (
          <ChatResult
            result={message.result}
            onNavigate={onNavigate}
            onOpenTerms={onOpenTerms}
          />
        )}
      </div>
      {customer ? (
        <UserAvatar
          avatar={user?.avatar}
          fullName={user?.fullName}
          alt={t('chatbot.you')}
          className="mt-1 size-9 ring-1 ring-border"
        />
      ) : (
        <span
          role="img"
          aria-label={t('chatbot.title')}
          className="order-first mt-1 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/15"
        >
          <Bot
            className="size-5"
            aria-hidden="true"
          />
        </span>
      )}
    </article>
  )
}
