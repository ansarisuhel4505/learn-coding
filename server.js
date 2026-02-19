require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. MONGODB DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Error:", err));

// User Database Structure (Schema)
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null }, // Manual login ke liye
    googleId: { type: String, default: null }, // Google login ke liye
    photo: String,
    mobile: { type: String, default: null }    // Profile complete karne ke liye
});

const User = mongoose.model('User', userSchema);
// ==========================================
// 2. PROFESSIONAL EMAIL SYSTEM (Nodemailer)
// ==========================================

// 1. Transporter Setup (Gmail connection with Timeout Fix)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // 465 port ke liye true hona zaroori hai
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    },
    // Timeout error rokne ke liye extra settings
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000
});

// 2. Khoobsurat HTML Welcome Email Template ka Function
// Khoobsurat Login Alert Email Template
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
        console.log(`📧 Login Alert Email sent to: ${toEmail}`);
    } catch (err) {
        console.error("❌ Login Alert Email Failed:", err);
    }
}


    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Professional Welcome Email sent successfully to: ${toEmail}`);
    } catch (err) {
        console.error("❌ Email Sending Failed:", err);
    }
}


// ==========================================
// 3. MIDDLEWARE & SESSION SETUP
// ==========================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Public folder ko static banana taaki HTML, CSS, JS load ho sakein
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'codemaster_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 4. GOOGLE LOGIN CONFIGURATION (Passport.js)
// ==========================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // Dhyan dein: Yahan apna asli Render wala link hi rakhein (.com tak)
    callbackURL: "https://codemaster-app.onrender.com/auth/google/callback" 
  },
  async function(accessToken, refreshToken, profile, done) {
      try {
          // Check karein ki user pehle se database mein hai ya nahi
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
              // Agar purana user hai, toh bas chup-chaap login kara do (No Email)
              return done(null, user); 
          } else {
              // Agar NAYA user hai, toh uska data save karo
              user = await User.create({
                  googleId: profile.id,
                  username: profile.displayName,
                  email: profile.emails[0].value,
                  photo: profile.photos[0].value
              });

              // 🔥 YAHAN NAYA PROFESSIONAL WELCOME EMAIL BHEJA JA RAHA HAI 🔥
              sendWelcomeEmail(user.email, user.username);

              return done(null, user);
          }
      } catch (err) {
          return done(err, null);
      }
  }
));


// ==========================================
// 5. ROUTES (Website Pages)
// ==========================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login');
    }
});
// Note: /courses aur baaki pages ka HTML aap public folder mein banayenge
app.get('/courses', (req, res) => res.sendFile(path.join(__dirname, 'public', 'courses.html'))); 

// ==========================================
// 6. AUTHENTICATION ROUTES (Login/Signup Logic)
// ==========================================

// --- Manual Signup ---
app.post('/signup', async (req, res) => {
    try {
        // req.body mein mobile add kiya
        const { username, email, password, mobile } = req.body; 
        
        const existingUser = await User.findOne({ email });
        if(existingUser) {
            return res.send("User already exists. <a href='/login'>Login here</a>");
        }

        // Database mein mobile save karein
        const newUser = await User.create({ username, email, password, mobile });
        
        sendWelcomeEmail(email, username);
        res.redirect('/login');
    } catch (err) {
        console.error("Signup Error:", err);
        res.send("Error during signup.");
    }
});


// --- Student Login Portal ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // User dhoondho
        const user = await User.findOne({ email });
        
        // Agar user nahi mila ya password galat hai
        if (!user || user.password !== password) {
            return res.send("Invalid Email or Password. <a href='/login'>Try Again</a>");
        }

        // Agar login SUCCESS hai, toh Login Alert Email bhej do!
        sendLoginAlertEmail(user.email, user.username);
        
        // User ko dashboard par bhej do
        res.redirect('/dashboard.html');
    } catch (err) {
        console.error("Login Error:", err);
        res.send("An error occurred during login.");
    }
});



// --- Google Auth ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// --- Logout ---
app.get('/logout', (req, res) => {
    req.logout((err) => {
        res.redirect('/');
    });
});

// ==========================================
// 7. API ROUTES (Frontend ko Data dene ke liye)
// ==========================================

// Script.js ko batane ke liye ki user login hai ya nahi
app.get('/user-info', (req, res) => {
    if(req.isAuthenticated()) {
        res.json({ 
            name: req.user.username, 
            hasMobile: req.user.mobile ? true : false 
        });
    } else {
        res.json({ error: "Not logged in" }); // UI crash na ho isliye 401 ki jagah normal json bhej rahe hain
    }
});

// Dashboard popup se Mobile Number save karne ke liye
app.post('/update-mobile', async (req, res) => {
    if(req.isAuthenticated()) {
        await User.findByIdAndUpdate(req.user._id, { mobile: req.body.mobile });
        console.log(`📱 Mobile saved for ${req.user.username}`);
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: "Unauthorized" });
    }
});
// ==========================================
// ADMIN ROUTE: Saare users dekhne ke liye
// ==========================================
app.get('/admin/users', async (req, res) => {
    try {
        // Database se saare users nikal lo
        const allUsers = await User.find({});
        
        // Unhe browser par dikha do
        res.json({
            total_students: allUsers.length,
            students: allUsers
        });
    } catch (err) {
        res.send("Error fetching users");
    }
});


// ==========================================
// 8. START THE SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 CodeMaster Server running seamlessly on port ${PORT}`);
});








