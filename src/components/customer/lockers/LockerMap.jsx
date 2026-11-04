import MapZoomControls from '~/components/customer/maps/MapZoomControls'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon, latLngBounds } from 'leaflet'
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip as MapTooltip, useMap } from 'react-leaflet'
import { MapPin, ExternalLink, RefreshCw } from 'lucide-react'
import washgoMarkerUrl from '~/assets/logo-washgo.svg'
import { Button } from '~/components/ui/button'
import markerUrl from 'leaflet/dist/images/marker-icon.png'
import markerRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { LOCKER_MAP, TEXT_LINK_STYLES } from '~/utils/constants'
import { formatLockerAddress, getLockerMapLink, hasCoordinates } from '~/utils/formats'

const markerIcon = new Icon({
  iconUrl: markerUrl,
  iconRetinaUrl: markerRetinaUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const activeMarkerIcon = new Icon({
  iconUrl: washgoMarkerUrl,
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -38],
  className: 'drop-shadow-lg'
})

function LockerMarker({ locker, active, selectionVersion, onSelect }) {
  const { t } = useTranslation()
  const marker = useRef(null)
  useEffect(() => {
    // Leaflet creates the image outside React, so update its accessible name explicitly.
    const element = marker.current?.getElement()
    element?.setAttribute('alt', `${active ? t('customer.selected') : t('customer.location')}${locker.name}`)
    if (active) {
      marker.current?.openPopup()
    } else {
      marker.current?.closePopup()
    }
  }, [active, selectionVersion, locker.name, t])
  return (
    <>
      {active && (
        <CircleMarker
          center={[locker.latitude, locker.longitude]}
          radius={25}
          pathOptions={{ color: LOCKER_MAP.ACTIVE_COLOR, weight: 2, fillColor: LOCKER_MAP.ACTIVE_COLOR, fillOpacity: 0.18 }}
          interactive={false}
        />
      )}
      <Marker
        ref={marker}
        position={[locker.latitude, locker.longitude]}
        icon={active ? activeMarkerIcon : markerIcon}
        alt={`${active ? t('customer.selected') : t('customer.location')}${locker.name}`}
        zIndexOffset={active ? 1000 : 0}
        eventHandlers={{ click: () => onSelect?.(locker.id) }}
      >
        <Popup>
          <div className="max-w-56 space-y-2 text-sm text-slate-800">
            <strong className="block break-words">
              {locker.name}
            </strong>
            <p className="break-words">
              {formatLockerAddress(locker)}
            </p>
            <span className="block font-medium text-emerald-700">
              {t('customer.compartmentsAvailable', { availableSlotCount: locker.availableSlotCount })}
            </span>
            <a
              href={getLockerMapLink(locker)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 ${TEXT_LINK_STYLES}`}
            >
              {t('customer.openGoogleMaps')}
              <ExternalLink size={13} />
            </a>
          </div>
        </Popup>
      </Marker>
    </>
  )
}

function UserPosition({ position }) {
  const { t } = useTranslation()
  return (
    <>
      <CircleMarker
        center={[position.latitude, position.longitude]}
        radius={20}
        pathOptions={{ stroke: false, fillColor: LOCKER_MAP.USER_COLOR, fillOpacity: 0.16 }}
        interactive={false}
      />
      <CircleMarker
        center={[position.latitude, position.longitude]}
        radius={8}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: LOCKER_MAP.USER_COLOR, fillOpacity: 1 }}
        interactive={false}
      >
        <MapTooltip
          permanent
          direction="top"
          offset={[0, -12]}
        >
          <span className="text-xs font-semibold text-blue-700">
            {t('customer.yourLocation')}
          </span>
        </MapTooltip>
      </CircleMarker>
    </>
  )
}

function MapViewport({ lockers, selectedId, selectionVersion, position }) {
  const map = useMap()
  useEffect(() => {
    const updateViewport = () => {
      const selected = lockers.find((locker) => locker.id === selectedId)
      map.invalidateSize()
      if (selected) {
        map.setView([selected.latitude, selected.longitude], LOCKER_MAP.ZOOM, { animate: false })
      } else if (lockers.length || position) {
        const locations = position ? [...lockers, position] : lockers
        map.fitBounds(latLngBounds(locations.map((location) => [location.latitude, location.longitude])), {
          padding: [36, 36], maxZoom: LOCKER_MAP.ZOOM, animate: false
        })
      }
    }
    updateViewport()
    const observer = new ResizeObserver(updateViewport)
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map, lockers, selectedId, selectionVersion, position])
  return null
}

export default function LockerMap({ lockers, selectedId, selectionVersion = 0, onSelect, position }) {
  const { t } = useTranslation()
  const [tileError, setTileError] = useState(false)
  const [tileAttempt, setTileAttempt] = useState(0)
  const loaded = useRef(false)
  const failed = useRef(false)
  const points = useMemo(() => lockers.filter(hasCoordinates), [lockers])
  const selected = points.find((locker) => locker.id === selectedId)
  const userPosition = hasCoordinates(position) ? position : null
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!loaded.current) {
        setTileError(true)
      }
    }, LOCKER_MAP.TILE_TIMEOUT_MS)
    return () => window.clearTimeout(timeout)
  }, [tileAttempt])
  if (!points.length && !userPosition) {
    return (
      <div className="grid h-96 place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        <div>
          <MapPin className="mx-auto mb-3 size-8 text-primary" />
          {t('customer.lockerCoordinatesAreNotAvailableYet')}
        </div>
      </div>
    )
  }
  return (
    <div
      role="region"
      aria-label={t('customer.lockerLocationMap')}
      className="relative isolate overflow-hidden rounded-2xl border border-border bg-muted"
    >
      <MapContainer
        center={[(points[0] || userPosition).latitude, (points[0] || userPosition).longitude]}
        zoom={LOCKER_MAP.ZOOM}
        maxZoom={LOCKER_MAP.MAX_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="z-0 h-96 w-full text-foreground lg:h-[32rem]"
      >
        <TileLayer
          key={tileAttempt}
          url={LOCKER_MAP.TILE_URL}
          attribution={LOCKER_MAP.ATTRIBUTION}
          maxZoom={LOCKER_MAP.MAX_ZOOM}
          eventHandlers={{
            loading: () => {
              failed.current = false
            },
            tileerror: () => {
              failed.current = true
              setTileError(true)
            },
            tileload: () => {
              loaded.current = true
            },
            load: () => {
              if (loaded.current && !failed.current) {
                setTileError(false)
              }
            }
          }}
        />
        <MapViewport
          lockers={points}
          selectedId={selectedId}
          selectionVersion={selectionVersion}
          position={userPosition}
        />
        <MapZoomControls position={userPosition} />
        {userPosition && (
          <UserPosition position={userPosition} />
        )}
        {points.map((locker) => (
          <LockerMarker
            key={locker.id}
            locker={locker}
            active={selectedId === locker.id}
            selectionVersion={selectionVersion}
            onSelect={onSelect}
          />
        ))}
      </MapContainer>
      {selected && (
        <div
          className="flex items-start gap-2 border-t border-primary/15 bg-card px-4 py-3 text-sm"
          role="status"
        >
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="break-words">
            {t('customer.selectedLabel')}
            {' '}
            <strong className="font-semibold text-primary">
              {selected.name}
            </strong>
          </p>
        </div>
      )}
      {tileError && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground"
        >
          <p className="flex-1 basis-48">
            {t('customer.theMapBackgroundCouldNotLoadTryAgainOr')}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              loaded.current = false
              setTileError(false)
              setTileAttempt((attempt) => attempt + 1)
            }}
          >
            <RefreshCw size={14} />
            {t('customer.reloadMap')}
          </Button>
        </div>
      )}
    </div>
  )
}
