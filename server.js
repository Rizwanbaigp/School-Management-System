const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const Student = require('./models/Student');
const session = require('express-session');
const ExcelJS = require('exceljs');
const ReceiptCounter = require('./models/ReceiptCounter');
const FeeReceipt = require('./models/FeeReceipt');

const app = express();
app.use(express.static('public'));

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
// Session setup
app.use(session({
    secret: 'mysecretkey', // random secret key
    resave: false,
    saveUninitialized: true
}));

// Public folder to serve static files (for CSS)
app.use(express.static(path.join(__dirname, 'public')));

// EJS setup
app.set('view engine', 'ejs');

// Admin Authentication Middleware
function isAdmin(req, res, next) {
    if (req.session.loggedIn) {
        return next(); // Allow to access the route
    } else {
        res.redirect('/login'); // Redirect to login page if not logged in
    }
}

// MongoDB Connect
mongoose.connect('mongodb+srv://admin:admin123@student.oalla5p.mongodb.net/?retryWrites=true&w=majority&appName=Student', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("MongoDB Connected Successfully 🚀");
}).catch((err) => {
    console.log(err);
});

// Routes
// Home Route
app.get('/', (req, res) => {
    res.render('home', { loggedIn: req.session.loggedIn });
});

// Admin Login Page (GET)
app.get('/login', (req, res) => {
    res.render('login', { loggedIn: req.session.loggedIn });
});

// Handle Login POST Request
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (username === 'admin' && password === 'admin123') {
        req.session.loggedIn = true; // Set session
        res.redirect('/students');  // Redirect to students page after login
    } else {
        res.send('Invalid credentials!');
    }
});

// Students Page (GET)
// Students Page (GET)
// Students Page with Search Functionality
// Students Page with Pagination
app.get('/students', (req, res) => {
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;
    const filterClass = req.query.filterClass || '';

    const filter = {
        $and: [
            {
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { rollNumber: { $regex: searchQuery, $options: 'i' } }
                ]
            }
        ]
    };

    if (filterClass) {
        filter.$and.push({ class: filterClass });
    }

    Student.find(filter)
        .skip(skip)
        .limit(limit)
        .then((students) => {
            Student.countDocuments(filter).then(total => {
                const totalPages = Math.ceil(total / limit);
                res.render('viewStudents', {
                    students,
                    searchQuery,
                    currentPage: page,
                    totalPages,
                    filterClass,
                    loggedIn: req.session.loggedIn
                });
            });
        })
        .catch((err) => {
            console.log(err);
            res.send('Error fetching students');
        });
});



app.get('/students/export', async (req, res) => {
    const selectedClass = req.query.class || '';

    let filter = {};
    if (selectedClass) {
        filter.class = selectedClass;
    }

    try {
        const students = await Student.find(filter);

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Students');

        // Columns
        worksheet.columns = [
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Father Name', key: 'fatherName', width: 20 },
            { header: 'Mother Name', key: 'motherName', width: 20 },
            { header: 'Class', key: 'class', width: 10 },
            { header: 'DOB', key: 'dateOfBirth', width: 15 },
            { header: 'Mobile No', key: 'mobileNumber', width: 15 },
            { header: 'Place', key: 'place', width: 15 },
            { header: 'Aadhar No', key: 'aadharNumber', width: 15 },
            { header: 'SR. No', key: 'srNumber', width: 10 },
            { header: 'Samagra ID', key: 'samagraId', width: 15 },
            { header: 'Gender', key: 'gender', width: 10 },
            { header: 'Category', key: 'category', width: 10 },
            { header: 'Date of Admission', key: 'dateOfAdmission', width: 15 },
        ];

        // Rows
        students.forEach(student => {
            worksheet.addRow({
                name: student.name,
                fatherName: student.fatherName,
                motherName: student.motherName,
                class: student.class,
                dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString().substring(0,10) : '',
                mobileNumber: student.mobileNumber,
                place: student.place,
                aadharNumber: student.aadharNumber,
                srNumber: student.srNumber,
                samagraId: student.samagraId,
                gender: student.gender,
                category: student.category,
                dateOfAdmission: student.dateOfAdmission ? student.dateOfAdmission.toISOString().substring(0,10) : '',
            });
        });

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=students_${selectedClass || 'all'}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.log(err);
        res.send("Error generating Excel file");
    }
});




// Add Student Page
app.get('/students/add', (req, res) => {
    res.render('addStudent', { loggedIn: req.session.loggedIn });
});

// Add Student (POST)
app.post('/students/add', (req, res) => { const totalFees = Number(req.body.fees); // Ensure it's a number

const newStudent = new Student({
    name: req.body.name,
    fatherName: req.body.fatherName,
    motherName: req.body.motherName,
    class: req.body.class,
    dateOfBirth: req.body.dateOfBirth,
    mobileNumber: req.body.mobileNumber,
    place: req.body.place,
    aadharNumber: req.body.aadharNumber,
    srNumber: req.body.srNumber,
    samagraId: req.body.samagraId,
    gender: req.body.gender,
    category: req.body.category,
    dateOfAdmission: req.body.dateOfAdmission,
    rollNumber: req.body.rollNumber,
    session: req.body.session,
    fees: totalFees,
    remainingFees: totalFees, // ✅ This line sets remainingFees
    section: req.body.section
});

newStudent.save()
    .then(() => {
        console.log('Student added successfully!');
        res.redirect('/students');
    })
    .catch((err) => {
        console.log(err);
        res.send('Error saving student');
    });

});


// Show Update Student Form (GET)
// Show Update Form (GET)
app.get('/students/update/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        res.render('updateStudent', {
            student,
            loggedIn: req.session.loggedIn
        });
    } catch (err) {
        console.log(err);
        res.send('Error loading update form');
    }
});

// Show Mark Attendance Page for Student (GET)
app.get('/students/attendance/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id); // Find the student by ID
        res.render('markAttendance', { 
            student, 
            loggedIn: req.session.loggedIn // Pass loggedIn status to the view
        });
    } catch (err) {
        console.log(err);
        res.send('Error fetching student');
    }
});


// Mark Attendance Page (GET)
app.get('/students/attendance/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        res.render('markAttendance', { student });
    } catch (err) {
        console.log(err);
        res.send('Error fetching student for attendance');
    }
});

app.get('/students/attendance/view/:id', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        res.render('viewAttendance', { student, loggedIn: req.session.loggedIn });
    } catch (err) {
        console.log(err);
        res.send('Error fetching student attendance');
    }
});

// fees-recipt

app.get('/fees-receipt', isAdmin, async (req, res) => {
    try {
        const students = await Student.find({}, 'name class fatherName srNumber fees remainingFees'); // fetch required fields
        res.render('feesReceiptForm', { students, loggedIn: req.session.loggedIn });
    } catch (err) {
        console.log(err);
        res.send("Error loading receipt form");
    }
});

// api route 

app.get('/api/student-details/:id', async (req, res) => {    
    try {    
        const student = await Student.findById(req.params.id);    
        if (!student) {  // if no student is found
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);    
    } catch (err) {    
        console.error(err);  // logging error for debugging
        res.status(500).json({ error: 'Server error' });    
    }    
});

// fees reports get 

app.get('/fees-report', isAdmin, (req, res) => {
  res.render('feesReportView', { receipts: [], loggedIn: req.session.loggedIn });
});

// fees reports post

app.post('/fees-report/view', isAdmin, async (req, res) => {
  const { reportType, selectedDate, startDate, endDate } = req.body;

  let filter = {};
  const today = new Date();

  if (reportType === 'daily') {
    const date = new Date(selectedDate);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = { $gte: date, $lt: nextDay };
  } else if (reportType === 'monthly') {
    const date = new Date(selectedDate);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    filter.date = { $gte: start, $lt: end };
  } else if (reportType === 'range') {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  try {
    const receipts = await FeeReceipt.find(filter).populate('student', 'name fatherName class remainingFees');
    const validReceipts = receipts.filter(r => r.student !== null);
    res.render('feesReportView', { receipts: validReceipts, reportType, selectedDate, startDate, endDate, loggedIn: req.session.loggedIn });
  } catch (err) {
    console.log(err);
    res.send("Error generating report");
  }
});

// fees report excel


app.post('/fees-report/export', isAdmin, async (req, res) => {
  const { reportType, selectedDate, startDate, endDate } = req.body;

  let filter = {};
  if (reportType === 'daily') {
    const date = new Date(selectedDate);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    filter.date = { $gte: date, $lt: nextDay };
  } else if (reportType === 'monthly') {
    const date = new Date(selectedDate);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    filter.date = { $gte: start, $lt: end };
  } else if (reportType === 'range') {
    filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }

  try {
    const receipts = await FeeReceipt.find(filter).populate('student', 'name fatherName class remainingFees');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Fees Report');

    worksheet.columns = [
      { header: 'Receipt No', key: 'receiptNo', width: 10 },
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Father Name', key: 'fatherName', width: 20 },
      { header: 'Class', key: 'class', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Cash', key: 'cashAmount', width: 10 },
      { header: 'Online', key: 'onlineAmount', width: 10 },
      { header: 'UTR', key: 'utrNumber', width: 20 },
      { header: 'Total Paid', key: 'totalAmount', width: 15 },
      { header: 'Remaining', key: 'remainingFees', width: 15 }
    ];

    receipts.forEach(receipt => {
      const student = receipt.student || {};
      worksheet.addRow({
        receiptNo: receipt.receiptNo || '',
        name: student.name || '',
        fatherName: student.fatherName || '',
        class: student.class || '',
        date: receipt.date ? receipt.date.toISOString().substring(0, 10) : '',
        cashAmount: receipt.cashAmount || 0,
        onlineAmount: receipt.onlineAmount || 0,
        utrNumber: receipt.utrNumber || '',
        totalAmount: receipt.totalAmount || 0,
        remainingFees: student.remainingFees || 0
      });
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="fees_report.xlsx"'
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.log(err);
    res.status(500).send("Failed to generate Excel report.");
  }
});

// fees receipt post

app.post('/fees-receipt/generate', isAdmin, async (req, res) => {
  const {
    studentId, studentName, fatherName, class: studentClass,
    date, session, tuitionFees, transportFees, discount,
    isCash, cashAmount, isOnline, onlineAmount, utrNumber, remark
  } = req.body;

  try {
    // Receipt Number Auto-Increment
    let counterDoc = await ReceiptCounter.findOne();
    if (!counterDoc) {
      counterDoc = new ReceiptCounter({ counter: 1 });
      await counterDoc.save();
    }
    const receiptNo = counterDoc.counter;
    counterDoc.counter += 1;
    await counterDoc.save();

    // Total Calculation
    const total = parseFloat(tuitionFees || 0) + parseFloat(transportFees || 0);
    const totalAmount = total - parseFloat(discount || 0);

    // Update remaining fees
    const student = await Student.findById(studentId);
    const oldRemaining = student.remainingFees || student.fees;
    const newRemaining = oldRemaining - totalAmount;
    student.remainingFees = newRemaining >= 0 ? newRemaining : 0;
    await student.save();

    // Save Receipt
    const newReceipt = new FeeReceipt({
      student: student._id,
      date: new Date(date),
      tuitionFees,
      transportFees,
      discount,
      totalAmount,
      receiptNo,
      isCash,
      cashAmount: isCash === 'yes' ? parseFloat(cashAmount || 0) : 0,
      isOnline,
      onlineAmount: isOnline === 'yes' ? parseFloat(onlineAmount || 0) : 0,
      utrNumber: isOnline === 'yes' ? utrNumber : '',
      remark
    });
    await newReceipt.save();

    // Render Receipt
    res.render('receipt', {
      receiptNo,
      studentName,
      fatherName,
      studentClass,
      date,
      session,
      tuitionFees,
      transportFees,
      discount,
      total,
      totalAmount,
      remainingFees: student.remainingFees,
      isCash,
      cashAmount,
      isOnline,
      onlineAmount,
      utrNumber,
      remark,
      loggedIn: req.session.loggedIn,
       isCash: req.body.isCash,
    cashAmount: req.body.cashAmount,
    isOnline: req.body.isOnline,
    onlineAmount: req.body.onlineAmount,
    utrNumber: req.body.utrNumber,
    remark: req.body.remark
    });

  } catch (err) {
    console.log(err);
    res.send("Error generating receipt");
  }
});

// Mark Attendance (POST)
app.post('/students/attendance/:id', async (req, res) => {
    const { status } = req.body; // status will be 'present' or 'absent'

    try {
        const student = await Student.findById(req.params.id);
        // Push new attendance record
        student.attendance.push({
            date: new Date(),
            status: status
        });
        await student.save();
        res.redirect('/students');
    } catch (err) {
        console.log(err);
        res.send('Error marking attendance');
    }
});


// Update Student Data (POST)
app.post('/students/update/:id', async (req, res) => {
    try {
        await Student.findByIdAndUpdate(req.params.id, {
            name: req.body.name,
            fatherName: req.body.fatherName,
            motherName: req.body.motherName,
            class: req.body.class,
            dateOfBirth: req.body.dateOfBirth,
            mobileNumber: req.body.mobileNumber,
            place: req.body.place,
            aadharNumber: req.body.aadharNumber,
            srNumber: req.body.srNumber,
            samagraId: req.body.samagraId,
            gender: req.body.gender,
            category: req.body.category,
            dateOfAdmission: req.body.dateOfAdmission,
            rollNumber: req.body.rollNumber,
            section: req.body.section,
            session: req.body.session,   
            remainingFees: req.body.fees
        });
        console.log('Student updated successfully!');
        res.redirect('/students');
    } catch (err) {
        console.log(err);
        res.send('Error updating student');
    }
});


// Delete Student (POST)
app.post('/students/delete/:id', isAdmin, async (req, res) => {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect('/students');
});

// Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.send('Error logging out');
        }
        res.redirect('/login'); // Redirect to login page after logout
    });
});

// Server Start
app.listen(3000, () => {
    console.log('Server started at http://localhost:3000');
});
