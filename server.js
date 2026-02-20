require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;

// ==========================================
// 1. MIDDLEWARE & STATIC FILES
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'codemaster_super_secret_key_2026',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 🔴 ADMIN SECURITY LOCK (Password System)
// ==========================================
app.use('/admin.html', (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        next(); 
    } else {
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Admin Area Restricted</title>
                <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
            </head>
            <body style="display:flex; justify-content:center; align-items:center; height:100vh; background:#0f172a; margin:0; font-family:'Poppins', sans-serif;">
                <div style="background:#1e293b; padding:40px; border-radius:15px; text-align:center; width:100%; max-width:350px; box-shadow:0 10px 30px rgba(0,0,0,0.5); border: 1px solid #334155;">
                    <div style="font-size: 40px; margin-bottom: 10px;">🔒</div>
                    <h2 style="color:#f8fafc; margin-bottom:5px;">Admin Access</h2>
                    <p style="color:#94a3b8; font-size:14px; margin-bottom:25px;">Please enter the master password</p>
                    <form action="/admin-login" method="POST">
                        <input type="password" name="password" placeholder="Enter Password" required style="width:100%; box-sizing:border-box; padding:12px 15px; margin-bottom:20px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#fff; outline:none; font-size:15px;">
                        <button type="submit" style="width:100%; background:#3b82f6; color:#fff; padding:12px; border:none; border-radius:8px; cursor:pointer; font-weight:600; font-size:16px; transition:0.3s;">Unlock Panel</button>
                    </form>
                    <a href="/" style="display:block; margin-top:20px; color:#3b82f6; text-decoration:none; font-size:14px;">&larr; Back to Website</a>
                </div>
            </body>
            </html>
        `);
    }
});

app.post('/admin-login', (req, res) => {
    const enteredPassword = req.body.password;
    const adminPassword = "Suhel@123"; 
    if (enteredPassword === adminPassword) {
        req.session.isAdmin = true; 
        res.redirect('/admin.html');
    } else {
        res.send('<script>alert("❌ Incorrect Password! Access Denied."); window.location.href="/admin.html";</script>');
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. MONGODB DATABASE SETUP & SCHEMAS
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// Schema 1: User (With Roll No & Mobile)
const UserSchema = new mongoose.Schema({
    username: String, email: String, password: String,
    mobile: String, rollNo: { type: String, unique: true },
    googleId: String, photo: String
});
const User = mongoose.model('User', UserSchema);

// Schema 2: Course
const CourseSchema = new mongoose.Schema({
    title: String, description: String, thumbnail: String, videoLink: String,
    createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', CourseSchema);

// Schema 3: Exam
const ExamSchema = new mongoose.Schema({
    title: String, totalMarks: Number, duration: Number,
    questions: [{ questionText: String, options: [String], correctAnswer: String, marks: Number }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Exam = mongoose.model('Exam', ExamSchema);

// Schema 4: Result (With Admin Copy Checking Data)
const ResultSchema = new mongoose.Schema({
    studentId: String, studentName: String, rollNo: String, mobile: String,
    examTitle: String,
    studentAnswers: Object, // Student ke submit kiye answers
    score: { type: Number, default: 0 },
    isReleased: { type: Boolean, default: false } // Admin release karega
});
const Result = mongoose.model('Result', ResultSchema);


// ==========================================
// 3. PROFESSIONAL EMAIL SYSTEM (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true, 
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function sendWelcomeEmail(toEmail, userName) {
    const mailOptions = {
        from: `"CodeMaster Team" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Welcome to CodeMaster! 🚀 Start Your Coding Journey",
        html: `<h2>Welcome to the community, ${userName}! 👋</h2><p>Your account is ready. Learn Full-Stack, AI, and Mobile Apps with us.</p>`
    };
    try { await transporter.sendMail(mailOptions); } catch (err) { console.error(err); }
}

async function sendLoginAlertEmail(toEmail, userName) {
    const mailOptions = {
        from: `"CodeMaster Security" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Security Alert: New Login Detected 🚨",
        html: `<p>Hello <b>${userName}</b>, we noticed a new login to your account just now.</p>`
    };
    try { await transporter.sendMail(mailOptions); } catch (err) { console.error(err); }
}

// ==========================================
// 4. GOOGLE OAUTH CONFIGURATION
// ==========================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://learn-coding-jade.vercel.app/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
      try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
              sendLoginAlertEmail(user.email, user.username);
              return done(null, user); 
          } else {
              user = await User.create({ googleId: profile.id, username: profile.displayName, email: profile.emails[0].value, photo: profile.photos[0].value });
              sendWelcomeEmail(user.email, user.username);
              return done(null, user);
          }
      } catch (err) { return done(err, null); }
  }
));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try { const user = await User.findById(id); done(null, user); } catch (err) { done(err, null); }
});

// ==========================================
// 5. ROUTES: SIGNUP, LOGIN & AUTH
// ==========================================
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, mobile, rollNo } = req.body; 
        const existingUser = await User.findOne({ $or: [{ email }, { rollNo }] });
        if(existingUser) return res.send("Email or Roll No already registered. <a href='/login.html'>Login here</a>");
        
        const newUser = await User.create({ username, email, password, mobile, rollNo });
        sendWelcomeEmail(email, username); // ✅ Email wapas aa gaya
        res.redirect('/login.html');
    } catch (err) { res.send("Error during signup."); }
});

app.post('/login', async (req, res) => {
    try {
        const { rollNo, password } = req.body; // 📌 Login by Roll No
        const user = await User.findOne({ rollNo, password });
        if (!user) return res.send("Invalid Roll No or Password. <a href='/login.html'>Try Again</a>");
        
        sendLoginAlertEmail(user.email, user.username); // ✅ Email alert wapas aa gaya
        req.session.userId = user._id; req.session.username = user.username;
        res.redirect('/dashboard.html');
    } catch (err) { res.send("Login Error"); }
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    req.session.userId = req.user._id; req.session.username = req.user.username; res.redirect('/dashboard.html');
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy();
        res.redirect('/login.html');
    });
});

// ==========================================
// 6. ADMIN & STUDENT APIs (Course, Exam, Copy Checking)
// ==========================================

// Courses
app.get('/api/courses', async (req, res) => { res.json(await Course.find().sort({ createdAt: -1 })); });
app.post('/api/courses', async (req, res) => { res.json(await Course.create(req.body)); });
app.delete('/api/courses/:id', async (req, res) => { await Course.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// Exams
app.get('/api/exams', async (req, res) => { res.json(await Exam.find().sort({ _id: -1 })); });
app.get('/api/exams/:id', async (req, res) => { res.json(await Exam.findById(req.params.id)); });
app.post('/api/exams', async (req, res) => { res.json(await Exam.create(req.body)); });
app.delete('/api/exams/:id', async (req, res) => { await Exam.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// 📌 Student: Exam Submit Karega (Answers ke sath)
app.post('/api/submit-exam', async (req, res) => {
    try {
        const { studentName, rollNo, mobile, examTitle, answers } = req.body;
        await Result.create({ studentName, rollNo, mobile, examTitle, studentAnswers: answers, isReleased: false });
        res.json({ success: true, message: "Exam submitted! Admin will check your copy soon." });
    } catch (err) { res.status(500).json({ error: "Failed to submit exam" }); }
});

// 📌 Admin: Saari Pending/Checked Copies Dekhega
app.get('/api/admin/results', async (req, res) => {
    try { res.json(await Result.find().sort({ _id: -1 })); } 
    catch (err) { res.status(500).json({ error: "Failed to fetch copies" }); }
});

// 📌 Admin: Copy Check Karke Result Upload Karega
app.put('/api/admin/check-copy/:id', async (req, res) => {
    try {
        await Result.findByIdAndUpdate(req.params.id, { score: req.body.adminMarks, isReleased: true });
        res.json({ success: true, message: "Result Uploaded Successfully!" });
    } catch (err) { res.status(500).json({ error: "Failed to upload result" }); }
});

// 📌 Student: Apna Result Check Karega
app.post('/api/check-result', async (req, res) => {
    try {
        const { rollNo, password } = req.body;
        const student = await User.findOne({ rollNo, password });
        if(!student) return res.json({ success: false, message: "Invalid Details" });
        
        const myResults = await Result.find({ rollNo: rollNo, isReleased: true });
        res.json({ success: true, results: myResults, studentName: student.username });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// ==========================================
// VERCEL EXPORT (Server Start)
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, "0.0.0.0", () => { console.log(`🚀 Server is running beautifully on port ${PORT}`); });
}
module.exports = app;
                                    
