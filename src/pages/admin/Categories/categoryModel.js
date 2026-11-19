import * as yup from 'yup'

export const categorySchema = yup.object({
  code: yup.mixed().strip(),
  name: yup.string().transform(value => value?.normalize('NFC').trim().replace(/\s+/g, ' ')).required('categories.validation.name').max(100, 'categories.validation.name').matches(/^[^<>]+$/, 'categories.validation.name'),
  description: yup.string().trim().max(500, 'categories.validation.description').matches(/^[^<>]*$/, 'categories.validation.description'),
  sortOrder: yup.number().typeError('categories.validation.sortOrder').required('categories.validation.sortOrder').integer('categories.validation.sortOrder').min(0, 'categories.validation.sortOrder').max(100000, 'categories.validation.sortOrder'),
  isActive: yup.boolean().required(),
  reason: yup.string().trim().max(500, 'categories.validation.reason')
})
export const categoryReasonSchema = categorySchema.pick(['reason'])
export const categoryDefaults = row => ({ code: row?.code || '', name: row?.name || '', description: row?.description || '', sortOrder: row?.sortOrder ?? 0, isActive: row?.isActive ?? true, reason: '' })
export const categoryQuery = params => ({ page: Math.max(1, Math.min(100000, Number.parseInt(params.get('page'), 10) || 1)), take: 20, keyword: (params.get('keyword') || '').trim().slice(0, 200), isActive: ['true', 'false'].includes(params.get('active')) ? params.get('active') === 'true' : undefined, sortBy: ['sortOrder', 'name', 'code'].includes(params.get('sort')) ? params.get('sort') : 'sortOrder', isDescending: params.get('desc') === 'true' })
