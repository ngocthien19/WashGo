import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, LoaderCircle, MapPinned } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '~/components/ui/dialog'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import LocationButton from '~/components/maps/LocationButton'
import useGeolocation from '~/hooks/useGeolocation'
import { addressApi } from '~/apis/location/addressApi'
import { ADDRESS_MAP, TEXT_LINK_STYLES } from '~/utils/config/constants'
import AddressMap from './AddressMap'

export default function AddressPickerDialog({ initialCenter, onApply, onClose }) {
  const { t } = useTranslation()
  const { position, locating, locationError, requestLocation } = useGeolocation()
  const [selection, setSelection] = useState(null)
  const [focus, setFocus] = useState(null)
  const active = useRef(false)
  const pending = useRef(null)
  const version = useRef(0)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      pending.current?.controller.abort()
      clearTimeout(pending.current?.timer)
    }
  }, [])

  const pick = (point) => {
    version.current += 1
    pending.current?.controller.abort()
    clearTimeout(pending.current?.timer)
    const controller = new AbortController()
    setSelection({ point, loading: true, error: '', address: null })
    const timer = setTimeout(async () => {
      try {
        const address = await addressApi.reverse(point, controller.signal)
        if (active.current && !controller.signal.aborted) {
          setSelection({ point, address, loading: false, error: '' })
        }
      } catch (error) {
        if (active.current && !controller.signal.aborted) {
          const key = error.message?.startsWith('customer.addressMap.')
            ? error.message : 'customer.addressMap.lookupError'
          setSelection({ point, address: null, loading: false, error: key })
        }
      }
    }, ADDRESS_MAP.DEBOUNCE_MS)
    pending.current = { controller, timer }
  }

  const locate = async () => {
    const currentVersion = version.current
    const next = await requestLocation()
    if (next && active.current && version.current === currentVersion) {
      setFocus(next)
      pick(next)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent
        closeLabel="customer.addressMap.close"
        className="flex max-w-3xl flex-col overflow-hidden rounded-3xl p-0 sm:p-0"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-primary/15 bg-gradient-to-br from-primary/15 to-card p-5 pr-14 sm:px-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <MapPinned size={23} />
          </span>
          <div>
            <DialogTitle className="text-lg font-bold">
              {t('customer.addressMap.title')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-6 text-muted-foreground">
              {t('customer.addressMap.instructions')}
            </DialogDescription>
          </div>
        </div>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-muted-foreground">
              {t('customer.addressMap.keyboardHint')}
            </p>
            <LocationButton
              locating={locating}
              onClick={locate}
            />
          </div>
          <FormError>
            {locationError}
          </FormError>
          <AddressMap
            initialCenter={initialCenter}
            point={selection?.point}
            userPosition={position}
            focus={focus}
            onPick={pick}
          />
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm"
          >
            {selection?.loading ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                {t('customer.addressMap.lookingUp')}
              </p>
            ) : selection?.address ? (
              <>
                <dl className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['address', 'customer.profile.address'], ['city', 'customer.provinceCity']
                  ].map(([field, label]) => (
                    <div
                      key={field}
                      className={field === 'address' ? 'sm:col-span-2' : ''}
                    >
                      <dt className="text-xs text-muted-foreground">
                        {t(label)}
                      </dt>
                      <dd className="mt-1 break-words">
                        {selection.address[field] || t('customer.addressMap.missingField')}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">
                  {t('customer.addressMap.reviewHint')}
                </p>
                {selection.address.boundaryStatus && (
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {t(`customer.addressMap.${selection.address.boundaryStatus === 'matched'
                      ? 'provinceHint' : selection.address.boundaryStatus === 'error' ? 'boundaryError' : 'boundaryUnavailable'}`)}
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                {t('customer.addressMap.selectHint')}
              </p>
            )}
          </div>
          <FormError>
            {selection?.error}
          </FormError>
          {(selection?.error || selection?.address?.boundaryStatus === 'error') && (
            <Button
              variant="outline"
              onClick={() => pick(selection.point)}
            >
              {t('common.tryAgain')}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            {t('customer.addressMap.geocodingBy')}
            {' '}
            <a
              href="https://photon.komoot.io"
              target="_blank"
              rel="noopener noreferrer"
              className={TEXT_LINK_STYLES}
            >
              Photon / OpenStreetMap
            </a>
            {' · '}
            <a
              href={`${import.meta.env.BASE_URL}data/customer/provinces/SOURCE.md`}
              target="_blank"
              rel="noopener noreferrer"
              className={TEXT_LINK_STYLES}
            >
              tinhthanhpho.com (CC BY 4.0)
            </a>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border bg-muted/20 p-4 sm:px-6">
          <Button
            variant="secondary"
            className="h-10 rounded-xl px-4"
            onClick={onClose}
          >
            {t('customer.addressMap.cancel')}
          </Button>
          <Button
            className="h-10 rounded-xl px-5"
            disabled={!selection?.address || selection.loading}
            onClick={() => onApply({ ...selection.address, position: selection.point })}
          >
            <Check size={16} />
            {t('customer.addressMap.apply')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
