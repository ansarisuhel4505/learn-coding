const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. MIDDLEWARE & CONFIGURATION
// ==========================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'codemaster_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Render par HTTP ke liye false rakhein
}));

// Dummy Database (Users ko save karne ke liye)
const users = [];

// ==========================================
// 2. EMAIL CONFIGURATION (Nodemailer)
// ==========================================

// ⚠️ Yahan apna asli Gmail aur wo 16-digit wala App Password daalein
const ADMIN_EMAIL = 'ansarisuhel4505@gmail.com'; 
const APP_PASSWORD = 'bkpf ehbb qlhz axkt'; // Yahan apna Google App Password paste karein

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: ADMIN_EMAIL,
        pass: APP_PASSWORD
    }
});

// Email Helper Function
async function sendEmail(to, subject, htmlContent) {
    try {
        await transporter.sendMail({
            from: `"CodeMaster Security" <${ADMIN_EMAIL}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log(`Email sent to: ${to}`);
    } catch (error) {
        console.error("Email Error:", error);
    }
}

// ==========================================
// 3. PAGE NAVIGATION ROUTES
// ==========================================

// Main Pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/courses', (req, res) => res.sendFile(path.join(__dirname, 'public', 'courses.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/compiler', (req, res) => res.sendFile(path.join(__dirname, 'public', 'compiler.html')));

// Legal & Support Pages (Unified Help Page)
app.get(['/help', '/privacy', '/terms'], (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'help.html'));
});

// ==========================================
// 4. AUTHENTICATION (Signup, Login, Logout)
// ==========================================

// --- SIGNUP ---
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    // User save karein
    users.push({ username, email, password });

    // 1. User ko Welcome Email
    sendEmail(
        email, 
        "Welcome to CodeMaster! 🚀", 
        `<h3>Hello ${username},</h3><p>Thank you for joining CodeMaster. Apni coding journey aaj hi shuru karein!</p>`
    );

    // 2. Admin (Aapko) Alert
    sendEmail(
        ADMIN_EMAIL,
        "🔔 New User Signup Alert",
        `<p><strong>New User Registered:</strong></p><ul><li>Name: ${username}</li><li>Email: ${email}</li></ul>`
    );

    res.redirect('/login');
});

// --- LOGIN ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        req.session.user = user;

        // 1. User ko Login Alert
        sendEmail(
            user.email,
            "Security Alert: Login Detected",
            `<p>Hi ${user.username}, aapke account mein abhi login hua hai.</p>`
        );

        // 2. Admin (Aapko) Alert
        sendEmail(
            ADMIN_EMAIL,
            "🔓 User Login Alert",
            `<p><strong>User Logged In:</strong> ${user.username} (${user.email})</p>`
        );

        res.redirect('/dashboard');
    } else {
        res.send("Wrong Email or Password! <a href='/login'>Try Again</a>");
    }
});

// --- DASHBOARD (Protected) ---
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login');
    }
});

// --- LOGOUT ---
app.get('/logout', (req, res) => {
    if (req.session.user) {
        const username = req.session.user.username;
        const email = req.session.user.email;

        // Admin (Aapko) Alert
        sendEmail(
            ADMIN_EMAIL,
            "🚪 User Logout Alert",
            `<p><strong>User Logged Out:</strong> ${username} (${email})</p>`
        );
    }

    req.session.destroy((err) => {
        if (err) return res.send("Error logging out");
        res.redirect('/');
    });
});

// ==========================================
// 5. FEATURES (Newsletter & Bug Report)
// ==========================================

// Newsletter Subscribe
app.post('/subscribe', (req, res) => {
    const { email } = req.body;
    
    // User ko Subscribe Confirmation Email
    sendEmail(
        email,
        "Welcome to CodeMaster Newsletter 📰",
        `<p>Thanks for subscribing! You will receive latest coding tutorials.</p>`
    );

    // Admin (Aapko) Alert
    sendEmail(
        ADMIN_EMAIL,
        "New Newsletter Subscriber",
        `<p>New Subscriber Email: ${email}</p>`
    );

    res.send("<script>alert('Thank you for subscribing!'); window.location.href='/';</script>");
});

// Bug Report
app.post('/report-bug', (req, res) => {
    const { bugTitle, bugDesc } = req.body;

    // Admin (Aapko) Alert
    sendEmail(
        ADMIN_EMAIL,
        `🐛 Bug Report: ${bugTitle}`,
        `<p><strong>Issue:</strong> ${bugTitle}</p><p><strong>Description:</strong> ${bugDesc}</p>`
    );

    res.send("<script>alert('Bug Reported Successfully! Thanks for your help.'); window.location.href='/help';</script>");
});

// ==========================================
// 6. SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
        
