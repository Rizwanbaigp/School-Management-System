const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const Student = require('./models/Student');
const session = require('express-session');

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
    const searchQuery = req.query.search || ''; // Get search query from URL
    const page = parseInt(req.query.page) || 1; // Get current page or set to 1 if not provided
    const limit = 5; // Number of records per page
    const skip = (page - 1) * limit; // Calculate how many records to skip

    // Find students based on search query (name, rollNumber, etc.)
    Student.find({
        $or: [
            { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search by name
            { rollNumber: { $regex: searchQuery, $options: 'i' } }
        ]
    })
    .skip(skip)
    .limit(limit) // Limit results per page
    .then((students) => {
        // Get total number of students for pagination
        Student.countDocuments({
            $or: [
                { name: { $regex: searchQuery, $options: 'i' } },
                { rollNumber: { $regex: searchQuery, $options: 'i' } }
            ]
        }).then(total => {
            const totalPages = Math.ceil(total / limit); // Calculate total number of pages
            res.render('viewStudents', {
                students,
                searchQuery,
                currentPage: page,
                totalPages,
                loggedIn: req.session.loggedIn
            });
        });
    })
    .catch((err) => {
        console.log(err);
        res.send('Error fetching students');
    });
});



// Add Student Page
app.get('/students/add', (req, res) => {
    res.render('addStudent', { loggedIn: req.session.loggedIn });
});

// Add Student (POST)
app.post('/students/add', (req, res) => {
    const newStudent = new Student({
        name: req.body.name,
        rollNumber: req.body.rollNumber,
        class: req.body.class,
        section: req.body.section,
        dateOfBirth: req.body.dateOfBirth
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
            rollNumber: req.body.rollNumber,
            class: req.body.class,
            section: req.body.section,
            dateOfBirth: req.body.dateOfBirth
        });
        console.log('Student updated successfully!');
        res.redirect('/students');  // Redirect to view students page
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
