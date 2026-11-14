import SectionGlow from './SectionGlow'

export default function CustomerPageGlow({ reverse = false }) {
  const firstSide = reverse ? 'right' : 'left'
  const secondSide = reverse ? 'left' : 'right'

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden print:hidden"
    >
      <SectionGlow
        side={firstSide}
        className="top-0"
      />
      <SectionGlow
        side={secondSide}
        className="top-[45%]"
      />
      <SectionGlow
        side={firstSide}
        className="bottom-0 top-auto"
      />
    </div>
  )
}
