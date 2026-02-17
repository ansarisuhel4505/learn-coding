const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware Setup
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 2. Session Configuration (User Login yaad rakhne ke liye)
app.use(session({
    secret: 'codemaster_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Render (HTTP) par false rahega
}));

// 3. User Database (Temporary - Dummy Data)
// Real project mein yahan MongoDB ya SQL joda jata hai
const users = [];

// ==========================================
// 4. ROUTES (Navigation)
// ==========================================

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// About Page
app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// Courses Page
app.get('/courses', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'courses.html'));
});

// Contact Page
app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contact.html'));
});

// Compiler Page
app.get('/compiler', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'compiler.html'));
});

// ==========================================
// 5. AUTHENTICATION (Login, Signup, Logout)
// ==========================================

// Signup Page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;
    // User ko temporary array mein save karna
    users.push({ username, email, password });
    console.log("Naya User Registered:", username);
    res.redirect('/login');
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        req.session.user = user; // Session mein user save kiya
        res.redirect('/dashboard');
    } else {
        res.send("Ghalat Email ya Password! <a href='/login'>Wapas jayein</a>");
    }
});

// Dashboard (Protected Route - Bina login ke nahi khulega)
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Logout mein galti hui!");
        }
        res.redirect('/');
    });
});

// ==========================================
// 6. SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
// Footer ki sabhi links ko help.html par redirect karein
app.get(['/help', '/privacy', '/terms', '/report-bug'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

// Bug Report Submission
app.post('/report-bug', (req, res) => {
    const { bugTitle, bugDesc } = req.body;
    console.log(`Bughunter Suhel: ${bugTitle}`);
    res.send("<script>alert('Bug Reported Successfully!'); window.location.href='/help';</script>");
});


