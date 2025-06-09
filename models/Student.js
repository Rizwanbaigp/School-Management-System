const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    date: Date,
    status: String  // 'present' or 'absent'
});

const studentSchema = new mongoose.Schema({
    name: String,
    fatherName: String,
    motherName: String,
    class: String,
    dateOfBirth: { type: Date },
    mobileNumber: String,
    place: String,
    aadharNumber: String,
    srNumber: String,
    samagraId: String,
    gender: String,
    category: String,
    dateOfAdmission: { type: Date },
    rollNumber: String,
    section: String,
    session: String, 
    fees: Number,
    remainingFees: Number,    
    attendance: [attendanceSchema]  // for attendance records
});

module.exports = mongoose.model('Student', studentSchema);
