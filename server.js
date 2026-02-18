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

// User Schema (Database Design)
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null }, // Manual login ke liye
    googleId: { type: String, default: null }, // Google login ke liye
    photo: String,
    mobile: { type: String, default: null }    // Mobile number popup ke liye
});

const User = mongoose.model('User', userSchema);

// ==========================================
// 2. EMAIL CONFIGURATION (Nodemailer)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Render Env Variable
        pass: process.env.EMAIL_PASS  // Render Env Variable
    }
});

async function sendEmail(to, subject, htmlContent) {
    try {
        await transporter.sendMail({
            from: `"CodeMaster Team" <${process.env.EMAIL_USER}>`,
            to: to,
            subject: subject,
            html: htmlContent
        });
        console.log(`📧 Email sent to: ${to}`);
    } catch (err) {
        console.error("Email Failed:", err);
    }
}

// ==========================================
// 3. MIDDLEWARE & SESSION
// ==========================================
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// ==========================================
// 4. PASSPORT GOOGLE STRATEGY
// ==========================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://learn-coding-2.onrender.com/auth/google/callback" // Localhost ke liye ise http://localhost:3000/... karein
  },
  async function(accessToken, refreshToken, profile, done) {
      try {
          // Check agar user pehle se hai
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
              return done(null, user);
          } else {
              // Naya User Banayein
              user = await User.create({
                  googleId: profile.id,
                  username: profile.displayName,
                  email: profile.emails[0].value,
                  photo: profile.photos[0].value
              });

              // Welcome Email
              sendEmail(user.email, "Welcome to CodeMaster! 🚀", `<h3>Hello ${user.username},</h3><p>Google Login successful! Complete your profile now.</p>`);
              
              // Admin Alert
              sendEmail(process.env.EMAIL_USER, "🔔 New Google Signup", `<p>User: ${user.username} (${user.email})</p>`);

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
// 5. ROUTES (Pages & Logic)
// ==========================================

// --- Pages ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/courses', (req, res) => res.sendFile(path.join(__dirname, 'public', 'courses.html')));

// --- Google Auth Routes ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

// --- Manual Signup (With MongoDB) ---
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if(existingUser) return res.send("User already exists. <a href='/login'>Login</a>");

        // Save new user
        const newUser = await User.create({ username, email, password });
        
        sendEmail(email, "Welcome!", "Thanks for signing up manually.");
        sendEmail(process.env.EMAIL_USER, "New Manual Signup", `User: ${email}`);

        res.redirect('/login');
    } catch (err) {
        res.send("Error during signup.");
    }
});

// --- Manual Login (With MongoDB) ---
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password }); // Note: Real apps mein password hash karna chahiye

        if (user) {
            // Manual login ko Passport session mein set karein
            req.login(user, (err) => {
                if (err) return res.send("Error logging in");
                sendEmail(process.env.EMAIL_USER, "User Login Alert", `${user.username} just logged in.`);
                res.redirect('/dashboard');
            });
        } else {
            res.send("Wrong Email or Password. <a href='/login'>Try Again</a>");
        }
    } catch (err) {
        res.send("Login Error");
    }
});

// --- Dashboard & Mobile Popup Logic ---
app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        res.redirect('/login');
    }
});

// API: Check Mobile Number
app.get('/user-info', (req, res) => {
    if(req.isAuthenticated()) {
        res.json({ 
            name: req.user.username, 
            hasMobile: req.user.mobile ? true : false 
        });
    } else {
        res.status(401).json({ error: "Not logged in" });
    }
});

// API: Save Mobile Number
app.post('/update-mobile', async (req, res) => {
    if(req.isAuthenticated()) {
        await User.findByIdAndUpdate(req.user._id, { mobile: req.body.mobile });
        console.log(`📱 Mobile saved for ${req.user.username}`);
        res.json({ success: true });
    }
});

// --- Logout ---
app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// ==========================================
// 6. SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`Server running at port ${PORT}`);
});
