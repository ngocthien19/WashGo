import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Settings, RefreshCw, Info, Warehouse } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog'
import Reveal from '~/components/motion/Reveal'
import ResourceFeedback from '~/components/ResourceFeedback/ResourceFeedback'
import useCatalogResource from '~/hooks/useCatalogResource'
import { adminSystemSettingApi } from '~/apis/admin/adminSystemSettingApi'
import { formatDateTime, formatNumber } from '~/utils/formats'
import SettingForm from './SettingForm'
import AuditPanel from '../Audit/AuditPanel'
import { useSearchParams } from 'react-router-dom'
import { settingGroups } from './settingModel'

export default function SystemSettingsPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [group, setGroup] = useState(params.get('tab') === 'audit' ? 'audit' : 'sla'), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [leave, setLeave] = useState(null)
  const auditOpen = group === 'audit'
  const resource = useCatalogResource(useCallback(signal => auditOpen ? Promise.resolve(null) : adminSystemSettingApi.get(signal), [auditOpen]))
  useEffect(() => {
    document.title = `${t('admin.nav.settings')} | WashGo`
  }, [t])
  useEffect(() => {
    if (!dirty) {
      return
    }
    const prevent = event => {
      event.preventDefault(); event.returnValue = ''
    }
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [dirty])
  const navigate = target => {
    if (busy || target === group) {
      return
    }
    if (dirty) {
      setLeave(target); return
    }
    if (target === 'refresh') {
      resource.retry()
    } else {
      setGroup(target)
    }
  }
  return (
    <Reveal className="mx-auto max-w-[1400px] space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Settings className="text-primary" />
            {t('admin.nav.settings')}
          </h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            {t('admin.settings.description')}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={resource.loading || busy}
          onClick={() => navigate('refresh')}
          className="h-11 px-5 text-base"
        >
          <RefreshCw size={18} />
          {t('customer.orders.refresh')}
        </Button>
      </header>
      <div className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm leading-relaxed">
        <Info
          size={20}
          className="mt-0.5 shrink-0 text-primary"
        />
        <p>
          {t('admin.settings.applyHint')}
        </p>
      </div>
      <div
        role="tablist"
        aria-label={t('admin.nav.settings')}
        className="flex gap-4 overflow-x-auto border-b border-border"
      >
        {[...Object.keys(settingGroups), 'audit'].map(key => (
          <Button
            key={key}
            role="tab"
            aria-selected={key === group}
            disabled={busy}
            variant="ghost"
            onClick={() => navigate(key)}
            className={`h-12 shrink-0 rounded-none border-x-0 border-t-0 border-b-2 px-3 text-lg hover:bg-transparent ${key === group ? 'border-b-primary text-primary' : 'border-b-transparent text-muted-foreground'}`}
          >
            {t(key === 'audit' ? 'admin.workspaceSync.audit' : `admin.settings.groups.${key}`)}
          </Button>
        ))}
      </div>
      {group === 'audit' ? <AuditPanel /> : resource.loading || resource.error || !resource.data ? (
        <ResourceFeedback
          {...resource}
          loadingText="merchant.loading"
        />
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <SettingForm
              key={group}
              group={group}
              data={resource.data}
              onDirty={setDirty}
              onBusy={setBusy}
              onSaved={resource.retry}
            />
          </div>
          <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="border-b border-border pb-3 text-lg font-semibold">
              {t('admin.settings.currentConfig')}
            </h2>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('admin.settings.updatedAt')}
              </p>
              <p className="mt-2 font-medium">
                {resource.data.updatedAt ? formatDateTime(resource.data.updatedAt, 'Asia/Ho_Chi_Minh') : t('admin.settings.noUpdate')}
              </p>
            </div>
            <div className="rounded-xl border border-violet-500/15 bg-violet-500/5 p-4">
              <Warehouse
                size={21}
                className="mb-3 text-violet-600 dark:text-violet-300"
              />
              <h3 className="font-medium">
                {t('admin.settings.storageTransfer')}
              </h3>
              <p className="mt-2 text-2xl font-semibold">
                {formatNumber(resource.data.storageTransferAfterHours)}
                {' '}
                <span className="text-sm font-medium">
                  {t('admin.settings.units.hours')}
                </span>
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t('admin.settings.storageFixed')}
              </p>
            </div>
          </aside>
        </div>
      )}
      {leave && (
        <Dialog
          open
          onOpenChange={open => {
            if (!open) {
              setLeave(null)
            }
          }}
        >
          <DialogContent
            className="max-w-lg"
            closeLabel="common.close"
          >
            <DialogHeader tone="warning">
              <DialogTitle className="flex items-center gap-3 pr-8 text-2xl font-semibold">
                <Info />
                {t('admin.settings.discardTitle')}
              </DialogTitle>
              <DialogDescription className="mt-3 text-base text-muted-foreground">
                {t('admin.settings.discardHint')}
              </DialogDescription>
            </DialogHeader>
            <footer className="mt-5 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
              <Button
                variant="secondary"
                onClick={() => setLeave(null)}
                className="h-11 px-5 text-base"
              >
                {t('common.close')}
              </Button>
              <Button
                onClick={() => {
                  const target = leave; setLeave(null); setDirty(false); if (target === 'refresh') {
                    resource.retry()
                  } else {
                    setGroup(target)
                  }
                }}
                className="h-11 px-5 text-base"
              >
                {t('admin.settings.discard')}
              </Button>
            </footer>
          </DialogContent>
        </Dialog>
      )}
    </Reveal>
  )
}
