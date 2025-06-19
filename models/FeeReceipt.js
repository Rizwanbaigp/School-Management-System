const mongoose = require('mongoose');

const feeReceiptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  date: Date,
  tuitionFees: Number,
  transportFees: Number,
  discount: Number,
  remainingFees: Number,
  receiptNo: {
    type: Number,
    required: true
  },
  isCash: {
  type: String,
  enum: ['yes', 'no'],
  default: 'no'
},
cashAmount: {
  type: Number,
  default: 0
},
isOnline: {
  type: String,
  enum: ['yes', 'no'],
  default: 'no'
},
onlineAmount: {
  type: Number,
  default: 0
},
utrNumber: {
  type: String
},
remark: {
  type: String
},
  totalAmount: Number
});

module.exports = mongoose.model('FeeReceipt', feeReceiptSchema);
