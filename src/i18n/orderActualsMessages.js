export const vi = {
  storageList: { results: 'đơn lưu giữ tìm thấy', details: 'Chi tiết lưu giữ', actions: 'Thao tác đơn {{code}}', info: 'Thông tin lưu giữ', milestones: 'Các mốc giao nhận' },
  orderLive: { changed: 'Đơn hàng đã thay đổi. Vui lòng xem lại dữ liệu trước khi xác nhận.', review: 'Xem lại đơn hàng' },
  actuals: {
    cardTitle: 'Số lượng thực tế', orderWeight: 'Khối lượng cả đơn', unconfirmed: 'Chưa xác nhận', retryCard: 'Tải lại số lượng',
    package: 'gói', cash: 'Tiền mặt',
    title: 'Xác nhận đồ thực tế', description: 'Kiểm đếm từng dịch vụ và xem giá trước khi xác nhận.',
    ordered: 'Đã đặt', actual: 'Thực tế', units: { item: 'cái', pair: 'đôi', kg: 'kg', unknown: 'đơn vị' },
    weight: 'Khối lượng thực tế (kg)', note: 'Lý do chênh lệch / ghi chú', preview: 'Xem giá', confirm: 'Xác nhận và chốt giá',
    confirmation: 'Tôi đã kiểm tra đủ số lượng thực tế của từng dịch vụ.', confirmedAt: 'Đã xác nhận thực tế lúc {{date}}',
    subtotal: 'Tiền dịch vụ', surcharge: 'Phụ phí kg', discount: 'Giảm giá', previous: 'Tổng tiền trước điều chỉnh', total: 'Tổng tiền sau xác nhận',
    promotionRemoved: 'Voucher không còn đủ điều kiện và sẽ được gỡ khi xác nhận. Kiểm tra lại tổng tiền mới.',
    uncertain: 'Chưa rõ kết quả xác nhận. Kiểm tra thao tác đã gửi trước khi tiếp tục.', saved: 'Đã xác nhận đồ thực tế và chốt giá.',
    errors: {
      MissingActualsLines: 'Cần xác nhận đủ từng dịch vụ theo cái/đôi.', InvalidActualsLine: 'Dòng dịch vụ không hợp lệ hoặc bị trùng.',
      InvalidActualQuantity: 'Nhập số nguyên từ 0 đến 1.000.', ActualsNoteRequired: 'Nhập lý do khi số lượng khác số đã đặt.', ActualsNoteTooLong: 'Ghi chú tối đa 500 ký tự.',
      InvalidActualWeight: 'Nhập kg lớn hơn 0 đến 1.000, tối đa 2 chữ số thập phân.', MissingWeightSnapshot: 'Đơn thiếu thông tin gói kg. Vui lòng liên hệ hỗ trợ.',
      NoWeightService: 'Đơn không có dịch vụ kg.', EmptyActuals: 'Đơn không còn dịch vụ tính phí. Vui lòng liên hệ hỗ trợ.',
      MissingPromotionSnapshot: 'Đơn thiếu điều khoản voucher. Vui lòng liên hệ hỗ trợ.', ActualsAmountOutOfRange: 'Tổng tiền sau kiểm đếm vượt giới hạn.',
      ActualsRequired: 'Cần xác nhận số lượng thực tế trước khi tiếp tục.', CombinedActualsRequired: 'Cần xác nhận kg và số lượng trong cùng thao tác.'
    }
  }
}
export const en = {
  storageList: { results: 'storage orders found', details: 'Storage details', actions: 'Actions for order {{code}}', info: 'Storage information', milestones: 'Handover milestones' },
  orderLive: { changed: 'This order has changed. Review the latest data before confirming.', review: 'Review updated order' },
  actuals: {
    cardTitle: 'Actual quantities', orderWeight: 'Total order weight', unconfirmed: 'Not confirmed', retryCard: 'Retry quantities',
    package: 'packages', cash: 'Cash',
    title: 'Confirm received items', description: 'Check each service quantity and preview the price before confirming.',
    ordered: 'Ordered', actual: 'Actual', units: { item: 'items', pair: 'pairs', kg: 'kg', unknown: 'units' },
    weight: 'Actual weight (kg)', note: 'Reason for difference / note', preview: 'Preview price', confirm: 'Confirm quantities and price',
    confirmation: 'I have checked the actual quantity for every service.', confirmedAt: 'Actual quantities confirmed at {{date}}',
    subtotal: 'Service amount', surcharge: 'Weight surcharge', discount: 'Discount', previous: 'Previous total', total: 'Total after confirmation',
    promotionRemoved: 'The voucher no longer qualifies and will be removed on confirmation. Review the updated total.',
    uncertain: 'The confirmation outcome is unknown. Check the submitted operation before continuing.', saved: 'Received items and price confirmed.',
    errors: {
      MissingActualsLines: 'Confirm every item/pair service.', InvalidActualsLine: 'The service line is invalid or duplicated.',
      InvalidActualQuantity: 'Enter an integer from 0 to 1,000.', ActualsNoteRequired: 'Enter a reason when the quantity differs from the order.', ActualsNoteTooLong: 'Use at most 500 characters.',
      InvalidActualWeight: 'Enter more than 0 and at most 1,000 kg, with up to 2 decimal places.', MissingWeightSnapshot: 'The weight package snapshot is missing. Contact support.',
      NoWeightService: 'This order has no weight-based service.', EmptyActuals: 'No billable services remain. Contact support.',
      MissingPromotionSnapshot: 'The voucher terms snapshot is missing. Contact support.', ActualsAmountOutOfRange: 'The updated amount exceeds the limit.',
      ActualsRequired: 'Confirm actual quantities before continuing.', CombinedActualsRequired: 'Confirm weight and quantities together.'
    }
  }
}
