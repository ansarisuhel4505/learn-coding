require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 10000;

// ==========================================
// 1. MIDDLEWARE & STATIC FILES
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: process.env.SESSION_SECRET || 'codemaster_super_secret_key_2026',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

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
// 6. START SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 CodeMaster Server running seamlessly on port ${PORT}`);
});
