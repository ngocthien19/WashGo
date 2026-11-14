import authorizedAxios from '~/utils/http/authorizedAxios'

const unwrap = ({ data }) => {
  const policy = data?.data
  if (data?.succeeded !== true || !policy?.terms?.version || typeof policy.terms.content !== 'string' || typeof policy.accepted !== 'boolean' || typeof policy.requiresAcceptance !== 'boolean' || !policy.rules) {
    throw new Error('customer.sync.invalidResponse')
  }
  return policy
}
export const customerPolicyApi = {
  get: (signal) => authorizedAxios.get('/policy/customer', { signal }).then(unwrap),
  acknowledge: (version) => authorizedAxios.post('/policy/customer/acknowledge', { version }).then(unwrap).then((policy) => {
    if (!policy.accepted || policy.acceptedVersion !== version || policy.terms.version !== version) {
      throw new Error('customer.sync.invalidResponse')
    }
    return policy
  })
}
