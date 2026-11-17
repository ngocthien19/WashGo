import * as yup from 'yup'

export const categorySchema = yup.object({
  code: yup.string().trim().required().matches(/^[A-Za-z0-9_-]{2,30}$/),
  name: yup.string().transform(value => value?.normalize('NFC').trim().replace(/\s+/g, ' ')).required().max(100).matches(/^[^<>]+$/),
  description: yup.string().trim().max(500).matches(/^[^<>]*$/),
  sortOrder: yup.number().required().integer().min(0).max(100000),
  isActive: yup.boolean().required(),
  reason: yup.string().trim().max(500)
})
export const categoryDefaults = row => ({ code: row?.code || '', name: row?.name || '', description: row?.description || '', sortOrder: row?.sortOrder ?? 0, isActive: row?.isActive ?? true, reason: '' })
export const categoryQuery = params => ({ page: Math.max(1, Math.min(100000, Number.parseInt(params.get('page'), 10) || 1)), take: 20, keyword: (params.get('keyword') || '').trim().slice(0, 200), isActive: ['true', 'false'].includes(params.get('active')) ? params.get('active') === 'true' : undefined, sortBy: ['sortOrder', 'name', 'code'].includes(params.get('sort')) ? params.get('sort') : 'sortOrder', isDescending: params.get('desc') === 'true' })
