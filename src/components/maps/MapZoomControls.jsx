import { useTranslation } from 'react-i18next'
import { useEffect, useRef } from 'react'
import { DomEvent } from 'leaflet'
import { useMap } from 'react-leaflet'
import { Plus, Minus, LocateFixed } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { LOCKER_MAP } from '~/utils/config/constants'

export default function MapZoomControls({ position }) {
  const { t } = useTranslation()
  const map = useMap()
  const controls = useRef(null)
  useEffect(() => {
    DomEvent.disableClickPropagation(controls.current)
    DomEvent.disableScrollPropagation(controls.current)
  }, [])
  return (
    <div
      ref={controls}
      className="absolute left-3 top-3 z-[500] flex flex-col gap-1 rounded-xl border border-border bg-card p-1 shadow-md"
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('customer.zoomIn')}
        onClick={() => map.zoomIn(undefined, { animate: false })}
      >
        <Plus size={18} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={t('customer.zoomOut')}
        onClick={() => map.zoomOut(undefined, { animate: false })}
      >
        <Minus size={18} />
      </Button>
      {position && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('customer.backToMyLocation')}
          className="border-t border-border text-blue-600 dark:text-blue-400"
          onClick={() => map.setView([position.latitude, position.longitude], LOCKER_MAP.ZOOM, { animate: false })}
        >
          <LocateFixed size={18} />
        </Button>
      )}
    </div>
  )
}
