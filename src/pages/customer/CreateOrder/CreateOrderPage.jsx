import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Check, LoaderCircle, ShoppingBag } from 'lucide-react'
import Breadcrumb from '~/components/Breadcrumb/Breadcrumb'
import SectionHeading from '~/components/customer/SectionHeading/SectionHeading'
import Reveal from '~/components/motion/Reveal'
import FormError from '~/components/ui/FormError'
import { Button } from '~/components/ui/button'
import { customerCatalogApi } from '~/apis/customer/customerCatalogApi'
import { customerOrderApi } from '~/apis/customer/customerOrderApi'
import useCatalogResource from '~/hooks/customer/useCatalogResource'
import { CUSTOMER_ROUTES } from '~/utils/constants'
import { getApiError } from '~/utils/apiError'
import { orderDetailsSchema, toCreateOrder, toOrderItems, validOrderItems } from './orderModel'
import OrderStepper from './components/OrderStepper'
import OrderServices from './components/OrderServices'
import OrderLocker from './components/OrderLocker'
import OrderConfirmation from './components/OrderConfirmation'
import OrderSuccess from './components/OrderSuccess'

export default function CreateOrderPage() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [items, setItems] = useState([])
  const [locker, setLocker] = useState(null)
  const [box, setBox] = useState(null)
  const [promotionCode, setPromotionCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uncertain, setUncertain] = useState(false)
  const [order, setOrder] = useState(null)
  const pending = useRef(false)
  const active = useRef(true)
  const stepTitle = useRef(null)
  const form = useForm({ resolver: yupResolver(orderDetailsSchema), defaultValues: { customerNote: '', promotionCode: '' } })
  const loadQuote = useCallback((signal) => step === 2
    ? customerOrderApi.quote({ lockerId: locker.id, items: toOrderItems(items), promotionCode: promotionCode || null }, signal)
    : Promise.resolve(null), [step, locker, items, promotionCode])
  const quote = useCatalogResource(loadQuote)
  const codeDraft = useWatch({ control: form.control, name: 'promotionCode' }).trim()
  const canSubmit = !quote.loading && !!quote.data && !quote.error && codeDraft === promotionCode && !uncertain

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    document.title = `${t('common.createAnOrder')} | WashGo`
  }, [t])
  useEffect(() => {
    stepTitle.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (order) {
      document.getElementById('order-success-title')?.focus({ preventScroll: true })
    }
  }, [step, order])

  const next = async () => {
    if (pending.current) {
      return
    }
    setError('')
    if (!validOrderItems(items)) {
      setError('customer.order.invalidItems')
      return
    }
    if (step === 0) {
      setStep(1)
      return
    }
    if (!locker || !box) {
      setError('customer.order.chooseLockerBox')
      return
    }
    pending.current = true
    setBusy(true)
    try {
      const fresh = await customerCatalogApi.getLocker(locker.id)
      if (!active.current) {
        return
      }
      if (!fresh.availableSlots?.some((slot) => slot.id === box.id)) {
        setBox(null)
        setError('customer.order.boxUnavailable')
      } else {
        setStep(2)
      }
    } catch (failure) {
      if (active.current) {
        setBox(null)
        setError(getApiError(failure))
      }
    } finally {
      pending.current = false
      if (active.current) {
        setBusy(false)
      }
    }
  }

  const apply = async (code) => {
    if (busy) {
      return
    }
    if (typeof code === 'string') {
      form.setValue('promotionCode', code, { shouldValidate: true })
    }
    if (await form.trigger('promotionCode')) {
      const nextCode = form.getValues('promotionCode').trim()
      setPromotionCode(nextCode)
      if (nextCode === promotionCode) {
        quote.retry()
      }
    }
  }

  const create = (event) => form.handleSubmit(async (values) => {
    if (pending.current || !canSubmit || !validOrderItems(items) || !locker || !box) {
      return
    }
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const result = await customerOrderApi.create(toCreateOrder({ items, locker, box, customerNote: values.customerNote, promotionCode }))
      if (!result.id || !result.orderCode || !Number.isFinite(result.finalAmount)) {
        // The server may already have created the order even if its response is incomplete.
        throw new Error('customer.order.unknownOutcome')
      }
      if (active.current) {
        setOrder(result)
        form.reset()
      }
    } catch (failure) {
      if (active.current) {
        const status = failure.response?.status
        const unknown = !status || status >= 500
        setUncertain(unknown)
        setError(unknown ? 'customer.order.unknownOutcome' : getApiError(failure))
        if (status === 400 || status === 409 || status === 404) {
          setBox(null)
          setStep(1)
        }
      }
    } finally {
      pending.current = false
      if (active.current) {
        setBusy(false)
      }
    }
  })(event)

  return (
    <div className="min-h-[70dvh] bg-muted/35">
      <div className="mx-auto max-w-7xl space-y-7 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: t('common.home'), to: CUSTOMER_ROUTES.HOME }, { label: t('common.createAnOrder') }]} />
        {order ? (
          <Reveal>
            <OrderSuccess order={order} />
          </Reveal>
        ) : (
          <>
            <SectionHeading
              as="h1"
              title={t('common.createAnOrder')}
              description={t('customer.order.description')}
              icon={ShoppingBag}
            />
            <OrderStepper step={step} />
            <h2
              ref={stepTitle}
              tabIndex={-1}
              className="text-xl font-semibold outline-none"
            >
              {t(`customer.order.${['services', 'locker', 'confirm'][step]}`)}
            </h2>
            <Reveal key={step}>
              <fieldset
                disabled={busy || uncertain}
                className="min-w-0"
                aria-busy={busy}
              >
                {step === 0 && (
                  <OrderServices
                    items={items}
                    onChange={setItems}
                  />
                )}
                {step === 1 && (
                  <OrderLocker
                    locker={locker}
                    box={box}
                    onLocker={(nextLocker) => {
                      if (nextLocker.id !== locker?.id) {
                        setLocker(nextLocker)
                        setBox(null)
                      }
                    }}
                    onBox={setBox}
                  />
                )}
                {step === 2 && (
                  <OrderConfirmation
                    items={items}
                    locker={locker}
                    box={box}
                    form={form}
                    quote={quote}
                    promotionCode={promotionCode}
                    codeDirty={codeDraft !== promotionCode}
                    onApply={apply}
                    onClear={() => {
                      form.setValue('promotionCode', '')
                      setPromotionCode('')
                    }}
                    busy={busy || uncertain}
                  />
                )}
              </fieldset>
            </Reveal>
            <FormError>
              {error}
            </FormError>
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-card to-primary/8 p-4 shadow-sm sm:p-5">
              {step > 0 ? (
                <Button
                  variant="outline-primary"
                  className="h-11"
                  disabled={busy || uncertain}
                  onClick={() => {
                    setStep(step - 1)
                    setError('')
                  }}
                >
                  <ArrowLeft />
                  {t('customer.order.back')}
                </Button>
              ) : (
                <p className="max-w-sm text-xs leading-6 text-muted-foreground">
                  {t('customer.order.selectionNote')}
                </p>
              )}
              <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-4">
                {locker && box && step > 0 && (
                  <div className="min-w-0 max-w-80 text-right">
                    <p className="text-xs text-muted-foreground">
                      {t('customer.order.selectedCompartment')}
                    </p>
                    <p className="mt-1 flex items-center justify-end gap-2 text-base font-semibold">
                      <span className="max-w-40 truncate sm:max-w-56">
                        {locker.name}
                      </span>
                      <span className="shrink-0 text-primary">
                        -
                      </span>
                      <span className="shrink-0 text-primary">
                        {t('customer.order.box', { number: box.slotNumber })}
                      </span>
                    </p>
                  </div>
                )}
                <Button
                  className="h-11 px-5 shadow-md shadow-primary/20 disabled:opacity-65"
                  disabled={busy || uncertain || (step === 0 && !validOrderItems(items)) || (step === 1 && (!locker || !box)) || (step === 2 && !canSubmit)}
                  onClick={step === 2 ? create : next}
                >
                  {busy && (
                    <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                  )}
                  {t(step === 2 ? 'customer.order.create' : 'customer.order.next')}
                  {step === 2 ? <Check /> : <ArrowRight className="transition-transform delay-0 duration-150 ease-out group-hover/button:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none" />}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
