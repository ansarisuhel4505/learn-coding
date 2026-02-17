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
const nodemailer = require('nodemailer');

// --- Email Transporter Setup ---
// Note: Aap Gmail ya kisi bhi SMTP service ka use kar sakte hain
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'ansarisuhel4505@gmail.com', // Aapka email
        pass: 'your-app-password' // Gmail App Password (Normal password nahi)
    }
});

// --- Newsletter Subscription Route ---
app.post('/subscribe', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).send("Email is required");
    }

    // Professional Welcome Email ka content
    const mailOptions = {
        from: '"CodeMaster Support" <ansarisuhel4505@gmail.com>',
        to: email,
        subject: 'Welcome to CodeMaster - Let\'s Start Coding! 🚀',
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
                <div style="max-width: 600px; margin: auto; background: white; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #3b82f6;">Welcome to CodeMaster!</h2>
                    <p>Hi there,</p>
                    <p>Thank you for subscribing to our newsletter. You'll now receive the latest tutorials on <b>Python AI, Java, and MERN Stack</b> directly in your inbox.</p>
                    <p>Ready to write some code? Try our online compiler now!</p>
                    <a href="https://learn-coding-2.onrender.com/compiler" 
                       style="display: inline-block; padding: 10px 20px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">
                       Open Online Compiler
                    </a>
                    <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888;">Developed by Suhel Ansari | Kushinagar, UP</p>
                </div>
            </div>
        `
    };

    try {
        // Email bhejna
        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to: ${email}`);
        
        // Frontend par success alert dikhana
        res.send(`
            <script>
                alert('Success! Check your inbox for a welcome gift. 🎁');
                window.location.href = '/';
            </script>
        `);
    } catch (error) {
        console.error("Email Error:", error);
        // Agar email fail bhi ho jaye, tab bhi subscriber ko success dikhayein (UX ke liye)
        res.send("<script>alert('Thanks for subscribing!'); window.location.href='/';</script>");
    }
});
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






