import authorizedAxios from '~/utils/http/authorizedAxios'

export const merchantReviewApi = {
  list: async (query, signal) => {
    const payload = Object.fromEntries(['stars', 'fromDate', 'toDate', 'keyword', 'page', 'take'].filter(key => query[key] !== undefined).map(key => [key, query[key]]))
    const { data } = await authorizedAxios.post('/rating/partner/filter', payload, { signal })
    if (data?.succeeded !== true || !Number.isInteger(data.total) || !Array.isArray(data.list) || data.list.some(row => !row.id || !Number.isInteger(row.overallStars) || row.overallStars < 1 || row.overallStars > 5 || typeof row.contentReleased !== 'boolean')) {
      throw new Error('merchant.invalidResponse')
    }
    const list = data.list.map(row => ({ id: row.id, overallStars: row.overallStars, createdOn: row.createdOn, contentReleased: row.contentReleased, comment: row.contentReleased ? row.comment : null, imageUrls: row.contentReleased && Array.isArray(row.imageUrls) ? row.imageUrls : [], videoUrls: row.contentReleased && Array.isArray(row.videoUrls) ? row.videoUrls : [] }))
    return { list, total: data.total, totalPages: Math.ceil(data.total / query.take) }
  }
}
