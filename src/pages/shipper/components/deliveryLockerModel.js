// Task destinations must never fall back to the deposit locker for a different return station.
export function taskLocker(row) {
  const collect = (row.assignedTaskType ?? row.taskType) === 1
  const same = !row.returnLockerId || row.returnLockerId === row.lockerId
  return {
    id: collect || same ? row.lockerId : row.returnLockerId,
    latitude: row.taskLockerLatitude ?? (collect || same ? row.lockerLatitude : row.returnLockerLatitude),
    longitude: row.taskLockerLongitude ?? (collect || same ? row.lockerLongitude : row.returnLockerLongitude),
    name: row.taskLockerName || (collect || same ? row.lockerName : row.returnLockerName),
    address: row.taskLockerAddress || (collect || same ? row.lockerAddress : row.returnLockerAddress),
    images: row.taskLockerImageUrls ?? (collect || same ? row.lockerImageUrls : row.returnLockerImageUrls) ?? [],
    box: row.taskBoxNumber || (collect ? row.boxNumber : row.returnBoxNumber)
  }
}
