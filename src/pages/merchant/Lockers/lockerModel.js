export const LOCKER_TAKE = 12
export const HISTORY_TAKE = 8
export const lockerSortOptions = { code: ['Code', false], name: ['Name', false], nameDesc: ['Name', true] }
export function readLockerQuery(params) {
  const page = Number(params.get('page'))
  return {
    keyword: (params.get('keyword') || '').trim(),
    status: ['1', '2', '3'].includes(params.get('status')) ? params.get('status') : '',
    sort: Object.hasOwn(lockerSortOptions, params.get('sort')) ? params.get('sort') : 'code',
    page: Number.isSafeInteger(page) && page > 0 ? page : 1
  }
}
export function lockerFilter(query) {
  const [field, isDescending] = lockerSortOptions[query.sort]
  return { keyword: query.keyword || undefined, status: query.status ? Number(query.status) : undefined, page: query.page, take: LOCKER_TAKE, sortBy: [{ field, isDescending }] }
}
export const lockerStateClass = (status) => ({ 1: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', 2: 'bg-amber-500/10 text-amber-700 dark:text-amber-300', 3: 'bg-muted text-muted-foreground' })[status] || 'bg-muted text-muted-foreground'
export const boxStateClass = (status) => ({ 1: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300', 2: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300', 3: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300', 4: 'border-slate-400/30 bg-muted text-muted-foreground' })[status] || 'border-border text-muted-foreground'
