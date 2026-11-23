import { cn } from '~/lib/utils'

export default function SectionBackground({ src, className }) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-20', className)}
    >
      <div
        className="absolute -inset-4 bg-cover bg-center blur-md sm:hidden"
        style={{ backgroundImage: `url("${src}")` }}
      />
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute inset-x-0 top-[18%] h-auto w-full object-contain max-sm:mask-[linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] sm:inset-0 sm:size-full sm:object-cover sm:object-center"
      />
    </div>
  )
}
