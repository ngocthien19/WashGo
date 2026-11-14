import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { customerReceiptApi } from '~/apis/customer/customerReceiptApi'
import { notify } from '~/utils/notifications/notifications'
import { getApiError } from '~/utils/http/apiError'
export default function ReceiptDownload({ orderId, disabled }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  return (
    <Button
      className="h-11 px-4"
      variant="outline"
      disabled={disabled || busy}
      onClick={async () => {
        if (lock.current) {
          return
        }
        lock.current = true; setBusy(true)
        try {
          await customerReceiptApi.download(orderId)
        } catch (error) {
          notify.error(getApiError(error))
        } finally {
          lock.current = false; setBusy(false)
        }
      }}
    >
      <Download size={16} />
      {t('customer.sync.downloadPdf')}
    </Button>
  )
}
