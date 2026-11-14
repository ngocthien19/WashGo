import ScrollSection from '~/components/motion/ScrollSection'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Warehouse } from 'lucide-react'
import { storageApi } from '~/apis/storage/storageApi'
import { customerCatalogApi, catalogImages } from '~/apis/customer/customerCatalogApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import Pagination from '~/components/Pagination/Pagination'
import CatalogToolbar from '~/components/CatalogToolbar/CatalogToolbar'
import StorageActionDialog from '~/components/storage/StorageActionDialog'
import StorageCycleCard from '~/components/storage/StorageCycleCard'
import { Button } from '~/components/ui/button'
import FormError from '~/components/ui/FormError'
import { formatCurrency, formatDateTime } from '~/utils/format/formats'

function ReturnRequest({ order, onUpdated }) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1), [keyword, setKeyword] = useState(''), [historyPage, setHistoryPage] = useState(1)
  const [choosing, setChoosing] = useState(false), [selected, setSelected] = useState(null), [quote, setQuote] = useState(null)
  const [action, setAction] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const cycles = useCatalogResource(useCallback(signal => storageApi.cycles(order.id, historyPage, signal), [order.id, historyPage]), order.revision)
  const lockers = useCatalogResource(useCallback(signal => choosing ? customerCatalogApi.getLockers({ page, take: 8, keyword: keyword || undefined }, signal) : Promise.resolve({ list: [], totalPages: 0 }), [choosing, page, keyword]))
  const targetId = cycles.data?.list[0]?.returnLockerId
  const target = useCatalogResource(useCallback(signal => targetId ? customerCatalogApi.getLocker(targetId, signal) : Promise.resolve(null), [targetId]))
  const current = cycles.data?.list.find(row => row.canRequestReturn || row.canCancelReturn)
  const pending = storageApi.hasPending(order.id)
  const done = () => {
    setAction(null); setQuote(null); setChoosing(false); cycles.retry(); onUpdated()
  }
  const getQuote = async () => {
    if (busy || !selected) {
      return
    }
    setBusy(true); setError(''); setQuote(null)
    try {
      setQuote(await storageApi.quote(order.id, selected.id))
    } catch {
      setError('storage.customerError')
    } finally {
      setBusy(false)
    }
  }
  return (
    <ScrollSection className="space-y-4 rounded-2xl border border-primary/20 bg-card p-5">
      <h2 className="flex items-center gap-3 text-lg font-bold">
        <Warehouse className="text-primary" />
        {t([13, 14, 15].includes(order.status) ? 'storage.customerTitle' : 'storage.history')}
      </h2>
      <p className="text-sm text-muted-foreground">
        {t([13, 14, 15].includes(order.status) ? 'storage.customerHint' : 'storage.historyHint')}
      </p>
      {cycles.loading || cycles.error ? <ResourceFeedback {...cycles} /> : (
        <div
          data-pagination-scope
          className="space-y-4"
        >
          {cycles.data.list.map(row => (
            <StorageCycleCard
              key={row.id}
              row={row}
              role="Customer"
            />
          ))}
          {!cycles.data.list.length && (
            <p>
              {t(order.storageWorkflowVersion === 0 ? 'storage.legacyCustomer' : 'storage.noCycles')}
            </p>
          )}
          <Pagination
            currentPage={historyPage}
            totalPages={cycles.data.totalPages}
            onPageChange={setHistoryPage}
          />
        </div>
      )}
      {targetId && (
        <section className="space-y-3 rounded-xl border border-border p-4">
          <h3 className="font-semibold">
            {t('storage.returnStation')}
          </h3>
          {target.loading || target.error ? <ResourceFeedback {...target} /> : (
            <div className="flex items-start gap-3">
              <ResourceThumbnail
                urls={catalogImages(target.data)}
                name={target.data?.name}
              />
              <div>
                <strong>
                  {target.data?.name || '\u2014'}
                </strong>
                <p className="text-sm text-muted-foreground">
                  {target.data?.address}
                </p>
              </div>
            </div>
          )}
        </section>
      )}
      {pending ? (
        <Button onClick={() => setAction('return-request')}>
          {t('admin.sync.checkResult')}
        </Button>
      ) : (
        <div className="flex flex-wrap gap-3">
          {current?.canRequestReturn && (
            <Button
              className="h-11"
              onClick={() => {
                setChoosing(value => !value); setQuote(null)
              }}
            >
              {t('storage.chooseLocker')}
            </Button>
          )}
          {current?.canCancelReturn && (
            <Button
              className="h-11"
              variant="outline"
              onClick={() => setAction('cancel-return')}
            >
              {t('storage.actions.cancel-return')}
            </Button>
          )}
        </div>
      )}
      {choosing && !pending && (
        <div
          data-pagination-scope
          className="space-y-4 border-t border-border pt-4"
        >
          <CatalogToolbar
            embedded
            keyword={keyword}
            onSearch={value => {
              setKeyword(value); setPage(1)
            }}
            label={t('storage.chooseLocker')}
            placeholder={t('storage.searchLocker')}
          />
          <p className="text-sm text-muted-foreground">
            {t('storage.quoteHint')}
          </p>
          {lockers.loading || lockers.error ? <ResourceFeedback {...lockers} /> : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {lockers.data.list.map(locker => (
                  <button
                    key={locker.id}
                    type="button"
                    aria-pressed={selected?.id === locker.id}
                    disabled={busy || current?.canCancelReturn && current.returnLockerId !== locker.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 text-left ${selected?.id === locker.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}
                    onClick={() => {
                      setSelected(locker); setQuote(null); setError('')
                    }}
                  >
                    <ResourceThumbnail
                      urls={catalogImages(locker)}
                      name={locker.name}
                    />
                    <span className="min-w-0">
                      <strong className="block">
                        {locker.name}
                      </strong>
                      <span className="text-sm text-muted-foreground">
                        {locker.address}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {!lockers.data.list.length && <ResourceFeedback empty="storage.noLockers" />}
              <Pagination
                currentPage={page}
                totalPages={lockers.data.totalPages}
                onPageChange={setPage}
              />
            </>
          )}
          <FormError>
            {error}
          </FormError>
          <Button
            className="h-11"
            disabled={busy || !selected || cycles.loading || !current}
            onClick={getQuote}
          >
            {t('storage.getQuote')}
          </Button>
          {quote && (
            <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <strong>
                {selected.name}
              </strong>
              <p>
                {selected.address}
              </p>
              <p>
                {t('storage.feeTotal')}
                :
                {' '}
                <strong>
                  {formatCurrency(quote.feeTotal)}
                </strong>
              </p>
              <p>
                {t('storage.outstanding')}
                :
                {' '}
                <strong>
                  {formatCurrency(quote.outstanding)}
                </strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {t('storage.expiresAt')}
                :
                {' '}
                {formatDateTime(quote.expiresAt)}
              </p>
              <Button
                className="h-11"
                onClick={() => setAction('return-request')}
              >
                {t('storage.actions.return-request')}
              </Button>
            </div>
          )}
        </div>
      )}
      {action && (
        <StorageActionDialog
          order={order}
          cycle={current}
          action={action}
          role="Customer"
          quote={action === 'return-request' ? quote : undefined}
          onClose={done}
          onSaved={done}
        />
      )}
    </ScrollSection>
  )
}
export default function StoragePickup(props) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  if ([13, 14, 15].includes(props.order.status) || expanded) {
    return (
      <ReturnRequest
        key={props.order.id}
        {...props}
      />
    )
  }
  return props.order.storageWorkflowVersion >= 1 && [10, 11, 12, 99].includes(props.order.status) ? (
    <Button
      variant="outline"
      className="h-11"
      onClick={() => setExpanded(true)}
    >
      {t('storage.history')}
    </Button>
  ) : null
}
