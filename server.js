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
// 2. EMAIL ALERT SYSTEM (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// Email bhejne ka function
async function sendEmail(to, subject, htmlContent) {
    try {
        await transporter.sendMail({
            from: `"CodeMaster Team" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log(`📧 Email sent successfully to: ${to}`);
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
    // Dhyan dein: Agar Render par live hai to Render ka link daalein, warna localhost
    callbackURL: "https://learn-coding-2.onrender.com/auth/google/callback"
    
  },
  async function(accessToken, refreshToken, profile, done) {
      try {
          // Check karein ki user pehle se database mein hai ya nahi
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
              return done(null, user); // User mil gaya, login kara do
          } else {
              // Naya user banayein
              user = await User.create({
                  googleId: profile.id,
                  username: profile.displayName,
                  email: profile.emails[0].value,
                  photo: profile.photos[0].value
              });

              // Welcome Email bhejein
              sendEmail(
                  user.email, 
                  "Welcome to CodeMaster! 🚀", 
                  `<h3>Hi ${user.username},</h3><p>Your Google Login was successful. Start your learning journey today!</p>`
              );

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
    } catch(err) {
        done(err, null);
    }
});

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
        const { username, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if(existingUser) return res.send("User already exists. <a href='/login'>Login here</a>");

        const newUser = await User.create({ username, email, password });
        
        sendEmail(email, "Welcome to CodeMaster!", `Hi ${username}, thanks for registering manually.`);
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.send("Error during signup.");
    }
});

// --- Manual Login ---
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });

        if (user) {
            req.login(user, (err) => {
                if (err) return res.send("Error logging in");
                res.redirect('/dashboard');
            });
        } else {
            res.send("Wrong Email or Password. <a href='/login'>Try Again</a>");
        }
    } catch (err) {
        res.send("Login Error");
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
// 8. START THE SERVER
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 CodeMaster Server running seamlessly on port ${PORT}`);
});
