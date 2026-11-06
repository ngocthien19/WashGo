import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Camera, ImageUp } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { decodeQrImage } from '~/utils/qrScanner'
import { QR_SCAN } from '~/utils/constants'

export default function QrScanInput({ onCode, onClear, disabled, hasCode }) {
  const { t } = useTranslation()
  const [camera, setCamera] = useState(false)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const input = useRef(null)
  const version = useRef(0)
  useEffect(() => () => {
    version.current += 1
  }, [])
  const accept = (value) => {
    setCamera(false)
    onCode(value)
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline-primary"
          disabled={disabled || reading}
          onClick={() => {
            setError(''); onClear(); setCamera(!camera)
          }}
        >
          <Camera size={16} />
          {t(camera ? 'customer.orders.scan.stopCamera' : 'customer.orders.scan.camera')}
        </Button>
        <Button
          variant="outline-violet"
          disabled={disabled || reading}
          onClick={() => input.current?.click()}
        >
          <ImageUp size={16} />
          {t(reading ? 'customer.orders.scan.reading' : 'customer.orders.scan.upload')}
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept={QR_SCAN.MIME_TYPES.join(',')}
        className="sr-only"
        aria-label={t('customer.orders.scan.upload')}
        disabled={disabled || reading}
        onChange={async (event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (!file) {
            return
          }
          setCamera(false)
          onClear()
          setReading(true)
          setError('')
          const current = ++version.current
          try {
            const code = await decodeQrImage(file)
            if (current === version.current) {
              accept(code)
            }
          } catch (failure) {
            if (current === version.current) {
              setError(failure.message?.startsWith('customer.orders.scan.') ? failure.message : 'customer.orders.scan.noCode')
            }
          } finally {
            if (current === version.current) {
              setReading(false)
            }
          }
        }}
      />
      {camera && !disabled && (
        <div className="overflow-hidden rounded-xl bg-slate-950">
          <Scanner
            formats={['qr_code']}
            sound={false}
            constraints={{ facingMode: 'environment' }}
            components={{ audio: false, finder: true, onOff: false, torch: false, zoom: false }}
            onScan={(codes) => {
              if (codes[0]?.rawValue) {
                accept(codes[0].rawValue)
              }
            }}
            onError={() => {
              setCamera(false); setError('customer.orders.scan.cameraError')
            }}
          />
        </div>
      )}
      {hasCode && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
        >
          {t('customer.orders.scan.ready')}
        </p>
      )}
      <FormError>
        {error}
      </FormError>
    </div>
  )
}
