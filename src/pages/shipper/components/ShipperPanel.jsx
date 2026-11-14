export default function ShipperPanel({ title, icon: Icon, tone = 'blue', children, ...props }) {
  const colors = {
    blue: 'border-primary/15 bg-primary/5 [&>svg]:text-primary',
    teal: 'border-teal-500/15 bg-teal-500/5 [&>svg]:text-teal-600 dark:[&>svg]:text-teal-300',
    violet: 'border-violet-500/15 bg-violet-500/5 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-300'
  }
  return (
    <section
      {...props}
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <h2 className={`flex items-center gap-2 border-b p-5 text-lg font-bold ${colors[tone]}`}>
        <Icon size={21} />
        {title}
      </h2>
      {children}
    </section>
  )
}
