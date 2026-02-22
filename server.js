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
// 6. ROUTES: SIGNUP & LOGIN (1000-2000 Limit)
// ==========================================
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, mobile, rollNo } = req.body; 
        
        const rNum = parseInt(rollNo);
        if (isNaN(rNum) || rNum < 1000 || rNum > 2000) {
            return res.send("<script>alert('❌ Invalid Roll No! Only Roll Numbers between 1000 and 2000 are allowed.'); window.location.href='/signup.html';</script>");
        }

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
        
        if (!loginId.includes('@') && !loginId.startsWith('GL-')) {
            const rNum = parseInt(loginId);
            if (isNaN(rNum) || rNum < 1000 || rNum > 2000) {
                return res.send("<script>alert('❌ Invalid Roll No! Must be between 1000 and 2000.'); window.location.href='/login.html';</script>");
            }
        }

        const user = await User.findOne({ $or: [{ email: loginId }, { rollNo: loginId }], password: password });
        if (!user) return res.send("<script>alert('❌ Invalid Email/Roll No or Password.'); window.location.href='/login.html';</script>");
        
        sendLoginAlertEmail(user.email, user.username); 
        res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(user.username)}&roll=${user.rollNo || ''}`);
    } catch (err) { res.send("Login Error"); }
});

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy();
        res.redirect('/login.html');
    });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(req.user.username)}&roll=${req.user.rollNo}`);
});

// ==========================================
// 7. COMPILER API (JDoodle)
// ==========================================
app.post('/api/compile-code', async (req, res) => {
    try {
        const { script, language, versionIndex } = req.body;
        const response = await fetch('https://api.jdoodle.com/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: process.env.JDOODLE_CLIENT_ID, 
                clientSecret: process.env.JDOODLE_CLIENT_SECRET, 
                script: script, language: language, versionIndex: versionIndex
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) { res.status(500).json({ error: "Compiler connection failed!" }); }
});

// ==========================================
// 8. ADMIN & STUDENT APIs
// ==========================================

// Courses & Exams
app.get('/api/courses', async (req, res) => res.json(await Course.find().sort({ createdAt: -1 })));
app.post('/api/courses', async (req, res) => res.json(await Course.create(req.body)));
app.delete('/api/courses/:id', async (req, res) => { await Course.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.get('/api/exams', async (req, res) => res.json(await Exam.find({ isActive: true }).sort({ _id: -1 })));
app.get('/api/exams/:id', async (req, res) => res.json(await Exam.findById(req.params.id)));
app.post('/api/exams', async (req, res) => res.json(await Exam.create(req.body)));
app.delete('/api/exams/:id', async (req, res) => { await Exam.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.post('/api/my-submissions', async (req, res) => {
    const { rollNo } = req.body;
    if (!rollNo) return res.json([]);
    const results = await Result.find({ rollNo: rollNo });
    res.json(results.map(r => r.examTitle)); 
});

// ==========================================
// 🌟 9. AUTO-CHECKING & ANSWER KEY ENGINE
// ==========================================

// Auto-Submit & Check
app.post('/api/submit-exam', async (req, res) => {
    try {
        const { studentName, rollNo, mobile, examTitle, answers } = req.body;
        
        // Security Check: Lock double attempt
        const alreadySubmitted = await Result.findOne({ rollNo: rollNo, examTitle: examTitle });
        if (alreadySubmitted) return res.json({ success: false, message: "❌ You have already submitted this exam! Double attempts are not allowed." });

        // 🟢 AUTO-GRADING LOGIC
        const exam = await Exam.findOne({ title: examTitle });
        let autoScore = 0;

        if (exam) {
            exam.questions.forEach((q, index) => {
                let qKey = `Q${index + 1}`;
                // Compare student answer with Correct Answer
                if (answers[qKey] === q.correctAnswer) {
                    autoScore += (q.marks || 1); // Har sahi jawab par marks do
                }
            });
        }

        // isReleased: true kar diya taaki marks turant bacche ko dikhein!
        await Result.create({ 
            studentName, rollNo, mobile, examTitle, 
            studentAnswers: answers, score: autoScore, isReleased: true 
        });
        
        res.json({ success: true, message: "Exam submitted & Auto-Checked successfully!" });
    } catch (err) { res.status(500).json({ success: false, message: "Failed to submit exam" }); }
});

// Answer Key & Live Rank Generator
app.post('/api/answer-key', async (req, res) => {
    try {
        const { rollNo, examTitle } = req.body;
        
        const result = await Result.findOne({ rollNo, examTitle });
        const exam = await Exam.findOne({ title: examTitle });
        
        if (!result || !exam) return res.json({ success: false, message: "Data not found" });

        // 🏆 AUTO-RANKING LOGIC
        const allResults = await Result.find({ examTitle }).sort({ score: -1 });
        const rank = allResults.findIndex(r => r.rollNo === rollNo) + 1;
        const totalStudents = allResults.length;

        res.json({ success: true, result, exam, rank, totalStudents });
    } catch (err) { res.status(500).json({ success: false }); }
});
// ==========================================
// 🏆 NAYA: LEADERBOARD & RANK LIST API
// ==========================================
app.post('/api/leaderboard', async (req, res) => {
    try {
        const { examTitle } = req.body;
        
        // Us exam ke saare results fetch karo aur score ke hisaab se descending (-1) sort karo
        const allResults = await Result.find({ examTitle }).sort({ score: -1 });

        // Rank format ready karo
        const leaderboard = allResults.map((r, index) => ({
            rank: index + 1,
            studentName: r.studentName,
            rollNo: r.rollNo,
            score: r.score
        }));

        res.json({ success: true, leaderboard, examTitle });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


// Normal Result Checker
app.post('/api/check-result', async (req, res) => {
    try {
        const { rollNo, password } = req.body;
        const student = await User.findOne({ rollNo, password });
        if(!student) return res.json({ success: false, message: "Invalid Details" });
        
        const myResults = await Result.find({ rollNo: rollNo, isReleased: true });
        res.json({ success: true, results: myResults, studentName: student.username });
    } catch (err) { res.status(500).json({ error: "Server Error" }); }
});

// Feedback & Admin Results
app.post('/api/feedback', async (req, res) => {
    try { await Feedback.create(req.body); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: "Feedback failed" }); }
});
app.get('/api/admin/feedback', async (req, res) => res.json(await Feedback.find().sort({ date: -1 })));
app.get('/api/admin/results', async (req, res) => res.json(await Result.find().sort({ _id: -1 })));

app.put('/api/admin/check-copy/:id', async (req, res) => {
    try {
        await Result.findByIdAndUpdate(req.params.id, { score: req.body.adminMarks, isReleased: true });
        res.json({ success: true, message: "Result Uploaded Successfully!" });
    } catch (err) { res.status(500).json({ error: "Failed to upload result" }); }
});

// ==========================================
// VERCEL EXPORT (Server Start)
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, "0.0.0.0", () => { console.log(`🚀 Server is running beautifully on port ${PORT}`); });
}
module.exports = app;

