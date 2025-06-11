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
  totalAmount: Number
});

module.exports = mongoose.model('FeeReceipt', feeReceiptSchema);
