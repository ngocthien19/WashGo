import authorizedAxios from '~/utils/authorizedAxios'

export const newOperationId = () => crypto.randomUUID()
export function versionGuard(version, operationId = newOperationId()) {
  if (typeof version !== 'string' || !version.trim()) {
    throw new Error('admin.sync.missingVersion')
  }
  return { expectedVersion: version, operationId }
}

export async function adminOperation(module, operationId) {
  const { data } = await authorizedAxios.get(`/admin-operations/${encodeURIComponent(module)}/${encodeURIComponent(operationId)}`)
  const operation = data?.data
  if (data?.succeeded !== true || operation?.operationId !== operationId || !['Completed', 'Processing'].includes(operation.state)) {
    throw new Error('admin.invalidResponse')
  }
  return operation
}

// One write, then one read after an uncertain transport result. Never replay a mutation automatically.
export async function adminWrite(module, action, resourceId, method, path, body, params) {
  const operationId = body?.operationId || params?.operationId
  try {
    return await (method === 'delete' ? authorizedAxios.delete(path, { params }) : params ? authorizedAxios[method](path, body, { params }) : authorizedAxios[method](path, body))
  } catch (failure) {
    if (operationId && (!failure.response || failure.response.status >= 500)) {
      try {
        const operation = await adminOperation(module, operationId)
        if (operation.state === 'Completed' && operation.action === action && (resourceId == null || operation.resourceId === String(resourceId))) {
          return { data: operation.result }
        }
      } catch { /* A missing operation is not proof that the original request failed. */ }
      failure.uncertain = true
    }
    throw failure
  }
}

export async function administrativeSummary(path, signal) {
  const { data } = await authorizedAxios.get(path, { signal })
  if (data?.succeeded !== true || !Number.isInteger(data.data?.total) || data.data.total < 0 || !data.data.counts || Object.values(data.data.counts).some(value => !Number.isInteger(value) || value < 0)) {
    throw new Error('admin.invalidResponse')
  }
  return data.data
}

export function validateBatch(result, operationId, items) {
  if (result?.operationId !== operationId || result.state !== 'Completed' || !Array.isArray(result.items) || result.items.length !== items.length || new Set(result.items.map(item => item.id)).size !== items.length || result.items.some(item => !items.some(row => row.id === item.id) || typeof item.succeeded !== 'boolean' || !Number.isInteger(item.statusCode))) {
    throw new Error('admin.invalidResponse')
  }
  return result
}

export async function administrativeBatch(module, path, values) {
  const response = await adminWrite(module, 'Batch', 'batch', 'post', path, values)
  if (response.data?.succeeded !== true) {
    throw new Error('admin.invalidResponse')
  }
  if (response.data.data?.state === 'Processing') {
    throw Object.assign(new Error('admin.sync.processing'), { uncertain: true })
  }
  try {
    return validateBatch(response.data.data, values.operationId, values.items)
  } catch (failure) {
    failure.uncertain = true; throw failure
  }
}
