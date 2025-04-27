const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: String,
    rollNumber: String,
    class: String,
    section: String,
    dateOfBirth: Date,
    // Adding an attendance field
    attendance: [{
        date: { type: Date, default: Date.now },
        status: { type: String, enum: ['Present', 'Absent', 'Excused'], default: 'Absent' }
    }],
    
});

const Student = mongoose.model('Student', studentSchema);

module.exports = Student;
