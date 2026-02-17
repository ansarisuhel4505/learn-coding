
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const nodemailer = require('nodemailer'); // Email ke liye zaruri

const app = express();
const PORT = process.env.PORT || 3000;

// --- 1. CONFIGURATION ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'codemaster_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Render par HTTP ke liye false rakhein
}));

// --- 2. EMAIL SETUP (Nodemailer) ---
// Yahan apna asli Gmail aur App Password daalein
const ADMIN_EMAIL = 'ansarisuhel4505@gmail.com'; // Aapka Email (Jahan alerts aayenge)

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: ADMIN_EMAIL, 
        pass: 'bkpf ehbb qlhz axkt' // ⚠️ Yahan apna 16-digit Google App Password daalein
    }
});

// Email Bhejne ka Helper Function
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

// Dummy Database (Real project mein MongoDB use karein)
const users = [];

// --- 3. ROUTES ---

// Home Page
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// --- SIGNUP LOGIC ---
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));

app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    
    // User ko save karna
    users.push({ username, email, password });

    // 1. User ko Welcome Email
    await sendEmail(
        email, 
        "Welcome to CodeMaster! 🚀", 
        `<h3>Hello ${username},</h3><p>Thank you for joining CodeMaster. Apni coding journey shuru karein!</p>`
    );

    // 2. Admin (Aapko) Alert Email
    await sendEmail(
        ADMIN_EMAIL,
        "🔔 New User Signup Alert",
        `<p><strong>New User Registered:</strong></p>
         <ul>
            <li>Name: ${username}</li>
            <li>Email: ${email}</li>
         </ul>`
    );

    res.redirect('/login');
});

// --- LOGIN LOGIC ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/login', async (req, res) => {
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

// --- DASHBOARD ---
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login');
    }
});

// --- LOGOUT LOGIC ---
app.get('/logout', (req, res) => {
    if (req.session.user) {
        const username = req.session.user.username;
        const email = req.session.user.email;

        // Admin (Aapko) Alert ki banda logout kar gaya
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

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});







