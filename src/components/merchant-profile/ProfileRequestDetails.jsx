import { useTranslation } from 'react-i18next'
import OpeningScheduleSummary from '~/components/OpeningSchedule/OpeningScheduleSummary'
import ResourceGallery from '~/components/ResourceThumbnail/ResourceGallery'
import PrivateDocumentCard from '~/components/documents/PrivateDocumentCard'

export default function ProfileRequestDetails({ value }) {
  const { t } = useTranslation()
  const keys = ['businessName', 'address', 'city', 'phone', 'openingSchedule', 'latitude', 'longitude', 'taxCode']
  const sides = ['current', 'proposed']
  const display = (data, key) => {
    if (key !== 'openingSchedule') {
      return String(data[key] ?? '—')
    }
    if (data.openingSchedule) {
      return (
        <div className="[&>div]:text-base">
          <OpeningScheduleSummary value={data.openingSchedule} />
        </div>
      )
    }
    let hours = data.openingHours
    try {
      hours = JSON.parse(hours)
    } catch { /* Legacy hours can also be plain text. */ }
    return typeof hours === 'string' && hours ? hours : '—'
  }
  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] table-fixed text-left text-base">
            <thead className="border-b border-border bg-muted">
              <tr>
                {['field', 'before', 'proposed'].map(key => (
                  <th
                    key={key}
                    scope="col"
                    className={`px-4 py-4 font-bold ${key === 'field' ? 'w-[26%]' : 'w-[37%]'}`}
                  >
                    {t(`admin.merchants.${key}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map(key => (
                <tr
                  key={key}
                  className={`align-top ${value.changedFields.some(field => field.toLowerCase() === key.toLowerCase() || key === 'openingSchedule' && field.toLowerCase() === 'openinghours') ? 'bg-primary/5 [&>th]:border-l-primary' : 'even:bg-muted/15 [&>th]:border-l-transparent'}`}
                >
                  <th
                    scope="row"
                    className="border-l-[3px] px-4 py-4 font-semibold leading-7"
                  >
                    {t(key === 'openingSchedule' ? 'schedule.title' : `admin.merchants.fields.${key}`)}
                  </th>
                  {sides.map(side => (
                    <td
                      key={side}
                      className={`whitespace-pre-wrap break-words px-4 py-4 leading-7 ${side === 'current' ? 'text-muted-foreground' : 'font-semibold'}`}
                    >
                      {display(value[side], key)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {sides.map(side => (
          <section
            key={side}
            className="min-w-0 space-y-3 rounded-2xl border border-border bg-muted/10 p-4"
          >
            <h3 className={`text-base font-bold ${side === 'proposed' ? 'text-primary' : ''}`}>
              {t(side === 'current' ? 'admin.merchants.before' : 'admin.merchants.proposed')}
            </h3>
            <ResourceGallery
              urls={value[side].imageUrls || []}
              name={value.merchantName}
              thumbnails
            />
          </section>
        ))}
      </div>
      {(value.current.documentsSnapshotIncluded || value.proposed.documentsSnapshotIncluded) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {sides.map(side => (
            <section
              key={side}
              className="min-w-0 space-y-3 rounded-2xl border border-border bg-muted/10 p-4"
            >
              <h3 className="text-base font-bold">
                {t(side === 'current' ? 'admin.merchants.before' : 'admin.merchants.proposed')}
              </h3>
              {value.documentMetadata?.[value[side].businessLicenseDocumentId] ? (
                <PrivateDocumentCard
                  document={value.documentMetadata[value[side].businessLicenseDocumentId]}
                  label={t('merchant.backendSync.businessLicense')}
                />
              ) : (
                <p className="text-base leading-7 text-muted-foreground">
                  {t('merchant.backendSync.noDocument')}
                </p>
              )}
            </section>
          ))}
        </div>
      )}
      {value.rejectionReason && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-base font-semibold text-rose-700 dark:text-rose-300">
          {value.rejectionReason}
        </p>
      )}
    </>
  )
}
