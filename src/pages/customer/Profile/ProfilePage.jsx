import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'
import { customerProfileApi } from '~/apis/customer/customerProfileApi'
import useCatalogResource from '~/hooks/useCatalogResource'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import CatalogFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import { CUSTOMER_ROUTES } from '~/utils/config/constants'
import ProfileEditor from './components/ProfileEditor'

export default function ProfilePage() {
  const { t } = useTranslation()
  const { data, loading, error, retry } = useCatalogResource(customerProfileApi.getProfile)
  useEffect(() => {
    document.title = t('customer.profile.pageTitle')
  }, [t])
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  return (
    <div className="min-h-[70dvh] bg-muted/35">
      <div className="mx-auto max-w-7xl space-y-7 px-4 pb-20 pt-8 sm:px-6 lg:px-8">
        <Breadcrumb
          items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('customer.profile.title') }]}
        />
        <SectionHeading
          as="h1"
          icon={UserRound}
          title={t('customer.profile.title')}
          description={t('customer.profile.description')}
        />
        {loading || error || !data ? (
          <div className="rounded-3xl border border-border bg-card p-5">
            <CatalogFeedback
              loading={loading}
              error={error}
              retry={retry}
              loadingText="customer.profile.loading"
              empty="customer.profile.notFound"
            />
          </div>
        ) : (
          <ProfileEditor
            key={data.id}
            profile={data}
          />
        )}
      </div>
    </div>
  )
}
