import { useTranslation } from 'react-i18next'
import { MessageSquareQuote } from 'lucide-react'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'

export default function CustomerFeedback() {
  const { t } = useTranslation()
  // Public moderated feedback is not exposed by the Customer API yet.
  return (
    <section
      aria-labelledby="customer-feedback-heading"
      className="border-y border-primary/10 bg-primary/3"
    >
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          id="customer-feedback-heading"
          icon={MessageSquareQuote}
          title={t('catalogUi.feedbackTitle')}
          description={t('catalogUi.feedbackDescription')}
        />
        <div className="mt-8 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-primary/20 bg-card px-6 py-10 text-center">
          <MessageSquareQuote className="size-14 rounded-2xl bg-primary/10 p-3 text-primary" />
          <p className="max-w-xl text-base leading-7 text-muted-foreground">
            {t('catalogUi.feedbackEmpty')}
          </p>
        </div>
      </div>
    </section>
  )
}
