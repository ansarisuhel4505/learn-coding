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
async function sendWelcomeEmail(toEmail, userName) {
    const mailOptions = {
        from: `"CodeMaster Team" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Welcome to CodeMaster! 🚀 Start Your Coding Journey",
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 15px; background-color: #f8fafc;">
                
                <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                    <h1 style="color: #3b82f6; margin: 0; font-size: 32px;">Code<span style="color: #0f172a;">Master</span></h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border-radius: 12px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
                    <h2 style="color: #0f172a; margin-top: 0;">Welcome to the community, ${userName.split(' ')[0]}! 👋</h2>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        We are thrilled to have you on board. CodeMaster is your ultimate platform to master Full-Stack Development, Artificial Intelligence, and Mobile Apps.
                    </p>
                    <p style="color: #475569; font-size: 16px; line-height: 1.6;">
                        Get ready to build real-world projects, learn industry-standard tools, and elevate your coding skills to the next level. Let's build something amazing together!
                    </p>
                    
                    <div style="text-align: center; margin-top: 35px; margin-bottom: 15px;">
                        <a href="https://learn-coding-2.onrender.com/dashboard" style="background-color: #3b82f6; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Go to Your Dashboard</a>
                    </div>
                </div>
                
                <div style="text-align: center; padding-top: 25px; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    <p style="margin: 5px 0;">&copy; 2026 CodeMaster by Suhel Ansari. All rights reserved.</p>
                    <p style="margin: 5px 0;">If you didn't create an account, please safely ignore this email.</p>
                </div>
                
            </div>
        `
    };

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







