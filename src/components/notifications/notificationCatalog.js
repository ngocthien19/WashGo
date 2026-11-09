// Only events currently published to each role. Category IDs are FE navigation, not BE groups.
const category = (id, types, group) => ({ id, types, group, label: `notificationNav.${id}` })
export const NOTIFICATION_CATEGORIES = {
  Customer: [category('order', [1, 2, 3, 4, 8, 9, 10, 11, 13, 14, 16], 'order'), category('payment', [5, 6, 7, 15], 'payment'), category('feedback', [12, 17], 'feedback')],
  Merchant: [category('order', [9, 10, 11, 20, 21, 22, 23, 32, 43], 'order'), category('payment', [6, 24, 25], 'payment'), category('feedback', [12], 'feedback'), category('services', [26]), category('merchant', [27, 29])],
  Admin: [category('order', [22, 23, 43, 44, 45]), category('feedback', [17, 40], 'feedback'), category('refunds', [41], 'payment'), category('ratings', [42], 'feedback'), category('services', [46]), category('merchant', [47])],
  Shipper: [category('tasks', [10, 30, 31, 32, 33, 34], 'order')]
}
export const notificationTypesFor = role => [...new Set((NOTIFICATION_CATEGORIES[role] || []).flatMap(item => item.types))]
