import { useState } from 'react'
import { Image } from 'lucide-react'
import { getImageUrl } from '~/utils/formats'

export default function ResourceThumbnail({ urls = [], name, icon: Icon = Image }) {
  const [failed, setFailed] = useState(null)
  const url = Array.isArray(urls) ? urls.find((value) => typeof value === 'string' && value.trim()) : null
  const src = url ? getImageUrl(url) : null
  return (
    <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-primary/10 bg-primary/5 text-primary">
      {src && failed !== src ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
          onError={() => setFailed(src)}
        />
      ) : (
        <Icon
          size={26}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
