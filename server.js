const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session'); // Session manage karne ke liye

const app = express();
// Render ka Port ya 3000 use karein
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARE SETUP
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 2. SESSION SETUP (Logout feature ke liye zaruri hai)
app.use(session({
    secret: 'coding-website-secret-key', // Ise badal bhi sakte hain
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Localhost par false, https par true hota hai
}));

// 3. MONGODB CONNECTION
// Render ke Environment Variable se link lega
const DB_URI = process.env.DB_URI || "mongodb+srv://suhel:<PASSWORD>@cluster0.xxxxx.mongodb.net/codingWebsite?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// 4. USER SCHEMA (Database Design)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

// ================= ROUTES (RAASTE) =================

// A. HTML PAGES SERVE KARNA
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// B. SIGNUP LOGIC
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check karein user pehle se hai ya nahi
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('<h1>Email already exists! <a href="/login">Login here</a></h1>');
        }

        // Naya user save karein
        const newUser = new User({ username, email, password });
        await newUser.save();
        res.redirect('/login'); // Save hone ke baad Login page par bhejein
    } catch (error) {
        console.error(error);
        res.send("Error registering user.");
    }
});

// C. LOGIN LOGIC (Session Start)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && user.password === password) {
            // ✅ Session mein user ko save karein
            req.session.user = user;
            res.redirect('/dashboard');
        } else {
            res.send('<h1>Invalid Email or Password! <a href="/login">Try Again</a></h1>');
        }
    } catch (error) {
        res.send("Error logging in.");
    }
});

// D. DASHBOARD ROUTE (Protected - Sirf Login user ke liye)
app.get('/dashboard', (req, res) => {
    if (req.session.user) {
        // Agar user login hai, to Dashboard dikhayein
        res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
    } else {
        // Agar login nahi hai, to Login page par bhejein
        res.redirect('/login');
    }
});

// E. LOGOUT ROUTE (Session Khatam)
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send("Error logging out.");
        }
        res.redirect('/login'); // Logout ke baad Login page par wapas
    });
});

// Server Start
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
