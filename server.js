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
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. ADMIN SECURITY LOCK
// ==========================================
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

// ==========================================
// 3. MONGODB DATABASE SETUP & SCHEMAS
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

const User = mongoose.model('User', new mongoose.Schema({
    username: String, email: String, password: String,
    mobile: String, rollNo: { type: String, unique: true },
    googleId: String, photo: String
}));

const Course = mongoose.model('Course', new mongoose.Schema({
    title: String, description: String, thumbnail: String, videoLink: String,
    createdAt: { type: Date, default: Date.now }
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
    title: String, totalMarks: Number, duration: Number,
    questions: [{ questionText: String, options: [String], correctAnswer: String, marks: Number }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}));

const Result = mongoose.model('Result', new mongoose.Schema({
    studentName: String, rollNo: String, mobile: String,
    examTitle: String, studentAnswers: Object, score: { type: Number, default: 0 },
    isReleased: { type: Boolean, default: false } 
}));

const Feedback = mongoose.model('Feedback', new mongoose.Schema({
    studentName: String, rollNo: String, examTitle: String, message: String,
    date: { type: Date, default: Date.now }
}));

// ==========================================
// 4. PROFESSIONAL EMAIL SYSTEM (Nodemailer)
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
// 5. GOOGLE OAUTH CONFIGURATION
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
              const generatedRollNo = "GL-" + Math.floor(1000 + Math.random() * 9000);
              user = await User.create({ 
                  googleId: profile.id, username: profile.displayName, 
                  email: profile.emails[0].value, photo: profile.photos[0].value,
                  rollNo: generatedRollNo
              });
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
// 6. ROUTES: SIGNUP & LOGIN (Email + RollNo Logic)
// ==========================================
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, mobile, rollNo } = req.body; 
        const existingUser = await User.findOne({ $or: [{ email }, { rollNo }] });
        if(existingUser) return res.send("<script>alert('Email or Roll No already registered!'); window.location.href='/signup.html';</script>");
        
        await User.create({ username, email, password, mobile, rollNo });
        sendWelcomeEmail(email, username); 
        res.redirect('/login.html?signup=success');
    } catch (err) { res.send("Error during signup."); }
});

app.post('/login', async (req, res) => {
    try {
        const { loginId, password } = req.body; 
        const user = await User.findOne({ $or: [{ email: loginId }, { rollNo: loginId }], password: password });
        
        if (!user) return res.send("<script>alert('❌ Invalid Email/Roll No or Password.'); window.location.href='/login.html';</script>");
        
        sendLoginAlertEmail(user.email, user.username); 
        res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(user.username)}&roll=${user.rollNo || ''}`);
    } catch (err) { res.send("Login Error"); }
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(req.user.username)}&roll=${req.user.rollNo}`);
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy();
        res.redirect('/login.html');
    });
});

// ==========================================
// 7. ADMIN & STUDENT APIs
// ==========================================

// Courses
app.get('/api/courses', async (req, res) => { res.json(await Course.find().sort({ createdAt: -1 })); });
app.post('/api/courses', async (req, res) => { res.json(await Course.create(req.body)); });
app.delete('/api/courses/:id', async (req, res) => { await Course.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// Exams
app.get('/api/exams', async (req, res) => { res.json(await Exam.find({ isActive: true }).sort({ _id: -1 })); });
app.get('/api/exams/:id', async (req, res) => { res.json(await Exam.findById(req.params.id)); });
app.post('/api/exams', async (req, res) => { res.json(await Exam.create(req.body)); });
app.delete('/api/exams/:id', async (req, res) => { await Exam.findByIdAndDelete(req.params.id); res.json({ success: true }); });

// One-Time Exam Tracker
app.post('/api/my-submissions', async (req, res) => {
    const { rollNo } = req.body;
    if (!rollNo) return res.json([]);
    const results = await Result.find({ rollNo: rollNo });
    res.json(results.map(r => r.examTitle)); 
});

// Submit Exam (With Double Attempt Security Lock)
app.post('/api/submit-exam', async (req, res) => {
    try {
        const { studentName, rollNo, mobile, examTitle, answers } = req.body;
        
        // Security Lock: Check if already submitted
        const alreadySubmitted = await Result.findOne({ rollNo: rollNo, examTitle: examTitle });
        if (alreadySubmitted) {
            return res.json({ success: false, message: "❌ You have already submitted this exam! Double attempts are not allowed." });
        }

        await Result.create({ studentName, rollNo, mobile, examTitle, studentAnswers: answers, isReleased: false });
        res.json({ success: true, message: "Exam submitted! Admin will check your copy soon." });
    } catch (err) { res.status(500).json({ success: false, message: "Failed to submit exam" }); }
});

// Feedback APIs
app.post('/api/feedback', async (req, res) => {
    try { await Feedback.create(req.body); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: "Feedback failed" }); }
});
app.get('/api/admin/feedback', async (req, res) => {
    try { res.json(await Feedback.find().sort({ date: -1 })); } 
    catch (err) { res.status(500).json({ error: "Failed to fetch feedback" }); }
});

// Result APIs (Admin & Student)
app.get('/api/admin/results', async (req, res) => {
    try { res.json(await Result.find().sort({ _id: -1 })); } 
    catch (err) { res.status(500).json({ error: "Failed to fetch copies" }); }
});

app.put('/api/admin/check-copy/:id', async (req, res) => {
    try {
        await Result.findByIdAndUpdate(req.params.id, { score: req.body.adminMarks, isReleased: true });
        res.json({ success: true, message: "Result Uploaded Successfully!" });
    } catch (err) { res.status(500).json({ error: "Failed to upload result" }); }
});

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
                                     
