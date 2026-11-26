export const vi = {
  receiptUi: { rate: 'Đánh giá', report: 'Báo cáo' },
  paymentResultDetails: { orderCode: 'Mã đơn hàng', amount: 'Số tiền giao dịch' },
  combined: {
    title: 'Thanh toán đơn hàng', total: 'Tổng còn phải thanh toán', paid: 'Đã thanh toán',
    cancellationBasis: 'Giá trị tính phí hủy', offset: 'Đã cấn trừ phí hủy', points: 'điểm',
    refundPending: 'Đang xử lý hoàn', refunded: 'Đã hoàn', refundRemaining: 'Còn có thể yêu cầu hoàn',
    settled: 'Đã thanh toán đủ các khoản hiện tại.', notDue: 'Chưa có khoản cần thanh toán tại thời điểm này.',
    paymentHint: 'Thanh toán một lần cho các khoản còn thiếu của đơn hàng.',
    existing: 'Tiếp tục phiên thanh toán hiện tại',
    unavailable: 'Chưa thể mở thanh toán lúc này. Vui lòng quay lại sau.',
    continue: 'Tiếp tục thanh toán', confirmAgain: 'Xác nhận lại và thanh toán', quoteChanged: 'Bảng kê đã thay đổi. Vui lòng kiểm tra số tiền mới và xác nhận lại.'
  },
  storageCustomer: {
    orderNotice: 'Đơn hàng {{code}}: {{content}}',
    hint: 'Đồ của bạn đang được WashGo lưu giữ. Thanh toán đủ các khoản còn thiếu trước khi xác nhận giao lại đến locker đã chọn.',
    balance: 'Các khoản cần thanh toán', service: 'Tiền dịch vụ còn thiếu', storage: 'Phí lưu giữ còn thiếu', total: 'Tổng còn phải thanh toán', unknown: 'Chưa xác định',
    paymentFirst: 'Cần thanh toán đủ tiền dịch vụ và phí lưu giữ trước khi xác nhận giao lại.', payService: 'Thanh toán tiền dịch vụ'
  },
  schedule: {
    title: 'Giờ mở cửa', hint: 'Giờ Việt Nam (Asia/Ho_Chi_Minh). Hạn thu gom chỉ tính trong các ca mở cửa. Tối đa 4 ca/ngày; giờ kết thúc có thể là 24:00.',
    simpleHint: 'Giờ Việt Nam (Asia/Ho_Chi_Minh). Giờ kết thúc có thể là 24:00.',
    everyday: 'Áp dụng hằng ngày. Mở lịch riêng nếu có ngày nghỉ hoặc giờ khác.',
    custom: 'Lịch khác theo ngày', applyDaily: 'Áp dụng ca đầu tiên cho cả 7 ngày',
    always: 'Mở cửa 24/7', open: 'Giờ bắt đầu', close: 'Giờ kết thúc', add: 'Thêm ca', remove: 'Bỏ ca', closed: 'Ngày nghỉ đặc biệt (YYYY-MM-DD, mỗi dòng một ngày)',
    invalid: 'Vui lòng chọn ít nhất một ngày mở cửa và nhập ca HH:mm hợp lệ, không chồng lấn; kiểm tra lại các ngày nghỉ.'
  },
  coverage: {
    tabs: { list: 'Danh sách locker', coverage: 'Liên kết cần xử lý' }, noIssues: 'Không có liên kết Merchant–locker cần xử lý.',
    radiusDescription: 'Locker trong {{radius}} km, gần nhất trước. Khoảng cách tính theo đường chim bay.',
    hint: 'Khoảng cách từ cửa hàng đến locker phải nằm trong bán kính phục vụ của Merchant.', loading: 'Đang kiểm tra Merchant theo vị trí locker…', none: 'Chưa có Merchant đủ điều kiện tại vị trí này.', invalid: 'Không đủ điều kiện phụ trách locker.',
    excluded: 'Thay đổi chưa được lưu. Hãy chuyển hoặc gỡ phân công các locker sau trước khi đổi vị trí/bán kính:', issues: 'Liên kết Merchant–locker cần xử lý', unserved: 'Locker chưa có Merchant trong vùng phục vụ để nhận đơn mới.', edit: 'Sửa phân công',
    reasons: { MerchantOutsideServiceRadius: 'Ngoài bán kính phục vụ', MerchantLocationUnavailable: 'Merchant chưa có vị trí hợp lệ', LockerLocationRequired: 'Locker chưa có vị trí hợp lệ', MerchantInactive: 'Merchant không hoạt động', AccountInactive: 'Tài khoản không hoạt động', ContractExpired: 'Hợp đồng đã hết hạn', MerchantNotFound: 'Không tìm thấy Merchant' }
  },
  collection: {
    title: 'Lịch thu gom', start: 'Bắt đầu tính thời gian thu gom', deadline: 'Hạn thu gom', hours: 'Thời hạn của đơn: {{hours}} giờ làm việc.', overdue: 'Đã quá hạn thu gom.',
    state: { Scheduled: 'Hạn thu gom được tính theo ca mở cửa của cửa hàng.', AwaitingMerchant: 'Đang chờ phân công cửa hàng để xác định lịch thu gom.', ScheduleMissing: 'Cửa hàng cần bổ sung giờ mở cửa hợp lệ để xác định hạn thu gom.', NoUpcomingShift: 'Chưa có ca mở cửa sắp tới để xác định hạn thu gom.', Legacy: 'Đơn dùng hạn thu gom đã ghi nhận trước đây.' }
  },
  paymentResult: {
    refresh: 'Cập nhật kết quả',
    older: 'Đây là lần thanh toán cũ. Mở đơn hàng để xem lần thanh toán hiện tại.',
    loading: 'Đang xác nhận kết quả từ hệ thống thanh toán…', missing: 'Chưa xác định được giao dịch. Vui lòng mở đơn hàng để kiểm tra; không thanh toán lại khi chưa rõ kết quả.', order: 'Xem đơn hàng', orders: 'Đơn hàng của tôi', continue: 'Tiếp tục tại đơn hàng',
    purpose: { 1: 'Tiền dịch vụ', 2: 'Phí quá hạn/lưu giữ', 3: 'Phí hủy đơn', 4: 'Thanh toán gộp đơn hàng' },
    status: { Succeeded: 'Thanh toán thành công', Failed: 'Thanh toán thất bại', Cancelled: 'Đã hủy thanh toán', Pending: 'Đang xác nhận thanh toán', RequiresReview: 'Thanh toán cần đối soát', Refunded: 'Giao dịch đã hoàn tiền', NotStarted: 'Chưa bắt đầu thanh toán' },
    description: { Succeeded: 'Hệ thống đã xác nhận và ghi nhận thanh toán.', Failed: 'Lần thanh toán này chưa hoàn tất. Bạn có thể kiểm tra đơn hàng trước khi thử lại.', Cancelled: 'Lần thanh toán này đã được hủy. Bạn có thể quay lại đơn hàng.', Pending: 'Kết quả đang được xác minh. Không tạo thêm lần thanh toán khi chưa rõ kết quả.', RequiresReview: 'Hệ thống cần đối soát giao dịch. Vui lòng không thanh toán lại.', Refunded: 'Khoản thanh toán này đã được hoàn tiền. Kiểm tra đơn hàng để xem nghĩa vụ thanh toán hiện tại.', NotStarted: 'Chưa có lần thanh toán cho khoản phí này.' }
  }
}
export const en = {
  receiptUi: { rate: 'Rate', report: 'Report' },
  paymentResultDetails: { orderCode: 'Order code', amount: 'Transaction amount' },
  combined: {
    title: 'Order payment', total: 'Total outstanding', paid: 'Paid',
    cancellationBasis: 'Cancellation fee basis', offset: 'Cancellation offset applied', points: 'points',
    refundPending: 'Refund pending', refunded: 'Refunded', refundRemaining: 'Remaining eligible refund',
    settled: 'All current charges are settled.', notDue: 'No charges are currently payable.',
    paymentHint: 'Pay all outstanding order charges in one payment.',
    existing: 'Continue the current payment',
    unavailable: 'Payment cannot be opened right now. Please return later.',
    continue: 'Continue payment', confirmAgain: 'Confirm updated payment', quoteChanged: 'The charges have changed. Review the updated amount and confirm again.'
  },
  storageCustomer: {
    orderNotice: 'Order {{code}}: {{content}}',
    hint: 'WashGo is keeping your items. Settle all outstanding charges before confirming redelivery to your selected locker.',
    balance: 'Outstanding charges', service: 'Unpaid service amount', storage: 'Unpaid storage fees', total: 'Total outstanding', unknown: 'Not determined',
    paymentFirst: 'Pay the service amount and storage fees in full before confirming redelivery.', payService: 'Pay service amount'
  },
  schedule: {
    title: 'Opening hours', hint: 'Vietnam time (Asia/Ho_Chi_Minh). Collection deadlines count working shifts only. Up to 4 shifts per day; closing time may be 24:00.',
    simpleHint: 'Vietnam time (Asia/Ho_Chi_Minh). Closing time can be 24:00.',
    everyday: 'Applies every day. Use a custom schedule for days off or different hours.',
    custom: 'Different hours by day', applyDaily: 'Apply the first shift to all 7 days',
    always: 'Open 24/7', open: 'Opening time', close: 'Closing time', add: 'Add shift', remove: 'Remove shift', closed: 'Special closed dates (YYYY-MM-DD, one per line)',
    invalid: 'Select at least one open day and enter valid, non-overlapping HH:mm shifts; check closed dates.'
  },
  coverage: {
    tabs: { list: 'Locker list', coverage: 'Coverage issues' }, noIssues: 'No Merchant–locker coverage issues to resolve.',
    radiusDescription: 'Lockers within {{radius}} km, nearest first. Distances are straight-line estimates.',
    hint: 'The distance from the shop to the locker must be within the Merchant’s service radius.', loading: 'Checking Merchants for this locker location…', none: 'No eligible Merchant at this location.', invalid: 'Not eligible to serve this locker.',
    excluded: 'Changes were not saved. Reassign or remove these locker assignments before changing the location/radius:', issues: 'Merchant–locker coverage issues', unserved: 'This locker has no Merchant in range to receive new orders.', edit: 'Edit assignment',
    reasons: { MerchantOutsideServiceRadius: 'Outside service radius', MerchantLocationUnavailable: 'Merchant location unavailable', LockerLocationRequired: 'Locker location required', MerchantInactive: 'Merchant inactive', AccountInactive: 'Account inactive', ContractExpired: 'Contract expired', MerchantNotFound: 'Merchant not found' }
  },
  collection: {
    title: 'Collection schedule', start: 'Collection clock starts', deadline: 'Collection deadline', hours: 'Order allowance: {{hours}} working hours.', overdue: 'Collection is overdue.',
    state: { Scheduled: 'The collection deadline follows the shop’s opening shifts.', AwaitingMerchant: 'Waiting for a shop assignment to determine the collection schedule.', ScheduleMissing: 'The shop needs valid opening hours to determine the collection deadline.', NoUpcomingShift: 'No upcoming open shift to determine the collection deadline.', Legacy: 'This order retains its previously recorded collection deadline.' }
  },
  paymentResult: {
    refresh: 'Refresh result',
    older: 'This is an older payment attempt. Open your order to view the current payment.',
    loading: 'Confirming the result with the payment system…', missing: 'The transaction could not be identified. Check your order; do not pay again while the result is unknown.', order: 'View order', orders: 'My orders', continue: 'Continue from order',
    purpose: { 1: 'Service amount', 2: 'Overdue/storage fees', 3: 'Cancellation fee', 4: 'Combined order payment' },
    status: { Succeeded: 'Payment successful', Failed: 'Payment failed', Cancelled: 'Payment cancelled', Pending: 'Confirming payment', RequiresReview: 'Payment needs review', Refunded: 'Payment refunded', NotStarted: 'Payment not started' },
    description: { Succeeded: 'The system has verified and recorded your payment.', Failed: 'This payment attempt did not complete. Check your order before trying again.', Cancelled: 'This payment attempt was cancelled. You can return to your order.', Pending: 'The result is being verified. Do not start another payment while the result is unknown.', RequiresReview: 'The transaction needs reconciliation. Please do not pay again.', Refunded: 'This payment was refunded. Check your order for the current payment obligation.', NotStarted: 'There is no payment attempt for this charge yet.' }
  }
}
