const mongoose = require('mongoose');

const receiptCounterSchema = new mongoose.Schema({
    counter: {
        type: Number,
        default: 1
    }
});

module.exports = mongoose.model('ReceiptCounter', receiptCounterSchema);