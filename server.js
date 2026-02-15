const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// 1. Middleware (Form data padhne ke liye)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 2. MONGODB CONNECTION
// Note: 'test' ki jagah apna Database naam likhein
// Asli project mein ye URL environment variable (.env) mein hona chahiye
const DB_URI = "mongodb+srv://suhel:password@cluster0.mongodb.net/codingWebsite?retryWrites=true&w=majority";

mongoose.connect(DB_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully!"))
    .catch((err) => console.log("❌ MongoDB Connection Error:", err));

// 3. USER SCHEMA (Data Structure)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

// Model banayein (Collection ka naam 'User' hoga)
const User = mongoose.model('User', userSchema);

// ================= ROUTES =================

// A. HTML PAGES SERVE KARNA
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));

// B. SIGNUP LOGIC (Data Save Karna)
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check karein user pehle se hai ya nahi
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.send('<h1>Email already registered! <a href="/login">Login here</a></h1>');
        }

        // Naya user banayein
        const newUser = new User({ username, email, password });
        await newUser.save();
        
        console.log("New User Registered:", username);
        res.redirect('/login'); // Save hone ke baad Login page par bhejein
    } catch (error) {
        console.error(error);
        res.send("Error registering user.");
    }
});

// C. LOGIN LOGIC (Data Check Karna)
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Database mein user dhundhein
        const user = await User.findOne({ email });
        
        if (user && user.password === password) {
            // Login Success
            res.send(`<h1>Welcome back, ${user.username}!</h1><a href="/">Go to Dashboard</a>`);
        } else {
            // Login Fail
            res.send('<h1>Invalid Email or Password</h1><a href="/login">Try Again</a>');
        }
    } catch (error) {
        res.send("Error logging in.");
    }
});

// D. OTHER ROUTES
app.get('/courses', (req, res) => res.send('<h1>Courses Page</h1>'));
app.get('/compiler', (req, res) => res.send('<h1>Compiler Loading...</h1>'));

// Server Start
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
