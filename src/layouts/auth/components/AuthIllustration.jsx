import { Clock3, ShieldCheck, Shirt, Sparkles } from 'lucide-react'

export default function AuthIllustration() {
  return (
    <div
      className="relative mt-3 h-[300px]"
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-4 size-[260px] -translate-x-1/2 rounded-full border border-primary/20" />
      <div className="absolute -top-3 left-1/2 size-80 -translate-x-1/2 rounded-full border border-dashed border-primary/20" />
      <div className="absolute right-6 top-7 rotate-12 text-primary">
        <Sparkles size={26} />
      </div>
      <div className="absolute left-1/2 top-8 h-[226px] w-[190px] -translate-x-1/2 -rotate-5 rounded-2xl border border-orange-200 bg-gradient-to-br from-white to-orange-50 p-4 shadow-[10px_17px_0_#e7c6b054,0_20px_25px_#a95e3320] dark:border-zinc-600 dark:from-zinc-700 dark:to-zinc-800 dark:shadow-[10px_17px_0_#00000033]">
        <div className="flex h-9 items-center gap-1.5 border-b border-orange-100 dark:border-zinc-600">
          <span className="mr-auto text-[10px] font-extrabold text-orange-600 dark:text-orange-300">WashGo</span>
          <span className="h-4 w-6 rounded-sm bg-teal-950" />
          <span className="size-2 rounded-full bg-orange-300" />
          <span className="size-2 rounded-full bg-orange-300" />
        </div>
        <div className="mx-auto my-3.5 size-[140px] rounded-full border-2 border-stone-300 bg-stone-200 p-2 shadow-inner dark:border-zinc-500 dark:bg-zinc-600">
          <div className="relative grid size-full place-items-center overflow-hidden rounded-full border-[5px] border-[#486165] bg-[#c1dadb]">
            <Shirt
              size={76}
              strokeWidth={1.5}
              className="rotate-[22deg] text-orange-50 drop-shadow-sm"
            />
            <div className="absolute -left-[10%] top-[65%] h-[65%] w-[140%] -rotate-[10deg] rounded-[40%] bg-teal-600/30" />
          </div>
        </div>
        <div className="flex justify-between px-3">
          <span className="h-2 w-[18px] rounded-b-sm bg-stone-500" />
          <span className="h-2 w-[18px] rounded-b-sm bg-stone-500" />
        </div>
      </div>
      <div className="absolute -left-2 bottom-10 flex -rotate-4 items-center gap-2.5 rounded-xl border border-border bg-card/95 px-3.5 py-3 shadow-lg shadow-orange-950/5 lg:left-0">
        <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <ShieldCheck size={21} />
        </span>
        <div>
          <strong className="block text-[11px]">Sạch thơm, an tâm</strong>
          <small className="text-[10px] text-muted-foreground">Chăm chút từng món đồ</small>
        </div>
      </div>
      <div className="absolute -left-2 top-7 flex -rotate-6 items-center gap-1.5 rounded-full bg-card px-3 py-2 text-[10px] text-orange-800 shadow-sm dark:text-orange-200">
        <Clock3 size={16} />
        Locker sẵn sàng 24/7
      </div>
      <div className="absolute -right-2 bottom-9 rotate-4 space-y-0.5 lg:right-1">
        <div className="h-4 w-20 rounded border border-orange-300 bg-orange-200 dark:bg-orange-400" />
        <div className="h-4 w-[84px] rounded border border-amber-200 bg-amber-50 dark:bg-amber-200" />
        <div className="h-4 w-[88px] rounded border border-emerald-400 bg-emerald-200 dark:bg-emerald-500" />
      </div>
    </div>
  )
}
