import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Store } from 'lucide-react'
import LockerDialog from '~/pages/merchant/Lockers/components/LockerDialog'
import { adminLockerApi } from '~/apis/admin/adminLockerApi'
import { ADMIN_ROUTES } from '~/utils/constants'
import LockerActionDialog from './LockerActionDialog'

export default function LockerDetails({ id, tab, onClose, onSaved }) {
  const { t } = useTranslation()
  const [action, setAction] = useState(null)
  return (
    <>
      <LockerDialog
        id={id}
        initialTab={tab}
        onClose={onClose}
        api={adminLockerApi}
        orderBase={ADMIN_ROUTES.ORDERS}
        renderExtra={locker => (
          <section className="rounded-2xl border border-border p-5">
            <h3 className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-lg font-semibold">
              <Store
                size={20}
                className="text-primary"
              />
              {t('admin.lockers.merchants')}
            </h3>
            {locker.merchants?.length ? (
              <ol className="space-y-3">
                {[...locker.merchants].sort((a, b) => a.priority - b.priority).map(merchant => (
                  <li
                    key={merchant.merchantId}
                    className="flex items-center gap-3"
                  >
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                      {t('admin.lockers.priority', { value: merchant.priority })}
                    </span>
                    <span className="font-semibold">
                      {merchant.businessName}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground">
                {t('admin.lockers.noMerchants')}
              </p>
            )}
          </section>
        )}
        onBoxAction={(locker, box, retry) => setAction({ locker, box, retry })}
      />
      {action && (
        <LockerActionDialog
          locker={action.locker}
          box={action.box}
          onClose={() => setAction(null)}
          onSaved={() => {
            action.retry(); setAction(null); onSaved()
          }}
        />
      )}
    </>
  )
}
