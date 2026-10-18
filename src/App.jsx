import logoWashGo from '~/assets/logo-washgo.svg'
import { Button } from '~/components/ui/button'

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">

      {/* Thẻ Card chính */}
      <div className="bg-card w-full max-w-lg p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border text-center flex flex-col items-center relative overflow-hidden">

        {/* Hiệu ứng nền mờ (Glow) phía sau logo */}
        <div className="absolute top-0 w-full h-32 bg-primary/10 blur-2xl rounded-full -mt-10"></div>

        {/* Logo WashGo */}
        <img
          src={logoWashGo}
          alt="WashGo Logo"
          className="w-28 h-28 mb-6 relative z-10 drop-shadow-md"
        />

        <h1 className="text-4xl font-black text-foreground mb-3 tracking-tight relative z-10">
          Wash<span className="text-primary">Go</span>
        </h1>

        <p className="text-muted-foreground mb-10 text-md relative z-10 px-4">
          Nền tảng giặt ủi thông minh kết nối Khách hàng, Merchant và Locker 24/7.
        </p>

        {/* Các nút hành động (Shadcn UI) */}
        <div className="flex flex-col w-full gap-3 mb-8 relative z-10">
          <Button size="lg" className="w-full text-md font-semibold h-12 rounded-xl">
            Đặt lịch giặt ngay
          </Button>
          <Button variant="secondary" size="lg" className="w-full text-md font-semibold h-12 rounded-xl text-foreground hover:bg-secondary/80">
            Tìm Locker gần nhất
          </Button>
        </div>

        {/* Badge Trạng thái */}
        <div className="flex flex-wrap justify-center gap-3 relative z-10">
          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-washgo-success-bg text-washgo-success border border-washgo-success/20 shadow-sm">
            ● Hệ thống ổn định
          </span>
          <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-washgo-warning-bg text-washgo-warning border border-washgo-warning/20 shadow-sm">
            ● Bảo trì: Locker Q7
          </span>
        </div>
      </div>

      {/* Footer nhỏ */}
      <p className="mt-8 text-sm text-muted-foreground">
        Đồ án TLCN - WashGo Team
      </p>
    </div>
  )
}

export default App