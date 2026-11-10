import { expect, it } from 'vitest'
import { taskLocker } from './deliveryLockerModel'

const row = { lockerId: 'deposit', lockerName: 'Deposit', lockerAddress: 'Deposit address', lockerImageUrls: ['deposit.png'], boxNumber: '3', returnLockerId: 'return' }
it('uses the actual task station and never substitutes deposit photos for a different return locker', () => {
  expect(taskLocker({ ...row, assignedTaskType: 1 })).toMatchObject({ name: 'Deposit', address: 'Deposit address', images: ['deposit.png'], box: '3' })
  expect(taskLocker({ ...row, assignedTaskType: 2 })).toMatchObject({ name: undefined, address: undefined, images: [], box: undefined })
  expect(taskLocker({ ...row, assignedTaskType: 2, returnLockerName: 'Return', returnLockerImageUrls: ['return.png'], returnBoxNumber: '7' })).toMatchObject({ name: 'Return', images: ['return.png'], box: '7' })
})
it('prefers task enrichment and respects empty images supplied by the server', () => {
  expect(taskLocker({ ...row, assignedTaskType: 2, taskLockerName: 'Actual', taskLockerAddress: 'Actual address', taskLockerImageUrls: [], taskBoxNumber: '8' })).toMatchObject({ name: 'Actual', address: 'Actual address', images: [], box: '8' })
})
it('uses coordinates for the correct destination and does not plot a return at the deposit point', () => {
  const located = { ...row, lockerLatitude: 10, lockerLongitude: 106, returnLockerLatitude: 11, returnLockerLongitude: 107 }
  expect(taskLocker({ ...located, assignedTaskType: 2 })).toMatchObject({ id: 'return', latitude: 11, longitude: 107 })
  expect(taskLocker({ ...row, assignedTaskType: 2, lockerLatitude: 10, lockerLongitude: 106 }).latitude).toBeUndefined()
  expect(taskLocker({ ...located, assignedTaskType: 1, taskLockerLatitude: 0, taskLockerLongitude: 0 })).toMatchObject({ latitude: 0, longitude: 0 })
})
