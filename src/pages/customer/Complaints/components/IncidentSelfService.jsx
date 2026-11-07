import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Ban, Send, RefreshCw, MoreHorizontal, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '~/components/ui/dropdown-menu'
import { CUSTOMER_ROUTES } from '~/utils/constants'
import { notify } from '~/utils/notifications'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerImagePicker from '~/components/customer/CustomerImagePicker'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import CustomerVideoPicker from '~/components/customer/CustomerVideoPicker'
import useImages from '~/hooks/useImages'
import useVideos from '~/hooks/useVideos'
import useCatalogResource from '~/hooks/useCatalogResource'
import { customerIncidentApi } from '~/apis/customer/customerIncidentApi'
import { getApiError } from '~/utils/apiError'
import { formatDateTime } from '~/utils/formats'
import IncidentReportDialog from './IncidentReportDialog'

export function IncidentActions({ incident: summary, onSaved, menu = false }) {
  const { t } = useTranslation()
  const [action, setAction] = useState(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const [fresh, setFresh] = useState(null)
  const incident = fresh || summary
  const canEdit = incident.canEdit && incident.status === 1
  const selectAction = async (next) => {
    if (lock.current) {
      return
    }
    if (!menu) {
      setAction(next); return
    }
    lock.current = true; setBusy(true)
    try {
      const current = await customerIncidentApi.get(summary.id)
      if (!current.canEdit || current.status !== 1) {
        onSaved(); throw new Error('customer.sync.incidentChanged')
      }
      setFresh(current); setAction(next)
    } catch (failure) {
      notify.error(getApiError(failure))
    } finally {
      lock.current = false; setBusy(false)
    }
  }
  if (!menu && !canEdit) {
    return null
  }
  return (
    <>
      {menu ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={(
            <Button
              size="icon"
              variant="secondary"
              className="size-10 rounded-xl"
              aria-label={t('customer.sync.incidentActions')}
              disabled={busy}
            />
          )}
          >
            <MoreHorizontal size={20} />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem render={<Link to={CUSTOMER_ROUTES.COMPLAINT_DETAIL.replace(':incidentId', incident.id)} />}>
              <Eye size={17} />
              {t('customer.notification.viewDetails')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canEdit}
              onClick={() => selectAction('edit')}
            >
              <Pencil size={17} />
              {t('customer.sync.editIncident')}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canEdit}
              onClick={() => selectAction('withdraw')}
              className="text-destructive data-highlighted:bg-destructive/10"
            >
              <Ban size={17} />
              {t('customer.sync.withdrawIncident')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <>
          <Button
            variant="outline"
            className="h-11 rounded-xl px-4 text-base"
            onClick={() => selectAction('edit')}
          >
            <Pencil size={17} />
            {t('customer.sync.editIncident')}
          </Button>
          <Button
            variant="destructive"
            className="h-11 rounded-xl px-4 text-base"
            onClick={() => selectAction('withdraw')}
          >
            <Ban size={17} />
            {t('customer.sync.withdrawIncident')}
          </Button>
        </>
      )}
      {action === 'edit' && (
        <IncidentReportDialog
          initialIncident={incident}
          order={{ id: incident.orderId, orderCode: incident.orderCode }}
          onSaved={onSaved}
          onClose={() => {
            setAction(null); onSaved()
          }}
        />
      )}
      {action === 'withdraw' && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) {
              setAction(null); onSaved()
            }
          }}
        >
          <DialogContent
            className="max-w-lg"
            closeLabel="common.close"
          >
            <DialogTitle className="text-xl font-bold">
              {t('customer.sync.withdrawIncident')}
            </DialogTitle>
            <DialogDescription className="mt-3 text-base text-muted-foreground">
              {t('customer.sync.withdrawHint')}
            </DialogDescription>
            <form
              className="mt-5 grid gap-4"
              onSubmit={async (event) => {
                event.preventDefault()
                if (lock.current || uncertain) {
                  return
                }
                lock.current = true; setBusy(true); setError('')
                try {
                  await customerIncidentApi.withdraw(incident.id, reason.trim() || null); onSaved(); setAction(null)
                } catch (failure) {
                  setError(getApiError(failure)); setUncertain(!failure.response || failure.response.status >= 500)
                } finally {
                  lock.current = false; setBusy(false)
                }
              }}
            >
              <label className="grid gap-2 text-base font-semibold">
                {t('customer.sync.reason')}
                <textarea
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={busy || uncertain}
                  className="min-h-24 rounded-xl border border-input bg-background p-3 font-normal"
                  placeholder={t('customer.sync.optionalReason')}
                />
              </label>
              <FormError>
                {uncertain ? 'customer.sync.uncertainMutation' : error}
              </FormError>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => {
                    setAction(null); onSaved()
                  }}
                >
                  {t('common.close')}
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={busy || uncertain}
                >
                  {t('customer.sync.confirmWithdraw')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

export function IncidentMessages({ incident }) {
  const { t } = useTranslation()
  const load = useCallback((signal) => customerIncidentApi.messages(incident.id, signal), [incident.id])
  const resource = useCatalogResource(load)
  const images = useImages(5)
  const videos = useVideos()
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  return (
    <section className="grid gap-4 rounded-2xl border border-border bg-card p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          {t('customer.sync.messages')}
        </h2>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('customer.sync.refreshMessages')}
          onClick={resource.retry}
          disabled={resource.loading || busy}
        >
          <RefreshCw size={17} />
        </Button>
      </header>
      <p className="text-sm leading-6 text-muted-foreground">
        {t('customer.sync.messagesHint')}
      </p>
      {resource.loading || resource.error ? (
        <ResourceFeedback
          {...resource}
          loadingText="customer.incidents.loading"
        />
      ) : (
        <div className="grid max-h-96 gap-3 overflow-y-auto">
          {resource.data?.map((message) => (
            <article
              key={message.id}
              className={`grid gap-2 rounded-xl border border-border p-4 ${message.isMine ? 'bg-primary/5' : 'bg-muted/30'}`}
            >
              <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {message.senderName}
                  {' '}
                  ·
                  {' '}
                  {message.senderRole}
                </strong>
                <time>
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </p>
              <CustomerImageGallery urls={message.imageUrls} />
              <CustomerVideoGallery urls={message.videoUrls} />
            </article>
          ))}
          {!resource.data?.length && (
            <p className="text-sm text-muted-foreground">
              {t('customer.sync.noMessages')}
            </p>
          )}
        </div>
      )}
      {incident.canEdit && incident.status === 1 && (
        <form
          className="grid gap-3 border-t border-border pt-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (lock.current || uncertain || !content.trim()) {
              return
            }
            lock.current = true; setBusy(true); setError('')
            let posting = false
            try {
              const imageUrls = await images.upload(), videoUrls = await videos.upload()
              posting = true
              await customerIncidentApi.message(incident.id, { content: content.trim(), imageUrls, videoUrls })
              setContent(''); images.images.forEach(images.removeImage); videos.videos.forEach(videos.removeVideo); resource.retry()
            } catch (failure) {
              setUncertain(posting && (!failure.response || failure.response.status >= 500)); setError(getApiError(failure))
            } finally {
              lock.current = false; setBusy(false)
            }
          }}
        >
          <fieldset
            disabled={busy || uncertain}
            className="grid min-w-0 gap-3"
          >
            <label className="grid gap-2 text-base font-semibold">
              {t('customer.sync.messageContent')}
              <textarea
                value={content}
                maxLength={2000}
                onChange={(event) => setContent(event.target.value)}
                className="min-h-24 rounded-xl border border-input bg-background p-3 text-base font-normal"
                placeholder={t('customer.sync.messageHint')}
              />
            </label>
            <CustomerImagePicker
              selection={images}
              disabled={busy || uncertain}
            />
            <CustomerVideoPicker
              selection={videos}
              disabled={busy || uncertain}
            />
          </fieldset>
          <FormError>
            {uncertain ? 'customer.sync.uncertainMutation' : error}
          </FormError>
          <Button
            type="submit"
            disabled={busy || uncertain || !content.trim()}
            className="justify-self-end"
          >
            <Send size={17} />
            {t('customer.sync.sendMessage')}
          </Button>
        </form>
      )}
    </section>
  )
}
