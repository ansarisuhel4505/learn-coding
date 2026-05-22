// 1. सबसे पहले .env को लोड करें (केवल एक बार)
require('dotenv').config();

const express = require('express');
const pdfParse = require('pdf-parse');// PDF पढ़ने के लिए
const bcrypt = require('bcryptjs'); // 🌟 NAYA: Password Security ke liye
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');


// 🌟 Google AI & Multer Setup 🌟
const { GoogleGenerativeAI } = require("@google/generative-ai");
const multer = require('multer');

// इमेज को मेमोरी में टेम्पररी सेव करने के लिए
const upload = multer({ storage: multer.memoryStorage() }); 
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: GEMINI_API_KEY is missing from Environment Variables!");
} else {
    console.log("✅ SUCCESS: GEMINI_API_KEY has been loaded.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const app = express();
const PORT = process.env.PORT || 8080;
// ==========================================
// 1. MIDDLEWARE & STATIC FILES
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 🌟 यह लाइन Vercel के लिए बहुत ज़रूरी है
app.set('trust proxy', 1); 

// 🌟 NAYA: OTP Rate Limiter (Email-Based, 20 Minutes Block)
const RateLimitMongo = require('rate-limit-mongo');

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 मिनट
    max: 3, // 3 बार से ज़्यादा नहीं
    store: new RateLimitMongo({
        uri: process.env.MONGO_URI, // वही डेटाबेस जो आप यूज़ कर रहे हैं
        collectionName: 'otp_rate_limits',
        expireTimeSeconds: 600 // 10 मिनट
    }),
    keyGenerator: (req) => {
        // ईमेल के बेस पर ब्लॉक करेगा, चाहे IP कुछ भी हो
        return req.body.email ? req.body.email.toLowerCase() : req.ip;
    },
    message: { success: false, message: "⚠️ Too many attempts! Please try again after 10 minutes." }
});


app.use((req, res, next) => {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '-1');
    next();
});

// 🌟 VERCEL SESSION FIX (MongoDB Store) 🌟
const MongoStore = require('connect-mongo');

app.use(session({
    secret: process.env.SESSION_SECRET || 'codemaster_super_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ 
        mongoUrl: process.env.MONGO_URI, // Session अब MongoDB में सेव होगा!
        ttl: 24 * 60 * 60 // 1 दिन तक Admin लॉगिन रहेगा
    }),
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 2. ADMIN SECURITY LOCK
// ==========================================
app.post('/admin-login', (req, res) => {
    const enteredPassword = req.body.password;
        const adminPassword = process.env.ADMIN_PASSWORD;
    if (enteredPassword === adminPassword) {
        req.session.isAdmin = true; 
        res.redirect('/admin.html');
    } else {
        res.send('<script>alert("❌ Incorrect Password! Access Denied."); window.location.href="/admin.html";</script>');
    }
});
// 🌟 NAYA: Admin Logout Route
app.get('/admin-logout', (req, res) => {
    req.session.isAdmin = false; 
    res.redirect('/'); 
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
    googleId: String, photo: String,
    // 🌟 NAYA: स्टूडेंट को ब्लॉक करने का सिस्टम
    isBlocked: { type: Boolean, default: false } 
}));

const Course = mongoose.model('Course', new mongoose.Schema({
    title: String, description: String, thumbnail: String, videoLink: String,
    createdAt: { type: Date, default: Date.now }
}));

const Exam = mongoose.model('Exam', new mongoose.Schema({
    title: String, totalMarks: Number, duration: Number,
    // 🌟 NAYA: scheduleTime add kiya gaya
    scheduleTime: { type: Date, default: null }, 
    // 🌟 NAYA: question me 'type' add kiya gaya (mcq ya numerical)
    questions: [{ 
        type: { type: String, default: 'mcq' }, 
        questionText: String, 
        options: [String], 
        correctAnswer: String, 
        marks: Number 
    }],
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
}));

const Result = mongoose.model('Result', new mongoose.Schema({
    studentName: String, rollNo: String, mobile: String,
    examTitle: String, studentAnswers: Object, score: { type: Number, default: 0 },
    isReleased: { type: Boolean, default: false },
    // 🌟 NAYA: Certificate System
    certificateId: { type: String, default: () => "CM-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random()*1000) },
    submitDate: { type: Date, default: Date.now }
}));

const Feedback = mongoose.model('Feedback', new mongoose.Schema({
    studentName: String, rollNo: String, examTitle: String, message: String,
    date: { type: Date, default: Date.now }
}));

// 🌟 NAYA: Secure OTP Schema (Auto-delete after 10 mins)
const OTPSchema = new mongoose.Schema({
    email: String,
    otp: String,
    userData: Object, 
    type: String, 
    createdAt: { type: Date, default: Date.now, expires: 600 } // 600 seconds = 10 mins me OTP auto-delete
});
const OTP = mongoose.model('OTP', OTPSchema);

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
    callbackURL: "https://learn-coding-jet.vercel.app/auth/google/callback",
    proxy:true
},
  async function(accessToken, refreshToken, profile, done) {
      try {
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email: profile.emails[0].value }] });
          
          if (user) {
              // 🚨 GOOGLE BLOCK CHECK
              if (user.isBlocked) {
                  return done(null, false, { message: 'Account Suspended by Admin' });
              }
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
// ==========================================
// 🚀 SECURE SIGNUP (OTP VERIFICATION SYSTEM)
// ==========================================

// 1️⃣ Step 1: फॉर्म सबमिट करने पर OTP भेजना
app.post('/api/signup-init', otpLimiter, async (req, res) => {
    try {
        const { username, email, password, mobile, rollNo } = req.body; 
        
        // 1. Roll No चेक करो
        const rNum = parseInt(rollNo);
        if (isNaN(rNum) || rNum < 1000 || rNum > 2000) {
            return res.json({ success: false, message: '❌ Invalid Roll No! Must be between 1000 and 2000.' });
        }

       // 2. चेक करो कि बच्चा डेटाबेस में है या नहीं (Mobile भी चेक करो)
        const existingUser = await User.findOne({ $or: [{ email }, { rollNo }, { mobile }] });
        
        if (existingUser) {
            // 🚨 अगर बच्चा ब्लॉक है, तो उसे साफ-साफ बताओ
            if (existingUser.isBlocked) {
                return res.json({ success: false, message: '🚨 Access Denied! This Email or Mobile is permanently suspended.' });
            }
            return res.json({ success: false, message: '❌ Email, Mobile or Roll No already registered!' });
        }

        // 3. 6-digit का OTP बनाओ
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
                // 4. बच्चे का डेटा MongoDB में सुरक्षित सेव करो
        await OTP.findOneAndUpdate(
            { email: email, type: 'signup' }, 
            { email, otp, userData: { username, email, password, mobile, rollNo }, type: 'signup' }, 
            { upsert: true, new: true }
        );
        
        // 5. ईमेल पर OTP भेजो
        const mailOptions = {
            from: `"CodeMaster Verification" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Verify Your CodeMaster Account 🚀',
            html: `<h2>Welcome ${username}!</h2>
                   <p>Your OTP to verify your email and create your account is: <b style="font-size: 24px; color: #3b82f6; letter-spacing: 2px;">${otp}</b></p>
                   <p>This OTP is valid for 10 minutes. Do not share it with anyone.</p>`
        };
        
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP sent successfully to your email!' });

    } catch (err) {
        console.error(err);
        res.json({ success: false, message: 'Server error during signup initialization.' });
    }
});

// 2️⃣ Step 2: OTP चेक करके असली अकाउंट बनाना
app.post('/api/signup-verify', async (req, res) => {
    try {
                const { email, otp } = req.body;
        const pending = await OTP.findOne({ email: email, otp: otp, type: 'signup' });

        // चेक करो कि OTP डेटाबेस में है या नहीं
        if (pending) {
            
            const { username, password, mobile, rollNo } = pending.userData;
            
            // पासवर्ड को हैकर्स से बचाने के लिए एन्क्रिप्ट करो
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // डेटाबेस में असली अकाउंट बनाओ!
            await User.create({ username, email, password: hashedPassword, mobile, rollNo });
            
                        // MongoDB से इस्तेमाल हो चुका OTP डिलीट करो
            await OTP.deleteOne({ _id: pending._id });
            
            
            // वेलकम ईमेल भेजो
            sendWelcomeEmail(email, username);

            res.json({ success: true, message: 'Account created successfully!' });
        } else {
            res.json({ success: false, message: '❌ Invalid or Expired OTP.' });
        }
    } catch (err) {
        res.json({ success: false, message: 'Error creating account.' });
    }
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

        // Pehle user ko dhoondo (password bina check kiye)
        const user = await User.findOne({ $or: [{ email: loginId }, { rollNo: loginId }] });
        if (!user) return res.send("<script>alert('❌ User not found!'); window.location.href='/login.html';</script>");
        
        // 🚨 BLOCK CHECK: अगर बच्चा ब्लॉक है तो सीधा बाहर फेंको
        if (user.isBlocked) {
            return res.send("<script>alert('🚨 Access Denied! Your account has been permanently suspended by the Admin.'); window.location.href='/login.html';</script>");
        }

        // 🌟 MAGIC: Encrypted password ko check karna
        let isMatch = false;
        if (user.password.startsWith('$2')) {
            // Agar password naya (hashed) hai
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            // Backup: Agar purana test account hai (plain text wala)
            isMatch = (password === user.password);
        }

        if (!isMatch) return res.send("<script>alert('❌ Incorrect Password.'); window.location.href='/login.html';</script>");
        
        sendLoginAlertEmail(user.email, user.username); 
        res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(user.username)}&roll=${user.rollNo || ''}`);
    } catch (err) { res.send("Login Error"); }
});


app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        req.session.destroy();
        
        // 🌟 NAYA: Seedha Home Page par bhejo
        res.redirect('/'); 
    });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login.html' }), (req, res) => {
    res.redirect(`/dashboard.html?login=success&name=${encodeURIComponent(req.user.username)}&roll=${req.user.rollNo}`);
});
app.post('/api/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;
    try {
        // 🌟 NAYA: Naye password ko bhi encrypt karke save karo
        const hashedPassword = await bcrypt.hash(newPassword, 10);
              await User.updateOne({ email: email }, { password: hashedPassword });
        await OTP.deleteOne({ email: email, type: 'reset' }); 
  
        
        res.json({ success: true, message: 'Password updated successfully!' });
    } catch (error) {
        res.json({ success: false, message: 'Database error occurred while resetting password.' });
    }
});

// ==========================================
// 🌟 6.5 FORGOT PASSWORD & OTP SYSTEM
// ==========================================

// 1️⃣ Send OTP API (Email पर OTP भेजना)
app.post('/api/send-otp', otpLimiter, async (req, res) => {
    const { email } = req.body;
    
    // चेक करें कि बच्चा डेटाबेस में रजिस्टर है या नहीं
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: false, message: '❌ This email is not registered with CodeMaster!' });

    // 6-digit random OTP बनाना
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
            // OTP को MongoDB में सेव करना
    await OTP.findOneAndUpdate(
        { email: email, type: 'reset' }, 
        { email, otp, type: 'reset' }, 
        { upsert: true, new: true }
    );


    // Email का डिज़ाइन (आपके पहले से बने transporter का इस्तेमाल करके)
    const mailOptions = {
        from: `"CodeMaster Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'CodeMaster - Password Reset OTP 🔐',
        html: `<h2>Password Reset Request</h2>
               <p>Hello <b>${user.username}</b>,</p>
               <p>Your 6-digit OTP for password reset is: <b style="font-size: 24px; color: #3b82f6;">${otp}</b></p>
               <p>This OTP is valid for 5 minutes. Do not share it with anyone.</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'OTP sent successfully to your email!' });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: 'Failed to send email. Please try again later.' });
    }
});

// 2️⃣ Verify OTP API (OTP चेक करना)
app.post('/api/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email: email, otp: otp, type: 'reset' });

    // चेक करें कि OTP मौजूद है और मैच कर रहा है
    if (record) {
        res.json({ success: true, message: 'OTP Verified!' });
    } else {
        res.json({ success: false, message: '❌ Invalid or Expired OTP.' });
    }
});



// ==========================================
// 7. COMPILER API (JDoodle) - INPUT (STDIN) FIXED
// ==========================================
app.post('/api/compile-code', async (req, res) => {
    try {
        // 🌟 NAYA: Yahan 'stdin' (Custom Input) ko frontend se receive kiya
        const { script, language, versionIndex, stdin } = req.body; 
        
        const response = await fetch('https://api.jdoodle.com/v1/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId: process.env.JDOODLE_CLIENT_ID, 
                clientSecret: process.env.JDOODLE_CLIENT_SECRET, 
                script: script, 
                language: language, 
                versionIndex: versionIndex,
                stdin: stdin // 🌟 NAYA: Aur JDoodle API ko bhej diya!
            })
        });
        const data = await response.json();
        res.json(data);
    } catch (error) { res.status(500).json({ error: "Compiler connection failed!" }); }
});
           
// 👇 🔒 ADMIN LOGIN API 👇
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    // Vercel का पासवर्ड या लोकल पासवर्ड (Suhel@123)
        if (password === process.env.ADMIN_PASSWORD) {
        req.session.isAdmin = true; // 🌟 MAGIC FIX: अब गार्ड आपको नहीं रोकेगा!
        req.session.save(() => {
            res.json({ success: true, message: "Welcome Admin!" });
        });
        } else {
        res.json({ success: false, message: "Incorrect Password!" });
    }
});

// ==========================================
// 🛡️ SECURITY GUARD (IsAdmin Middleware)
// ==========================================
const checkAdmin = (req, res, next) => {
    // अगर Session में Admin है, तो ही आगे जाने दो
    if (req.session && req.session.isAdmin) {
        return next();
    }
    // वरना सीधा हैकर को एरर फेंक कर मारो!
    return res.status(403).json({ success: false, message: "🚨 Unauthorized! Admin access required." });
};
// 🌟 NAYA: UI को बताने के लिए कि असली एडमिन कौन है
app.get('/api/admin/check-session', checkAdmin, (req, res) => {
    res.json({ success: true, message: "Real Admin Verified" });
});


// 🌟 NAYA: Edit/Update Exam API 🌟
app.put('/api/exams/:id', checkAdmin, async (req, res) => {
    try {
        await Exam.findByIdAndUpdate(req.params.id, req.body);
        res.json({ success: true });
    } catch(err) {
        res.status(500).json({ success: false });
    }
});


// ==========================================
// 8. ADMIN & STUDENT APIs
// ==========================================

// 🔒 Locked Admin APIs (अब सर्वर कभी क्रैश नहीं होगा)
app.post('/api/courses', checkAdmin, async (req, res) => {
    try { await Course.create(req.body); res.json({ success: true }); } 
    catch(err) { res.json({ success: false, message: err.message }); }
});
app.delete('/api/courses/:id', checkAdmin, async (req, res) => { 
    await Course.findByIdAndDelete(req.params.id); res.json({ success: true }); 
});

app.post('/api/exams', checkAdmin, async (req, res) => {
    try { await Exam.create(req.body); res.json({ success: true }); } 
    catch(err) { res.json({ success: false, message: err.message }); }
});
app.delete('/api/exams/:id', checkAdmin, async (req, res) => { 
    await Exam.findByIdAndDelete(req.params.id); res.json({ success: true }); 
});

// 🔓 Public APIs (Student के लिए)
app.get('/api/courses', async (req, res) => res.json(await Course.find().sort({ createdAt: -1 })));
app.get('/api/exams', async (req, res) => res.json(await Exam.find({ isActive: true }).sort({ _id: -1 })));

// 🔒 Anti-Time Hack (स्मार्ट लॉजिक के साथ)
app.get('/api/exams/:id', async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.json({ success: false, message: "Exam not found" });

        // 🌟 MAGIC FIX: अगर 'Admin' एडिट कर रहा है, तो उस पर टाइम-लॉक मत लगाओ!
        if (!(req.session && req.session.isAdmin)) {
            // अगर स्टूडेंट है, तो टाइम चेक करो
            if (exam.scheduleTime) {
                const now = new Date();
                const startTime = new Date(exam.scheduleTime);
                const endTime = new Date(startTime.getTime() + (exam.duration + 5) * 60000); 

                if (now < startTime) {
                    return res.json({ success: false, message: "🚨 Nice try! The exam has not started yet according to server time." });
                } else if (now > endTime) {
                    return res.json({ success: false, message: "🚨 Time is over! You cannot start this exam now." });
                }
            }
        }
        
        // अगर सब सही है या एडमिन है, तो पेपर दे दो
        res.json(exam);
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
});            
app.post('/api/my-submissions', async (req, res) => {
    const { rollNo } = req.body;
    if (!rollNo) return res.json([]);
    const results = await Result.find({ rollNo: rollNo });
    res.json(results.map(r => r.examTitle)); 
});
// ==========================================
// 👤 MY PROFILE API
// ==========================================
app.post('/api/profile', async (req, res) => {
    try {
        const { rollNo } = req.body;
        // MongoDB से बच्चे को ढूँढो
        const user = await User.findOne({ rollNo: rollNo });
        
        if (!user) {
            return res.json({ success: false, message: "User not found!" });
        }
        
        // सुरक्षा के लिए पासवर्ड हटाकर बाकी डेटा भेज दो
        const { password, ...safeUserData } = user._doc;
        res.json({ success: true, user: safeUserData });
    } catch (err) {
        res.json({ success: false, message: "Server error while fetching profile." });
    }
});
// 🌟 NAYA: Edit/Update Profile API
app.put('/api/profile/update', async (req, res) => {
    try {
        const { rollNo, mobile, newPassword } = req.body;
        const user = await User.findOne({ rollNo });
        
        if (!user) return res.json({ success: false, message: "User not found!" });

        // मोबाइल नंबर अपडेट करें
        if (mobile) user.mobile = mobile;
        
        // अगर बच्चे ने नया पासवर्ड डाला है, तो उसे भी एन्क्रिप्ट (Secure) करके सेव करें
        if (newPassword && newPassword.trim() !== "") {
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();
        res.json({ success: true, message: "Profile updated successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error while updating profile." });
    }
});
// ==========================================
// 🤖 FINAL FIXED AI DOUBT SOLVER ROUTE
// ==========================================
app.post('/api/ask-ai', upload.single('image'), async (req, res) => {
    try {
        const prompt = req.body.message || "Explain this image and solve the doubt.";
        
        // 1.5-flash सबसे लेटेस्ट और स्टेबल मॉडल है
        // मॉडल का नाम इस तरह से देने पर v1beta वाला एरर खत्म हो जाएगा
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash" 
});
        
        let result;
        if (req.file) {
            const imageParts = [{
                inlineData: {
                    data: req.file.buffer.toString("base64"),
                    mimeType: req.file.mimetype
                }
            }];
            result = await model.generateContent([prompt, ...imageParts]);
        } else {
            result = await model.generateContent(prompt);
        }

        const response = await result.response;
        const text = response.text();
        res.json({ success: true, reply: text });

    } catch (error) {
        console.error("AI Error Details:", error.message); 
        
        // 🌟 स्मार्ट एरर हैंडलिंग: अब AI असली दिक्कत बताएगा
        if (error.status === 503) {
            res.json({ 
                success: false, 
                reply: "🤖 CodeMaster AI अभी बहुत सारे सवालों के जवाब दे रहा है (सर्वर बिज़ी है)। कृपया 1-2 मिनट बाद दोबारा पूछें!" 
            });
        } else {
            res.json({ 
                success: false, 
                reply: `⚠️ AI Brain Error: (Real Error: ${error.message})` 
            });
        }
    }
});
// ==========================================
// 📄 AI RESUME GENERATOR API
// ==========================================
app.post('/api/generate-resume', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // AI को सख्त निर्देश (Prompt) देना कि वो सिर्फ JSON फॉर्मेट में ही जवाब दे
        const aiPrompt = `You are an expert HR and Resume Writer. Based on the following user profile: "${prompt}", generate a professional resume. 
        Return ONLY a valid JSON object with exactly these keys: 
        "fullName", "jobTitle", "contactInfo", "summary", "skills", "experience".
        Make the summary impactful and experience detailed. Do not include any markdown formatting like \`\`\`json.`;

        // Gemini 2.5 Flash का इस्तेमाल (या जो भी मॉडल आप यूज़ कर रहे हैं)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(aiPrompt);
        const responseText = result.response.text();

        // AI कभी-कभी ```json लगा देता है, उसे साफ करना
        const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const resumeData = JSON.parse(cleanJsonText);

        res.json({ success: true, data: resumeData });
    } catch (error) {
        console.error("Resume Generation Error:", error);
        res.json({ success: false, message: "AI failed to generate resume. Try again!" });
    }
});
// ==========================================
// 📤 UPLOAD & PARSE OLD RESUME API
// ==========================================
// 'upload.single' (multer) का इस्तेमाल हम पहले ही चैटबॉट में कर चुके हैं
app.post('/api/upload-resume', upload.single('resumePdf'), async (req, res) => {
    try {
        if (!req.file) return res.json({ success: false, message: "No file uploaded!" });

        // 1. PDF फाइल के अंदर से सारा कच्चा टेक्स्ट (Raw Text) निकालना
        const pdfData = await pdfParse(req.file.buffer);
        const rawText = pdfData.text;

        // 2. AI को यह टेक्स्ट देना ताकि वह इसे सही हिस्सों (Skills, Experience) में बाँट सके
        const aiPrompt = `You are an expert HR. Read the following text extracted from a resume: 
        "${rawText}"
        Extract the details and return ONLY a valid JSON object with exactly these keys: 
        "fullName", "jobTitle", "contactInfo", "summary", "skills", "experience".
        Do not include any markdown formatting like \`\`\`json.`;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(aiPrompt);
        
        const cleanJsonText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const resumeData = JSON.parse(cleanJsonText);

        res.json({ success: true, data: resumeData });
    } catch (error) {
        console.error("PDF Parsing Error:", error);
        res.json({ success: false, message: "Failed to read PDF or AI error." });
    }
});
// ==========================================
// 🌟 9. AUTO-CHECKING & ANSWER KEY ENGINE
// ==========================================

// 🟢 Auto-Submit, Edit & Check Engine
app.post('/api/submit-exam', async (req, res) => {
    try {
        const { studentName, rollNo, mobile, examTitle, answers } = req.body;
        
       // 🟢 SMART AUTO-GRADING LOGIC (MCQ + Numerical + Negative Marking)
        const exam = await Exam.findOne({ title: examTitle });
        let autoScore = 0;

        if (exam) {
            exam.questions.forEach((q, index) => {
                let qKey = `Q${index + 1}`;
                let studentAns = answers[qKey];
                let correctAns = q.correctAnswer;
                let qMarks = parseFloat(q.marks) || 1; // डिफ़ॉल्ट 1 नंबर
                
                if (studentAns && studentAns !== "Skipped") {
                    let isCorrect = false;
                    if (q.type === 'numerical') {
                        if (parseFloat(studentAns) === parseFloat(correctAns)) isCorrect = true;
                    } else {
                        if (String(studentAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase()) isCorrect = true;
                    }
                    
                    if (isCorrect) {
                        autoScore += qMarks; // 🌟 सही जवाब पर पूरे नंबर
                    } else {
                        autoScore -= (qMarks * 0.25); // 🚨 गलत जवाब पर 25% (1/4) नंबर कटेंगे
                    }
                }
            });
        }
        
        // 🌟 NAYA: JavaScript के अजीब डेसिमल को ठीक करने के लिए (जैसे 14.750000001 को 14.75 बनाना)
        autoScore = parseFloat(autoScore.toFixed(2));
                

        // 🌟 NAYA LOGIC: अगर पहले से दिया है तो अपडेट (Edit) करो, वरना नया बनाओ
        let existingResult = await Result.findOne({ rollNo: rollNo, examTitle: examTitle });
        if (existingResult) {
            existingResult.studentAnswers = answers;
            existingResult.score = autoScore;
            existingResult.studentName = studentName;
            await existingResult.save();
        } else {
            await Result.create({ 
                studentName, rollNo, mobile, examTitle, 
                studentAnswers: answers, score: autoScore, isReleased: true 
            });
        }
        
        res.json({ success: true, message: "Exam Saved Successfully!" });
    } catch (err) { 
        console.error("Submit Error:", err);
        res.status(500).json({ success: false, message: "Failed to submit exam." }); 
    }
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


// 🏆 FIX: Normal Result Checker (Bcrypt Password Support)
app.post('/api/check-result', async (req, res) => {
    try {
        const { rollNo, password } = req.body;
        
        // 1. पहले सिर्फ रोल नंबर से स्टूडेंट को ढूँढो
        const student = await User.findOne({ rollNo: rollNo });
        if(!student) return res.json({ success: false, message: "Invalid Roll Number!" });
        
        // 2. अब एन्क्रिप्टेड पासवर्ड को चेक करो
        let isMatch = false;
        if (student.password && student.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, student.password); // नया Hashed Password
        } else {
            isMatch = (password === student.password); // पुराने टेस्टिंग अकाउंट्स के लिए
        }

        if(!isMatch) return res.json({ success: false, message: "Incorrect Password!" });
        
        // 3. अगर पासवर्ड सही है, तो रिजल्ट भेज दो
        const myResults = await Result.find({ rollNo: rollNo, isReleased: true });
        
        // 🌟 NAYA: Certificate ID generate agar nahi hai (Backward compatibility)
        const formattedResults = myResults.map(r => {
            if (!r.certificateId) {
                r.certificateId = "CM-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random()*1000);
                r.save(); // Purane results ke liye background me save kar do
            }
            return r;
        });

        res.json({ success: true, results: formattedResults, studentName: student.username });
    } catch (err) { 
        console.error("Result Check Error:", err);
        res.status(500).json({ error: "Server Error" }); 
    }
});

// Feedback & Admin Results
app.post('/api/feedback', async (req, res) => {
    try { await Feedback.create(req.body); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: "Feedback failed" }); }
});
app.get('/api/admin/feedback', async (req, res) => res.json(await Feedback.find().sort({ date: -1 })));
app.get('/api/admin/results', async (req, res) => res.json(await Result.find().sort({ _id: -1 })));

app.put('/api/admin/check-copy/:id', checkAdmin, async (req, res) => {
    try {
        await Result.findByIdAndUpdate(req.params.id, { score: req.body.adminMarks, isReleased: true });
        res.json({ success: true, message: "Result Uploaded Successfully!" });
    } catch (err) { res.status(500).json({ error: "Failed to upload result" }); }
});
// 🗑️ Admin Delete Options
app.delete('/api/admin/results/:id', checkAdmin, async (req, res) => { await Result.findByIdAndDelete(req.params.id); res.json({ success: true }); });
app.delete('/api/admin/feedback/:id', checkAdmin, async (req, res) => { await Feedback.findByIdAndDelete(req.params.id); res.json({ success: true }); });
// ==========================================
// 👥 MANAGE STUDENTS APIs (Admin Only)
// ==========================================

// सारे बच्चों की लिस्ट लाना
app.get('/api/admin/students', checkAdmin, async (req, res) => {
    try {
        const students = await User.find().sort({ _id: -1 }); 
        res.json({ success: true, students });
    } catch (err) { res.status(500).json({ success: false }); }
});

// किसी बच्चे को डिलीट करना
app.delete('/api/admin/students/:id', checkAdmin, async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// एडमिन द्वारा किसी बच्चे का पासवर्ड बदलना
app.put('/api/admin/students/reset-password/:id', checkAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        const hashedPassword = await bcrypt.hash(newPassword, 10); // पासवर्ड एन्क्रिप्ट करें
        await User.findByIdAndUpdate(req.params.id, { password: hashedPassword });
        res.json({ success: true, message: "Password reset successfully!" });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🚨 🌟 NAYA: Admin द्वारा किसी बच्चे को Block या Unblock करना
app.put('/api/admin/students/toggle-block/:id', checkAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.json({ success: false, message: "User not found!" });

        // अगर ब्लॉक है तो अनब्लॉक करो, और अगर अनब्लॉक है तो ब्लॉक कर दो
        user.isBlocked = !user.isBlocked; 
        await user.save();
        
        const statusMessage = user.isBlocked ? "BLOCKED 🚫" : "UNBLOCKED ✅";
        res.json({ success: true, message: `Student has been ${statusMessage}` });
    } catch (err) { 
        res.status(500).json({ success: false, message: "Server Error" }); 
    }
});
// ==========================================
// VERCEL EXPORT (Server Start) - FIXED 🚀
// ==========================================
if (process.env.NODE_ENV !== 'production') {
    const LOCAL_PORT = process.env.PORT || 8080;
    app.listen(LOCAL_PORT, () => {
        console.log(`💻 Local Server running on port ${LOCAL_PORT}`);
    });
}
module.exports = app;

































