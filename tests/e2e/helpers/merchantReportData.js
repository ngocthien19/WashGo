export function reportFixture(params = {}) {
  const from = params.from || (params.period === 'today' ? '2026-11-08' : params.period === 'week' ? '2026-11-02' : '2026-11-01')
  const to = params.to || (params.period === 'month' || !params.period ? '2026-11-30' : '2026-11-08')
  const days = Math.round((Date.parse(to) - Date.parse(from)) / 86400000) + 1
  const start = Date.parse(`${from}T00:00:00+07:00`), end = start + days * 86400000
  const iso = (n) => new Date(n).toISOString()
  const range = (a, b) => ({ from: iso(a), toExclusive: iso(b), fromLocalDate: new Date(a + 7 * 3600000).toISOString().slice(0, 10), toLocalDate: new Date(b + 7 * 3600000 - 1).toISOString().slice(0, 10) })
  const kpi = (current, previous) => ({ current, previous, changePercent: previous === 0 ? current === 0 ? 0 : null : (current - previous) / Math.abs(previous) * 100, isNew: previous === 0 && current !== 0 })
  return {
    timezone: 'Asia/Ho_Chi_Minh', currency: 'VND', period: params.period || 'custom', granularity: params.granularity || 'day',
    current: range(start, end), previous: range(start - days * 86400000, start), incomplete: true, asOf: iso(start + (end - start) * 2 / 3), generatedAt: iso(start + (end - start) * 2 / 3),
    kpis: { grossLaundryRevenue: kpi(1200000, 1000000), refunds: kpi(200000, 0), netRevenue: kpi(1000000, 1000000), commission: kpi(200000, 200000), merchantPayout: kpi(800000, 800000), feesCollected: kpi(50000, 0), ordersCreated: kpi(120, 100), ordersCompleted: kpi(8, 10), ordersCancelled: kpi(2, 1), ordersWithoutCommissionSnapshot: 0, onTimeRate: { numerator: 9, denominator: 10, rate: 90, previousNumerator: 8, previousDenominator: 10, previousRate: 80, changePoints: 10 } },
    series: [0, 1, 2].map((index) => ({ index, label: `Bucket ${index + 1}`, start: iso(start + index * (end - start) / 3), end: iso(start + (index + 1) * (end - start) / 3), previousStart: iso(start - days * 86400000 + index * (end - start) / 3), previousEnd: iso(start - days * 86400000 + (index + 1) * (end - start) / 3), computed: index < 2, netRevenue: index === 0 ? 400000 : index === 1 ? 600000 : 0, previousNetRevenue: index < 2 ? 500000 : 0, ordersCreated: index === 0 ? 50 : index === 1 ? 70 : 0, ordersCompleted: index === 0 ? 3 : index === 1 ? 5 : 0 })),
    topServices: [{ rank: 1, serviceId: '77777777-7777-4777-8777-777777777777', name: 'Everyday laundry', code: 'SVC-TEST', imageUrls: ['/uploads/mock/top.svg'], orderCount: 5, previousOrderCount: 4, orderCountChangePercent: 25, quantity: 5, listValue: 500000 }], definitions: {}
  }
}
