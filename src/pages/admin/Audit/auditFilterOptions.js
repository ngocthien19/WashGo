// Exact values emitted by the current audit writers; preserve additional values returned in older logs.
const choices = {
  action: ['Create', 'Update', 'Delete', 'Status', 'BoxStatus', 'Login', 'Logout', 'ChangePassword', 'ResetPassword', 'RevokeSession', 'RevokeOtherSessions', 'Upload', 'CustomerUpdate', 'Withdraw', 'Message', 'Resolve', 'Reject', 'ConfirmCompensation', 'CreateSettlement', 'ConfirmSettlementPaid', 'Lock', 'Unlock', 'Submit', 'Approve', 'AssignMerchant', 'AutoAssignMerchant', 'ApproveRefund', 'RejectRefund', 'ConfirmRefunded', 'Locked', 'Unlocked', 'Deleted', 'IdentityUpdated', 'UpdateSla', 'UpdateCommission', 'UpdatePenalty', 'RevealAccessCodes', 'CancelExpiredDeposit', 'UpdateWeight', 'UpdateStatus', 'MoveToStorage', 'AssignShipper'],
  actorRole: ['Admin', 'Merchant', 'Shipper', 'Customer', 'User', 'System'],
  module: ['AdminProfile', 'Auth', 'Documents', 'Finance', 'Incident', 'Locker', 'Merchant', 'MerchantProfile', 'Order', 'Promotion', 'Refund', 'Service', 'ServiceProposal', 'Shipper', 'SystemSetting'],
  resourceType: ['User', 'Session', 'PrivateDocument', 'Settlement', 'Incident', 'Locker', 'LockerBox', 'Merchant', 'MerchantProfileRequest', 'Order', 'Promotion', 'RefundRequest', 'WashService', 'ServiceProposal', 'Shipper', 'SystemSetting']
}
export function auditFilterOptions(key, value, rows, settings) {
  const defaults = settings && key === 'action' ? ['UpdateSla', 'UpdateCommission', 'UpdatePenalty'] : choices[key]
  if (!defaults) {
    return null
  }
  return [...new Set([...defaults, ...rows.map(row => row[key]), value].filter(Boolean))].sort()
}
