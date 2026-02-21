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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'codemaster_secret',
    resave: false, saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// ADMIN SECURITY
// ==========================================
app.post('/admin-login', (req, res) => {
    if (req.body.password === "Suhel@123") {
        req.session.isAdmin = true; 
        res.redirect('/admin.html');
    } else {
        res.send('<script>alert("❌ Incorrect Password!"); window.location.href="/admin.html";</script>');
    }
});
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// MONGODB SCHEMAS
// ==========================================
mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ MongoDB Connected'));

const User = mongoose.model('User', new mongoose.Schema({ username: String, email: String, password: String, mobile: String, rollNo: String, googleId: String }));
const Course = mongoose.model('Course', new mongoose.Schema({ title: String, description: String, thumbnail: String, videoLink: String }));
const Exam = mongoose.model('Exam', new mongoose.Schema({ title: String, totalMarks: Number, duration: Number, questions: Array, isActive: { type: Boolean, default: true } }));
const Result = mongoose.model('Result', new mongoose.Schema({ studentName: String, rollNo: String, examTitle: String, studentAnswers: Object, score: Number, isReleased: { type: Boolean, default: false } }));
const Feedback = mongoose.model('Feedback', new mongoose.Schema({ studentName: String, rollNo: String, examTitle: String, message: String, date: { type: Date, default: Date.now } }));

// ==========================================
// GOOGLE OAUTH
// ==========================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://learn-coding-jade.vercel.app/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
      try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
              const generatedRollNo = "GL-" + Math.floor(1000 + Math.random() * 9000);
              user = await User.create({ googleId: profile.id, username: profile.displayName, email: profile.emails[0].value, rollNo: generatedRollNo });
          }
          return done(null, user);
      } catch (err) { return done(err, null); }
  }
));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => { const user = await User.findById(id); done(null, user); });

// ==========================================
// 🚀 FIXED: LOGIN & SIGNUP ROUTES
// ==========================================
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, mobile, rollNo } = req.body; 
        const existing = await User.findOne({ $or: [{ email }, { rollNo }] });
        if(existing) return res.send("<script>alert('Email or Roll No already exists!'); window.location.href='/signup.html';</script>");
        
        await User.create({ username, email, password, mobile, rollNo });
        res.redirect('/login.html?signup=success');
    } catch (err) { res.send("Error"); }
});

app.post('/login', async (req, res) => {
    try {
        const { loginId, password } = req.body; 
        // 🌟 FIX: Find user by Email OR Roll Number
        const user = await User.findOne({ $or: [{ email: loginId }, { rollNo: loginId }], password: password });
        
        if (!user) return res.send("<script>alert('❌ Invalid Details!'); window.location.href='/login.html';</script>");
        
        // 🌟 FIX: Send data in URL to bypass Vercel Session loss
        res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(user.username)}&roll=${user.rollNo || ''}`);
    } catch (err) { res.send("Login Error"); }
});

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(req.user.username)}&roll=${req.user.rollNo}`);
});

app.get('/logout', (req, res) => { req.logout(err=>{}); res.redirect('/login.html'); });

// ==========================================
// APIs
// ==========================================
app.get('/api/courses', async (req, res) => res.json(await Course.find().sort({ _id: -1 })));
app.get('/api/exams', async (req, res) => res.json(await Exam.find({ isActive: true }).sort({ _id: -1 })));
app.get('/api/exams/:id', async (req, res) => res.json(await Exam.findById(req.params.id)));

// Results & Feedback APIs
app.get('/api/admin/results', async (req, res) => res.json(await Result.find().sort({ _id: -1 })));
app.put('/api/admin/check-copy/:id', async (req, res) => { await Result.findByIdAndUpdate(req.params.id, { score: req.body.adminMarks, isReleased: true }); res.json({ success: true }); });
app.get('/api/admin/feedback', async (req, res) => res.json(await Feedback.find().sort({ date: -1 })));

app.post('/api/submit-exam', async (req, res) => { await Result.create(req.body); res.json({ success: true }); });
app.post('/api/feedback', async (req, res) => { await Feedback.create(req.body); res.json({ success: true }); });
app.post('/api/check-result', async (req, res) => {
    const student = await User.findOne({ rollNo: req.body.rollNo, password: req.body.password });
    if(!student) return res.json({ success: false, message: "Invalid Details" });
    const results = await Result.find({ rollNo: req.body.rollNo, isReleased: true });
    res.json({ success: true, results, studentName: student.username });
});

// Admin Exam/Course creation APIs
app.post('/api/courses', async (req, res) => res.json(await Course.create(req.body)));
app.delete('/api/courses/:id', async (req, res) => { await Course.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.post('/api/exams', async (req, res) => res.json(await Exam.create(req.body)));
app.delete('/api/exams/:id', async (req, res) => { await Exam.findByIdAndDelete(req.params.id); res.json({ success: true }); });

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
                  
