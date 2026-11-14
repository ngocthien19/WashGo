const PRODUCTION_API_URL = 'https://washgo-be-staging.onrender.com'

export const resolveApiUrl = (configuredUrl, production) => configuredUrl?.trim().replace(/\/+$/, '') || (production ? PRODUCTION_API_URL : '/api')
