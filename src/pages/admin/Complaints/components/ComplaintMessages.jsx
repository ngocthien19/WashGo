import TablePagination from '~/components/Pagination/TablePagination'
import { useCallback, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Send } from 'lucide-react'
import { Button } from '~/components/ui/button'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import CustomerImageGallery from '~/components/customer/CustomerImageGallery'
import CustomerVideoGallery from '~/components/customer/CustomerVideoGallery'
import CustomerImagePicker from '~/components/customer/CustomerImagePicker'
import CustomerVideoPicker from '~/components/customer/CustomerVideoPicker'
import useCatalogResource from '~/hooks/useCatalogResource'
import useImages from '~/hooks/useImages'
import useVideos from '~/hooks/useVideos'
import { adminComplaintApi } from '~/apis/admin/adminComplaintApi'
import { getApiError } from '~/utils/apiError'
import { formatDateTime } from '~/utils/formats'
import { notify } from '~/utils/notifications'
import { messageSchema, snapshot, unknownWrite } from '../complaintModel'

export default function ComplaintMessages({ incident, onChanged }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const load = useCallback(signal => adminComplaintApi.messagesPage(incident.id, page, signal), [incident.id, page])
  const resource = useCatalogResource(load), images = useImages(5), videos = useVideos()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ resolver: yupResolver(messageSchema), defaultValues: { content: '' } })
  const [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false), [error, setError] = useState('')
  const locked = useRef(false)
  const submit = async values => {
    if (locked.current || blocked || images.error || videos.error) {
      return
    }
    locked.current = true; setPending(true); setError('')
    let writing = false
    try {
      const imageUrls = await images.upload(), videoUrls = await videos.upload()
      if (snapshot(await adminComplaintApi.detail(incident.id)) !== snapshot(incident)) {
        setBlocked(true); throw new Error('admin.complaints.changed')
      }
      writing = true
      await adminComplaintApi.message(incident.id, { expectedVersion: incident.version, content: values.content.trim(), imageUrls, videoUrls })
      reset(); images.images.forEach(images.removeImage); videos.videos.forEach(videos.removeVideo); resource.retry(); onChanged(); notify.success('admin.complaints.messageSent')
    } catch (failure) {
      const unknown = writing && unknownWrite(failure)
      if (unknown || failure.response?.status === 409) {
        setBlocked(true)
      }
      const message = unknown ? 'admin.complaints.unknown' : getApiError(failure); setError(message); notify.error(message)
    } finally {
      locked.current = false; setPending(false)
    }
  }
  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
      <header className="-mx-5 -mt-5 flex items-center justify-between gap-3 rounded-t-2xl border-b border-primary/10 bg-primary/5 px-5 py-4">
        <h2 className="text-lg font-semibold">
          {t('customer.sync.messages')}
        </h2>
        <Button
          size="icon"
          variant="ghost"
          aria-label={t('customer.sync.refreshMessages')}
          onClick={resource.retry}
          disabled={resource.loading || pending}
        >
          <RefreshCw size={18} />
        </Button>
      </header>
      {resource.data?.total > 0 && (
        <TablePagination
          currentPage={page}
          totalPages={Math.ceil(resource.data.total / 10)}
          total={resource.data.total}
          pageSize={10}
          rowCount={resource.data.list.length}
          onPageChange={setPage}
        />
      )}
      <p className="text-sm text-muted-foreground">
        {t('admin.complaints.messageHint')}
      </p>
      {resource.loading || resource.error ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
          {resource.data?.list.map(message => (
            <article
              key={message.id}
              className={`space-y-3 rounded-xl border border-border p-4 ${message.senderRole === 'Admin' ? 'bg-primary/5' : 'bg-muted/25'}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <p className="font-semibold">
                  {message.senderName}
                  <span className="ml-2 rounded-full bg-card px-2 py-1 text-xs font-medium text-muted-foreground">
                    {t(message.senderRole === 'Admin' ? 'admin.workspace' : 'admin.complaints.customer')}
                  </span>
                </p>
                <time className="text-xs text-muted-foreground">
                  {formatDateTime(message.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-base leading-relaxed">
                {message.content}
              </p>
              <CustomerImageGallery urls={message.imageUrls || []} />
              <CustomerVideoGallery urls={message.videoUrls || []} />
            </article>
          ))}
          {!resource.data?.length && (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              {t('customer.sync.noMessages')}
            </p>
          )}
        </div>
      )}
      <form
        noValidate
        onSubmit={event => handleSubmit(submit)(event)}
        className="space-y-4 border-t border-border pt-4"
      >
        <fieldset
          disabled={pending || blocked}
          className="grid min-w-0 gap-4"
        >
          <label className="grid gap-3 text-sm font-medium">
            <span>
              {t('customer.sync.messageContent')}
            </span>
            <textarea
              {...register('content')}
              aria-label={t('customer.sync.messageContent')}
              aria-invalid={!!errors.content}
              maxLength={2000}
              placeholder={t('customer.sync.messageHint')}
              className="min-h-28 rounded-xl border border-input bg-background p-3 text-base font-normal"
            />
            {errors.content && (
              <span
                role="alert"
                className="text-sm text-destructive"
              >
                {t('admin.complaints.invalidField')}
              </span>
            )}
          </label>
          <CustomerImagePicker
            selection={images}
            disabled={pending || blocked}
          />
          <CustomerVideoPicker
            selection={videos}
            disabled={pending || blocked}
          />
        </fieldset>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {t(error)}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          {blocked && (
            <Button
              type="button"
              variant="outline"
              onClick={onChanged}
              className="h-11 px-5 text-base"
            >
              {t('customer.orders.refresh')}
            </Button>
          )}
          <Button
            type="submit"
            disabled={pending || blocked || Boolean(images.error || videos.error)}
            className="h-11 px-5 text-base"
          >
            <Send size={18} />
            {t('customer.sync.sendMessage')}
          </Button>
        </div>
      </form>
    </section>
  )
}
