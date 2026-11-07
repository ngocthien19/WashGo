import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleMarker, MapContainer, TileLayer, Tooltip as MapTooltip, useMapEvents } from 'react-leaflet'
import { Crosshair, RefreshCw } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import { ADDRESS_MAP, LOCKER_MAP } from '~/utils/constants'
import { Button } from '~/components/ui/button'
import MapZoomControls from './MapZoomControls'

function MapInteraction({ onPick, focus }) {
  const { t } = useTranslation()
  const map = useMapEvents({
    click: ({ latlng, originalEvent }) => {
      if (!originalEvent?.target?.closest('button, a')) {
        onPick({ latitude: latlng.lat, longitude: latlng.lng })
      }
    }
  })
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    map.invalidateSize()
    return () => observer.disconnect()
  }, [map])
  useEffect(() => {
    if (focus) {
      map.setView([focus.latitude, focus.longitude], LOCKER_MAP.ZOOM, { animate: false })
    }
  }, [map, focus])
  return (
    <Button
      className="absolute bottom-6 left-3 z-[500] h-9 rounded-xl bg-card text-foreground shadow-md hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-muted"
      variant="outline"
      onClick={() => {
        const center = map.getCenter()
        onPick({ latitude: center.lat, longitude: center.lng })
      }}
    >
      <Crosshair size={16} />
      {t('customer.addressMap.pickCenter')}
    </Button>
  )
}

export default function AddressMap({ initialCenter, point, userPosition, focus, onPick }) {
  const { t } = useTranslation()
  const [tileError, setTileError] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const loaded = useRef(false)
  const center = initialCenter || ADDRESS_MAP.DEFAULT_CENTER
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!loaded.current) {
        setTileError(true)
      }
    }, LOCKER_MAP.TILE_TIMEOUT_MS)
    return () => clearTimeout(timeout)
  }, [attempt])
  return (
    <div
      role="region"
      aria-label={t('customer.addressMap.mapLabel')}
      className="relative isolate overflow-hidden rounded-2xl border border-border bg-muted"
    >
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={ADDRESS_MAP.INITIAL_ZOOM}
        maxZoom={LOCKER_MAP.MAX_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="z-0 h-64 w-full cursor-crosshair sm:h-80"
      >
        <TileLayer
          key={attempt}
          url={LOCKER_MAP.TILE_URL}
          attribution={LOCKER_MAP.ATTRIBUTION}
          maxZoom={LOCKER_MAP.MAX_ZOOM}
          eventHandlers={{
            tileerror: () => setTileError(true),
            tileload: () => {
              loaded.current = true
            }
          }}
        />
        <MapInteraction
          onPick={onPick}
          focus={focus}
        />
        <MapZoomControls position={userPosition} />
        {userPosition && (
          <CircleMarker
            center={[userPosition.latitude, userPosition.longitude]}
            radius={7}
            interactive={false}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: LOCKER_MAP.USER_COLOR, fillOpacity: 1 }}
          >
            <MapTooltip direction="top">
              {t('customer.yourLocation')}
            </MapTooltip>
          </CircleMarker>
        )}
        {point && (
          <CircleMarker
            center={[point.latitude, point.longitude]}
            radius={13}
            interactive={false}
            pathOptions={{ color: LOCKER_MAP.ACTIVE_COLOR, weight: 3, fillColor: LOCKER_MAP.ACTIVE_COLOR, fillOpacity: 0.3 }}
          >
            <MapTooltip
              permanent
              direction="top"
              offset={[0, -12]}
            >
              {t('customer.addressMap.selectedPoint')}
            </MapTooltip>
          </CircleMarker>
        )}
      </MapContainer>
      {tileError && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border bg-card p-3 text-xs text-muted-foreground">
          <p className="flex-1 basis-40">
            {t('customer.addressMap.tileError')}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              loaded.current = false
              setTileError(false)
              setAttempt((value) => value + 1)
            }}
          >
            <RefreshCw size={14} />
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
    </div>
  )
}
