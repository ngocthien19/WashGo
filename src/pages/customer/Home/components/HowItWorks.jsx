import { ClipboardList, PackageCheck, ScanLine, WashingMachine } from 'lucide-react'
import Reveal from '~/components/motion/Reveal'
import { UI_MOTION } from '~/utils/constants'

const steps = [
  { icon: ClipboardList, title: 'Tạo đơn', description: 'Chọn dịch vụ và locker phù hợp với bạn.' },
  { icon: ScanLine, title: 'Gửi đồ', description: 'Đến locker, mở ô tủ và gửi đồ gọn gàng.' },
  { icon: WashingMachine, title: 'Chờ giặt', description: 'Theo dõi từng bước xử lý ngay trên đơn hàng.' },
  { icon: PackageCheck, title: 'Nhận đồ', description: 'Thanh toán và nhận lại những món đồ sạch thơm.' }
]

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="relative isolate scroll-mt-[var(--customer-header-offset)] overflow-hidden bg-primary/4 px-4 py-20 sm:px-6 lg:py-24"
    >
      <div className="pointer-events-none absolute -right-24 -top-36 -z-10 size-96 rounded-full bg-primary/7 blur-3xl" />
      <div className="mx-auto max-w-7xl">
        <Reveal className="text-center">
          <h2
            id="how-it-works-heading"
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Giặt ủi gọn trong
            {' '}
            <span className="text-primary">4 bước</span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-muted-foreground">
            Bớt một việc phải lo, thêm thời gian cho chính mình.
          </p>
        </Reveal>
        <div className="relative mt-14">
          <div
            aria-hidden="true"
            className="absolute left-[12%] right-[12%] top-12 hidden border-t-2 border-dashed border-primary/25 lg:block"
          />
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <Reveal
                as="li"
                key={title}
                delay={index * UI_MOTION.STAGGER}
                lift
                className="group rounded-3xl border border-border/70 bg-card/90 px-6 pb-8 pt-7 text-center shadow-sm transition-[border-color,box-shadow] delay-0 duration-200 ease-in-out hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 motion-reduce:transition-none"
              >
                <div className="relative mx-auto grid size-20 place-items-center rounded-[1.6rem] border border-primary/20 bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                  <Icon
                    size={31}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                  <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-4 border-card bg-primary text-[10px] font-bold text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {description}
                </p>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
