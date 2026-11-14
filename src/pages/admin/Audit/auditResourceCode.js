export function auditResourceCode(row, context) {
  const scoped = context?.resourceId && context.resourceType === row.resourceType && context.resourceId.toLowerCase() === String(row.resourceId).toLowerCase()
  // Restore only this resource's public business code from its authoritative detail.
  // Never unmask free-text reasons, other resources, or scrubbed JSON values.
  if (scoped && /^WG[A-Z0-9-]+$/i.test(context.resourceCode || '') && /\[number\]/i.test(row.resourceCode || '')) {
    return context.resourceCode
  }
  return row.displayResourceCode || row.resourceCode || row.resourceType
}
