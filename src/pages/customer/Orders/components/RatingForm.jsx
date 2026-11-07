import useVideos from '~/hooks/useVideos'
import CustomerVideoPicker from '~/components/customer/CustomerVideoPicker'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Send, RefreshCw, MessageSquareText, SlidersHorizontal } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import RatingStars from './RatingStars'
import useCustomerImages from '~/hooks/customer/useCustomerImages'
import CustomerImagePicker from '~/components/customer/CustomerImagePicker'
import { customerRatingApi } from '~/apis/customer/customerRatingApi'
import { RATING_CONFIG } from '~/utils/constants'
import { getApiError } from '~/utils/apiError'
import { getRatingError } from './ratingModel'

export default function RatingForm({ orderId, onSaved, onBusy, onClose }) {
  const { t } = useTranslation()
  const [values, setValues] = useState({ overallStars: 0, comment: '' })
  const selection = useCustomerImages(RATING_CONFIG.MAX_IMAGES)
  const videos = useVideos()
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  const setField = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }))
    if (error === 'customer.rating.starsRequired' && key.endsWith('Stars')) {
      setError('')
    }
  }
  const submit = async (event) => {
    event.preventDefault()
    if (lock.current || uncertain) {
      return
    }
    const validation = getRatingError(values)
    if (validation) {
      setError(validation)
      return
    }
    lock.current = true
    setBusy(true)
    onBusy(true)
    setError('')
    let posting = false
    try {
      const imageUrls = await selection.upload()
      const videoUrls = await videos.upload()
      posting = true
      const rating = await customerRatingApi.create({
        orderId, overallStars: values.overallStars, comment: values.comment.trim() || null,
        ...Object.fromEntries(RATING_CONFIG.CRITERIA.map((key) => [key, values[key] || null])), imageUrls, videoUrls
      })
      onSaved(rating)
    } catch (failure) {
      const unknown = posting && (!failure.response?.status || failure.response.status >= 500)
      setUncertain(unknown)
      setError(unknown ? 'customer.rating.uncertain' : getApiError(failure))
    } finally {
      lock.current = false
      setBusy(false)
      onBusy(false)
    }
  }
  const checkSaved = async () => {
    if (lock.current) {
      return
    }
    lock.current = true
    setBusy(true)
    onBusy(true)
    try {
      const rating = await customerRatingApi.getByOrder(orderId)
      if (rating) {
        onSaved(rating)
      } else {
        setUncertain(false)
        setError('customer.rating.notSaved')
      }
    } catch (failure) {
      setError(getApiError(failure))
    } finally {
      lock.current = false
      setBusy(false)
      onBusy(false)
    }
  }
  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-col"
      noValidate
    >
      <div className="min-h-0 overflow-y-auto overscroll-contain">
        <fieldset
          disabled={busy || uncertain}
          className="min-w-0 space-y-5 p-5 disabled:opacity-70 sm:p-6"
        >
          <RatingStars
            featured
            label={t('customer.rating.overallStars')}
            value={values.overallStars}
            onChange={(value) => setField('overallStars', value)}
            disabled={busy || uncertain}
          />
          <details className="rounded-2xl border border-border bg-muted/15 p-4">
            <summary className="cursor-pointer text-sm font-semibold transition-colors delay-0 duration-200 ease-out hover:text-primary">
              <SlidersHorizontal className="mr-2 inline size-4 text-primary" />
              {t('customer.rating.optionalCriteria')}
            </summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {RATING_CONFIG.CRITERIA.map((key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border/70 bg-card p-3"
                >
                  <RatingStars
                    label={t(`customer.rating.${key}`)}
                    value={values[key]}
                    onChange={(value) => setField(key, values[key] === value ? null : value)}
                    disabled={busy || uncertain}
                  />
                </div>
              ))}
            </div>
          </details>
          <label className="block space-y-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquareText className="size-4 text-primary" />
              {t('customer.rating.comment')}
            </span>
            <textarea
              aria-label={t('customer.rating.comment')}
              value={values.comment}
              maxLength={RATING_CONFIG.COMMENT_MAX}
              onChange={(event) => setField('comment', event.target.value)}
              className="min-h-28 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm outline-none transition-colors delay-0 duration-200 ease-out focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
            <span className="block text-right text-xs tabular-nums text-muted-foreground">
              {values.comment.length}
              /
              {RATING_CONFIG.COMMENT_MAX}
            </span>
          </label>
          <CustomerImagePicker
            selection={selection}
            disabled={busy || uncertain}
            help={t('customer.rating.imageHelp')}
          />
          <CustomerVideoPicker
            selection={videos}
            disabled={busy || uncertain}
          />
        </fieldset>
      </div>
      <div className="shrink-0 px-5 sm:px-6">
        <FormError>
          {error}
        </FormError>
        {uncertain && (
          <Button
            variant="outline"
            onClick={checkSaved}
            disabled={busy}
          >
            <RefreshCw size={16} />
            {t('customer.rating.checkSaved')}
          </Button>
        )}
      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/25 px-5 py-4 sm:px-6">
        <Button
          variant="secondary"
          className="h-11 rounded-xl px-4"
          onClick={onClose}
          disabled={busy}
        >
          {t('common.close')}
        </Button>
        <Button
          type="submit"
          className="h-11 rounded-xl px-4"
          disabled={busy || uncertain}
        >
          <Send size={16} />
          {t(busy ? 'customer.rating.sending' : 'customer.rating.submit')}
        </Button>
      </div>
    </form>
  )
}
