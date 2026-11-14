import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Bot, Check, ChevronDown, ChevronUp, History, LoaderCircle, MapPin, Plus, Send, Trash2 } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import useGeolocation from '~/hooks/useGeolocation'
import { CHATBOT_CONFIG as CONFIG } from '~/utils/constants'
import { formatDateTime } from '~/utils/formats'
import useCustomerChatbot from './useCustomerChatbot'
import ChatMessage from './ChatMessage'

const schema = yup.object({ message: yup.string().trim().required('chatbot.required').max(CONFIG.MAX_MESSAGE_LENGTH, 'chatbot.tooLong') })

export default function CustomerChatbot({ onOpenTerms }) {
  const user = useSelector((state) => state.auth.user)
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const chat = useCustomerChatbot()
  const geo = useGeolocation()
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState(false)
  const [shareLocation, setShareLocation] = useState(false)
  const [useOrder, setUseOrder] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [pageScrolled, setPageScrolled] = useState(false)
  const [awayFromBottom, setAwayFromBottom] = useState(false)
  const [scrollArea, setScrollArea] = useState(null)
  const initialized = useRef(false)
  const anchor = useRef(null)
  const scrollToEnd = useRef(true)
  const { register, handleSubmit, setValue, reset, control, formState: { errors } } = useForm({ resolver: yupResolver(schema), defaultValues: { message: '' } })
  const draft = useWatch({ control, name: 'message' })
  const orderId = pathname.match(/^\/customer\/orders\/([0-9a-f-]{36})(?:\/|$)/i)?.[1]
  const { loadHistory } = chat
  useEffect(() => {
    const update = () => setPageScrolled(window.scrollY > 400)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [pathname])

  useEffect(() => {
    const area = scrollArea
    if (!area) {
      return
    }
    const update = () => setAwayFromBottom(area.scrollHeight - area.scrollTop - area.clientHeight > 160)
    const observer = new ResizeObserver(() => {
      if (scrollToEnd.current && !anchor.current) {
        area.scrollTo({ top: area.scrollHeight, behavior: 'instant' })
      }
      update()
    })
    observer.observe(area)
    observer.observe(area.firstElementChild)
    area.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      observer.disconnect()
      area.removeEventListener('scroll', update)
    }
  }, [scrollArea])
  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true; loadHistory()
    }
  }, [open, loadHistory])
  // The dialog portal mounts after `open` changes, so wait for its actual viewport.
  useLayoutEffect(() => {
    if (scrollArea) {
      scrollToEnd.current = true
      anchor.current = null
      scrollArea.scrollTo({ top: scrollArea.scrollHeight, behavior: 'instant' })
    }
  }, [scrollArea])
  useLayoutEffect(() => {
    const area = scrollArea
    if (!area) {
      return
    }
    if (anchor.current) {
      const target = area.querySelector(`[data-chat-message="${CSS.escape(anchor.current.id)}"]`)
      if (target) {
        area.scrollTo({ top: area.scrollTop + target.getBoundingClientRect().top - area.getBoundingClientRect().top - anchor.current.offset, behavior: 'instant' })
      }
      anchor.current = null
    } else if (scrollToEnd.current) {
      area.scrollTo({ top: area.scrollHeight, behavior: 'instant' })
    }
  }, [chat.messages.items, scrollArea])

  const older = () => {
    if (chat.loadingMessages || !chat.messages.hasMore) {
      return
    }
    const area = scrollArea
    const first = [...area.querySelectorAll('[data-chat-message]')].find((element) => element.getBoundingClientRect().bottom > area.getBoundingClientRect().top)
    if (first) {
      anchor.current = { id: first.dataset.chatMessage, offset: first.getBoundingClientRect().top - area.getBoundingClientRect().top }
    }
    chat.loadMessages(chat.conversationId, chat.messages.nextCursor)
  }
  const submit = ({ message }) => {
    const context = {}
    if (shareLocation && geo.position) {
      context.location = geo.position
    }
    if (useOrder === orderId && orderId) {
      context.selectedOrderId = orderId
    }
    scrollToEnd.current = true
    if (chat.send(message, context)) {
      reset()
    }
  }
  const select = (id) => {
    scrollToEnd.current = true; anchor.current = null
    chat.selectConversation(id); setHistory(false); setConfirmDelete(null); reset()
  }
  const blocked = chat.busy || !!chat.pending || chat.loadingMessages
  const composerBlocked = blocked || !!chat.messageError

  return (
    <>
      {pageScrolled && !open && (
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.25rem)] right-7 z-40 size-10 rounded-full border-primary bg-card text-primary shadow-lg print:hidden sm:right-9 dark:border-primary dark:bg-card dark:hover:bg-muted"
          aria-label={t('chatbot.toTop')}
          onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}
        >
          <ChevronUp />
        </Button>
      )}
      <Button
        className={`chat-launcher fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 size-14 rounded-full shadow-xl shadow-primary/25 ring-4 ring-background print:hidden sm:right-7 [&_svg]:size-7 ${open ? '' : 'chat-launcher-highlight'}`}
        aria-label={t('chatbot.open')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Bot />
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
      >
        <DialogContent
          closeLabel="chatbot.close"
          className="left-auto right-5 top-auto bottom-[calc(max(1.25rem,env(safe-area-inset-bottom))+4.25rem)] flex h-[min(640px,calc(100dvh-max(1.25rem,env(safe-area-inset-bottom))-6.75rem))] max-h-none w-[calc(100%-2.5rem)] max-w-[520px] translate-x-0 translate-y-0 flex-col overflow-hidden rounded-3xl p-0 print:hidden sm:right-24 sm:w-[calc(100%-7.75rem)] sm:p-0"
        >
          <header className="flex items-center gap-3 border-b border-primary/15 bg-primary/5 px-5 py-4 pr-14">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Bot className="size-6" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-bold">
                {t('chatbot.title')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm leading-5 text-muted-foreground">
                {t('chatbot.subtitle')}
              </DialogDescription>
            </div>
          </header>
          <nav
            aria-label={t('chatbot.tools')}
            className="flex items-center gap-2 border-b px-3 py-2 sm:px-4"
          >
            <Button
              variant={history ? 'secondary' : 'outline'}
              className="h-10 min-w-0 flex-[1.4] shrink gap-1.5 rounded-xl px-2 text-xs sm:h-11 sm:flex-none sm:px-3 sm:text-sm"
              onClick={() => setHistory(!history)}
              aria-pressed={history}
            >
              <History />
              <span className="truncate">
                {t('chatbot.history')}
              </span>
            </Button>
            <Button
              variant="default"
              className="ml-auto h-10 min-w-0 flex-1 shrink gap-1.5 rounded-xl px-2 text-xs sm:h-11 sm:flex-none sm:px-4 sm:text-sm"
              disabled={blocked}
              onClick={() => select(null)}
            >
              <Plus />
              <span className="truncate">
                {t('chatbot.new')}
              </span>
            </Button>
          </nav>
          {history ? (
            <section className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold">
                  {t('chatbot.history')}
                </h3>
                <Button
                  variant="ghost"
                  disabled={chat.loadingHistory}
                  onClick={() => chat.loadHistory()}
                >
                  {t('chatbot.refresh')}
                </Button>
              </div>
              {chat.historyError && (
                <p role="alert">
                  {t(chat.historyError)}
                </p>
              )}
              {!chat.loadingHistory && !chat.historyError && !chat.conversations.items.length && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('chatbot.emptyHistory')}
                </p>
              )}
              <ul className="space-y-2">
                {chat.conversations.items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-xl border bg-card p-3"
                  >
                    <div className="flex items-center gap-2">
                      <button
                        className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={blocked}
                        onClick={() => select(item.id)}
                      >
                        <span className="line-clamp-2 break-words text-sm font-semibold">
                          {item.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatDateTime(item.lastMessageAt || item.createdAt)}
                        </span>
                      </button>
                      <Button
                        size="icon"
                        variant="destructive"
                        className="size-10"
                        disabled={blocked}
                        aria-label={t('chatbot.delete')}
                        onClick={() => setConfirmDelete(item.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {confirmDelete === item.id && (
                      <div className="mt-3 border-t pt-3">
                        <p className="text-sm text-muted-foreground">
                          {t('chatbot.deleteDescription')}
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="destructive"
                            className="h-10"
                            disabled={blocked}
                            onClick={async () => {
                              if (await chat.remove(item.id)) {
                                setConfirmDelete(null)
                              }
                            }}
                          >
                            {t('chatbot.delete')}
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-10"
                            onClick={() => setConfirmDelete(null)}
                          >
                            {t('chatbot.cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {(chat.conversations.hasMore || chat.historyError || chat.loadingHistory) && (
                <Button
                  variant="outline"
                  className="mt-3 h-10 w-full"
                  disabled={chat.loadingHistory}
                  onClick={() => chat.loadHistory(chat.historyError === 'chatbot.cursorError' ? null : chat.conversations.nextCursor)}
                >
                  {t(chat.loadingHistory ? 'chatbot.loading' : 'chatbot.more')}
                </Button>
              )}
            </section>
          ) : (
            <>
              <div className="relative isolate min-h-0 flex-1">
                <section
                  ref={setScrollArea}
                  aria-label={t('chatbot.messages')}
                  className="h-full overflow-y-auto overscroll-contain bg-muted/20 p-4 [overflow-anchor:none]"
                  onScroll={(event) => {
                    const area = event.currentTarget
                    scrollToEnd.current = area.scrollHeight - area.scrollTop - area.clientHeight < 80
                    if (area.scrollTop < 24 && !chat.messageError) {
                      older()
                    }
                  }}
                >
                  <div className="space-y-4">
                    {chat.messages.hasMore && (
                      <Button
                        variant="ghost"
                        className="w-full"
                        disabled={chat.loadingMessages}
                        onClick={older}
                      >
                        {t('chatbot.older')}
                      </Button>
                    )}
                    {chat.loadingMessages && (
                      <p role="status">
                        {t('chatbot.loading')}
                      </p>
                    )}
                    {chat.messageError && (
                      <div role="alert">
                        <p>
                          {t(chat.messageError)}
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (chat.messageError === 'chatbot.cursorError') {
                              anchor.current = null
                            }
                            chat.loadMessages(chat.conversationId, chat.messageError === 'chatbot.cursorError' ? null : chat.messages.nextCursor)
                          }}
                        >
                          {t('chatbot.refresh')}
                        </Button>
                      </div>
                    )}
                    {!chat.messages.items.length && !chat.loadingMessages && !chat.messageError && (
                      <div className="py-6 text-center">
                        <Bot className="mx-auto mb-3 size-12 rounded-2xl bg-primary/10 p-2.5 text-primary" />
                        <h3 className="text-lg font-bold">
                          {t('chatbot.welcome')}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {t('chatbot.intro')}
                        </p>
                        <div className="mt-5 flex flex-wrap justify-center gap-2">
                          {['guide', 'services', 'lockers'].map((topic) => (
                            <Button
                              key={topic}
                              variant="outline"
                              className="h-auto min-h-10 whitespace-normal rounded-xl bg-card py-2 text-left"
                              onClick={() => setValue('message', t(`chatbot.suggestions.${topic}`), { shouldFocus: true })}
                            >
                              {t(`chatbot.suggestions.${topic}`)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    {chat.messages.items.map((message) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        user={user}
                        onNavigate={() => setOpen(false)}
                        onOpenTerms={onOpenTerms}
                      />
                    ))}
                    {chat.busy && (
                      <p
                        role="status"
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <LoaderCircle className="size-4 animate-spin" />
                        {t('chatbot.thinking')}
                      </p>
                    )}
                  </div>
                </section>
                {awayFromBottom && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-3 left-1/2 z-10 size-10 -translate-x-1/2 rounded-full border-primary bg-card text-primary shadow-lg dark:border-primary dark:bg-card dark:hover:bg-muted"
                    aria-label={t('chatbot.toBottom')}
                    onClick={() => {
                      scrollToEnd.current = true
                      scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
                    }}
                  >
                    <ChevronDown />
                  </Button>
                )}
              </div>
              <div className="border-t bg-card px-3 py-2">
                {orderId && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      className="h-9 text-xs"
                      aria-pressed={useOrder === orderId}
                      disabled={blocked}
                      onClick={() => setUseOrder(useOrder === orderId ? null : orderId)}
                    >
                      {t('chatbot.useOrder')}
                      {useOrder === orderId && <Check />}
                    </Button>
                  </div>
                )}
                {geo.locationError && (
                  <p
                    role="alert"
                    className="mb-2 text-xs text-destructive"
                  >
                    {t(geo.locationError)}
                  </p>
                )}
                <form onSubmit={(event) => handleSubmit(submit)(event)}>
                  <label
                    className="sr-only"
                    htmlFor="customer-chat-message"
                  >
                    {t('chatbot.message')}
                  </label>
                  <div className="flex items-center gap-1 rounded-2xl border bg-background p-1 focus-within:ring-2 focus-within:ring-primary/30">
                    <Button
                      key={shareLocation ? 'location-shared' : 'location-off'}
                      type="button"
                      variant={shareLocation ? 'secondary' : 'ghost'}
                      size="icon"
                      className={`size-11 rounded-xl ${shareLocation ? 'bg-primary/10 text-primary ring-1 ring-primary/25' : 'text-muted-foreground'}`}
                      disabled={geo.locating || blocked}
                      aria-label={t(geo.locating ? 'chatbot.locating' : shareLocation ? 'chatbot.locationShared' : 'chatbot.shareLocation')}
                      tooltip={t(geo.locating ? 'chatbot.locating' : shareLocation ? 'chatbot.locationShared' : 'chatbot.shareLocation')}
                      aria-pressed={shareLocation}
                      onClick={async () => {
                        if (shareLocation) {
                          setShareLocation(false)
                        } else if (await geo.requestLocation()) {
                          setShareLocation(true)
                        }
                      }}
                    >
                      {geo.locating ? <LoaderCircle className="animate-spin" /> : <MapPin />}
                    </Button>
                    <textarea
                      {...register('message')}
                      id="customer-chat-message"
                      rows={1}
                      maxLength={CONFIG.MAX_MESSAGE_LENGTH}
                      disabled={composerBlocked}
                      placeholder={t('chatbot.placeholder')}
                      className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base leading-6 outline-none disabled:opacity-60"
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                          event.preventDefault(); handleSubmit(submit)()
                        }
                      }}
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="size-11 rounded-xl"
                      disabled={composerBlocked || !draft?.trim()}
                      aria-label={t('chatbot.send')}
                    >
                      <Send />
                    </Button>
                  </div>
                  {errors.message && (
                    <p
                      role="alert"
                      className="mt-2 text-xs text-destructive"
                    >
                      {t(errors.message.message)}
                    </p>
                  )}
                </form>
              </div>
            </>
          )}
          {chat.error && (
            <div
              role="status"
              className="max-h-40 shrink-0 overflow-y-auto border-t bg-amber-500/5 px-4 py-3 text-sm"
            >
              <p>
                {t(chat.error)}
              </p>
              {chat.error === 'chatbot.busyError' && chat.conversationId && (
                <Button
                  variant="outline"
                  className="mt-2 h-10"
                  disabled={chat.loadingMessages || chat.busy}
                  onClick={() => chat.loadMessages(chat.conversationId)}
                >
                  {t('chatbot.refresh')}
                </Button>
              )}
              {chat.pending && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="h-10"
                    disabled={chat.busy}
                    onClick={chat.check}
                  >
                    {t(chat.pending.conversationId ? 'chatbot.check' : 'chatbot.recoverFirst')}
                  </Button>
                  {chat.pending.conversationId && !chat.pending.lookupOnly && chat.error === 'chatbot.unknown' && (
                    <Button
                      variant="ghost"
                      className="h-10"
                      disabled={chat.busy}
                      onClick={chat.replay}
                    >
                      {t('chatbot.replay')}
                    </Button>
                  )}
                </div>
              )}
              {!chat.pending && chat.retryMessage && (
                <Button
                  variant="ghost"
                  className="mt-1 h-10"
                  onClick={() => {
                    setHistory(false); setValue('message', chat.retryMessage, { shouldFocus: true })
                  }}
                >
                  {t('chatbot.editRetry')}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
