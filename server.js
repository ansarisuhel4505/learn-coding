require('dotenv').config();
const express = require("express");
const app = express();

app.get("/health", (req, res) => {
  res.send("SERVER WORKING");
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Test server running on " + PORT);
});
/*const express = require('express');
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

// Session (Login memory) hamesha pehle start hona chahiye
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
    // Agar session me admin login hai, toh page khol do
    if (req.session && req.session.isAdmin) {
        next(); 
    } else {
        // Agar login nahi hai, toh yeh Password Screen dikhao
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

// Password Check Karne ka API
app.post('/admin-login', (req, res) => {
    const enteredPassword = req.body.password;
    const adminPassword = "Suhel@123"; // Aapka set kiya hua password

    if (enteredPassword === adminPassword) {
        req.session.isAdmin = true; // Server ko yaad dila diya ki ye admin hai
        res.redirect('/admin.html');
    } else {
        // Galat password par wapas form dikha kar alert do
        res.send('<script>alert("❌ Incorrect Password! Access Denied."); window.location.href="/admin.html";</script>');
    }
});

// Static files (public folder) ki line HAMESHA in sabke baad aani chahiye
app.use(express.static(path.join(__dirname, 'public')));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ==========================================
// 2. MONGODB DATABASE SETUP & SCHEMA
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

const UserSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    mobile: String,    // Mobile number added
    googleId: String,
    photo: String
});
const User = mongoose.model('User', UserSchema);
// ==========================================
// COURSE & EXAM DATABASE SCHEMAS (Naya Code)
// ==========================================

// 1. Course Ka Schema
const CourseSchema = new mongoose.Schema({
    title: String,
    description: String,
    thumbnail: String,
    videoLink: String, // YouTube ya Render ka video link
    createdAt: { type: Date, default: Date.now }
});
const Course = mongoose.model('Course', CourseSchema);
const ExamSchema = new mongoose.Schema({
    title: String,
    totalMarks: Number,
    duration: Number, // ⏳ NAYA: Exam ka time limit (minutes me)
    questions: [{ 
        questionText: String, 
        options: [String], 
        correctAnswer: String,
        marks: Number // 💯 NAYA: Har question ke alag marks
    }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const Exam = mongoose.model('Exam', ExamSchema);


// 3. Result Ka Schema
const ResultSchema = new mongoose.Schema({
    studentId: String,
    studentName: String,
    examTitle: String,
    score: Number,
    isReleased: { type: Boolean, default: false } // Jab admin release karega tab true hoga
});
const Result = mongoose.model('Result', ResultSchema);


// ==========================================
// 3. PROFESSIONAL EMAIL SYSTEM (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    },
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// Template 1: Welcome Email (Sirf naye account par)
async function sendWelcomeEmail(toEmail, userName) {
    const mailOptions = {
        from: `"CodeMaster Team" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Welcome to CodeMaster! 🚀 Start Your Coding Journey",
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 15px; background-color: #f8fafc;">
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                    <h1 style="color: #3b82f6; margin: 0; font-size: 32px;">Code<span style="color: #0f172a;">Master</span></h1>
                </div>
                <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <h2 style="color: #0f172a; margin-top: 0;">Welcome to the community, ${userName.split(' ')[0]}! 👋</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        We are thrilled to have you on board. CodeMaster is your ultimate platform to master Full-Stack Development, Artificial Intelligence, and Mobile Apps.
                    </p>
                    <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
                        <a href="https://learn-coding-2.onrender.com/dashboard.html" style="background-color: #3b82f6; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Your Dashboard</a>
                    </div>
                </div>
                <div style="text-align: center; padding-top: 25px; color: #94a3b8; font-size: 13px;">
                    <p>&copy; 2026 CodeMaster by Suhel Ansari. All rights reserved.</p>
                </div>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Welcome Email sent to: ${toEmail}`);
    } catch (err) {
        console.error("❌ Welcome Email Failed:", err);
    }
}

// Template 2: Login Security Alert (Har baar login par)
async function sendLoginAlertEmail(toEmail, userName) {
    const mailOptions = {
        from: `"CodeMaster Security" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Security Alert: New Login Detected 🚨",
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 500px; margin: auto;">
                <h2 style="color: #d9534f;">New Login Detected</h2>
                <p>Hello <b>${userName}</b>,</p>
                <p>We noticed a new login to your CodeMaster Student Account just now.</p>
                <p><b>Time:</b> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
                <p style="color: #555;">If this was you, you don't need to do anything. If you didn't log in, please reply to this email immediately to secure your account.</p>
                <hr>
                <p style="font-size: 12px; color: #888;">CodeMaster Security Team</p>
            </div>
        `
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log(`🔒 Login Alert Email sent to: ${toEmail}`);
    } catch (err) {
        console.error("❌ Login Alert Email Failed:", err);
    }
}

// ==========================================
// 4. GOOGLE OAUTH CONFIGURATION
// ==========================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://learn-coding-2.onrender.com/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
      try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
              // Purana user hai, toh Security Alert bhej do
              sendLoginAlertEmail(user.email, user.username);
              return done(null, user); 
          } else {
              // Naya user hai, toh database mein save karo aur Welcome Mail bhejo
              user = await User.create({
                  googleId: profile.id,
                  username: profile.displayName,
                  email: profile.emails[0].value,
                  photo: profile.photos[0].value
              });
              sendWelcomeEmail(user.email, user.username);
              return done(null, user);
          }
      } catch (err) {
          return done(err, null);
      }
  }
));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// ==========================================
// 5. ROUTES (Signup, Login, API, Admin)
// ==========================================

// --- Manual Signup Route ---
// ==========================================
// 5. ROUTES (Signup, Login, API, Admin)
// ==========================================

// --- Pages Dikhane Ke Liye (GET Routes) ---
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Iske neeche aapka purana app.post('/signup'...) code rahega...

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password, mobile } = req.body; 
        
        const existingUser = await User.findOne({ email });
        if(existingUser) {
            return res.send("User already exists. <a href='/login.html'>Login here</a>");
        }

        const newUser = await User.create({ username, email, password, mobile });
        sendWelcomeEmail(email, username);
        res.redirect('/login.html');
    } catch (err) {
        console.error("Signup Error:", err);
        res.send("Error during signup.");
    }
});

// --- Manual Login Route (Student Portal) ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || user.password !== password) {
            return res.send("Invalid Email or Password. <a href='/login.html'>Try Again</a>");
        }

        // Login successful, email alert bhejo aur session save karo
        sendLoginAlertEmail(user.email, user.username);
        
        req.session.userId = user._id;
        req.session.username = user.username;
        
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error("Login Error:", err);
        res.send("An error occurred during login.");
    }
});

// --- Google Login Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  function(req, res) {
    // Session variables save karna
    req.session.userId = req.user._id;
    req.session.username = req.user.username;
    res.redirect('/dashboard.html');
  }
);

// --- Get User Info API (Frontend ke liye) ---
app.get('/user-info', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else if (req.user) {
        res.json({ loggedIn: true, username: req.user.username });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- Admin Portal Route ---
app.get('/admin/users', async (req, res) => {
    try {
        const allUsers = await User.find({}, '-password'); // Password chhod kar sab details lo
        res.json({
            total_students: allUsers.length,
            students: allUsers
        });
    } catch (err) {
        res.send("Error fetching users");
    }
});

// --- Logout Route ---
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy();
        res.redirect('/login.html');
    });
});
// ==========================================
// 🔴 ADMIN APIs: COURSE MANAGEMENT
// ==========================================

// 1. Saare Courses Dekhne ke liye (Fetch Courses)
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find().sort({ createdAt: -1 }); // Naye courses upar dikhenge
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

// 2. Naya Course Add Karne ke liye
app.post('/api/courses', async (req, res) => {
    try {
        const { title, description, thumbnail, videoLink } = req.body;
        const newCourse = await Course.create({ title, description, thumbnail, videoLink });
        res.json({ success: true, message: "Course added successfully!", course: newCourse });
    } catch (err) {
        console.error("Course Add Error:", err);
        res.status(500).json({ error: "Failed to add course" });
    }
});

// 3. Course Delete Karne ke liye
app.delete('/api/courses/:id', async (req, res) => {
    try {
        await Course.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Course deleted!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete course" });
    }
});
// ==========================================
// 🔴 ADMIN APIs: EXAM MANAGEMENT
// ==========================================

// 1. Saare Exams Dekhne ke liye
app.get('/api/exams', async (req, res) => {
    try {
        const exams = await Exam.find().sort({ _id: -1 }); // Naye exams upar
        res.json(exams);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch exams" });
    }
});

// 2. Naya Exam Create Karne ke liye (Asli Dynamic Exam)
app.post('/api/exams', async (req, res) => {
    try {
        // Ab admin panel se title, marks, time aur questions sab aayega
        const { title, totalMarks, duration, questions } = req.body;
        
        const newExam = await Exam.create({ 
            title, 
            totalMarks, 
            duration, 
            questions 
        });

        res.json({ success: true, message: "Real Exam created successfully!", exam: newExam });
    } catch (err) {
        console.error("Exam Create Error:", err);
        res.status(500).json({ error: "Failed to create exam" });
    }
});


// 3. Exam Delete Karne ke liye
app.delete('/api/exams/:id', async (req, res) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Exam deleted!" });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete exam" });
    }
});
// ==========================================
// 🔴 ADMIN APIs: RESULTS & COPY CHECKING
// ==========================================

// 1. Result Upload karna (Jab admin copy check karke marks de)
app.post('/api/results', async (req, res) => {
    try {
        const { studentName, examTitle, score } = req.body;
        
        // Database mein Result save karein
        const newResult = await Result.create({
            studentName: studentName,
            examTitle: examTitle,
            score: score,
            isReleased: true // Marks ab officially release ho gaye hain
        });

        res.json({ success: true, message: "Result uploaded successfully!", result: newResult });
    } catch (err) {
        console.error("Result Upload Error:", err);
        res.status(500).json({ error: "Failed to upload result" });
    }
});

// 2. Saare Checked Results Dekhne ke liye (Admin record ke liye)
app.get('/api/results', async (req, res) => {
    try {
        const results = await Result.find().sort({ _id: -1 }); // Naye result upar
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch results" });
    }
});
// ==========================================
// 🔴 STUDENT APIs: EXAM ENGINE & SUBMISSION
// ==========================================

// 1. Ek Single Exam ka poora paper mangwane ke liye (Exam Portal ke liye)
app.get('/api/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        res.json(exam);
    } catch (err) {
        res.status(500).json({ error: "Exam not found" });
    }
});

// 2. Exam Submit karna aur Auto-Check karke Result save karna
app.post('/api/submit-exam', async (req, res) => {
    try {
        const { studentName, examTitle, score } = req.body;
        
        // Asli exam mein MCQ auto-check ho jate hain, toh hum isReleased true kar rahe hain
        const submission = await Result.create({
            studentName: studentName,
            examTitle: examTitle,
            score: score,
            isReleased: true // Student apna result turant dekh payega!
        });

        res.json({ success: true, message: "Exam submitted & checked successfully!" });
    } catch (err) {
        console.error("Exam Submit Error:", err);
        res.status(500).json({ error: "Failed to submit exam" });
    }
});


// ==========================================
// SERVER START LOGIC (Cloud Ready)
// ==========================================
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
*/


















