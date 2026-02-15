// 1. Zaruri Modules Import karein
const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// 2. 'public' folder ko static banayein
// Isse CSS, Images aur JS files load ho payengi
app.use(express.static(path.join(__dirname, 'public')));

// ================= ROUTES (RASTE) =================

// A. HOME PAGE
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// B. HEADER ROUTES (Navigation)
app.get('/courses', (req, res) => {
    // Agar courses.html bani hai to wo bhejein, nahi to message
    // res.sendFile(path.join(__dirname, 'public', 'courses.html')); 
    res.send('<h1>All Courses Page</h1><p>Java, C++, Python content coming soon...</p>');
});

app.get('/compiler', (req, res) => {
    res.send('<h1>Online Compiler Logic Loading...</h1>');
});

app.get('/roadmaps', (req, res) => {
    res.send('<h1>Learning Roadmaps</h1><p>Step-by-step guide for developers.</p>');
});

// C. AUTHENTICATION (Login/Signup)
app.get('/login', (req, res) => {
    // res.sendFile(path.join(__dirname, 'public', 'login.html'));
    res.send('<h1>Login Page</h1><form><input type="text" placeholder="Username"><button>Login</button></form>');
});

app.get('/signup', (req, res) => {
    res.send('<h1>Sign Up Page</h1><p>Create your account here.</p>');
});

// D. FOOTER & CONTACT ROUTES
app.get('/privacy', (req, res) => {
    res.send('<h1>Privacy Policy</h1><p>Aapka data surakshit hai.</p>');
});

// WhatsApp Redirect (Smart Feature)
// Jab user footer me WhatsApp par click karega, server use redirect karega
app.get('/chat', (req, res) => {
    res.redirect('https://wa.me/919335067990');
});

// E. SEARCH LOGIC (Backend)
app.get('/search', (req, res) => {
    const query = req.query.q; // URL se search word nikala
    if (query) {
        // Asli website me yahan Database search hota hai
        res.send(`<h1>Search Results for: "${query}"</h1><p>Results found: 0 (Database not connected)</p>`);
    } else {
        res.send('Please enter a search term.');
    }
});

// ================= ERROR HANDLING =================

// Agar koi galat link dale (404 Page)
app.use((req, res) => {
    res.status(404).send('<h1>404 - Page Not Found</h1><p>Galat raaste par aa gaye dost!</p><a href="/">Go Home</a>');
});

// ================= SERVER START =================
app.listen(PORT, () => {
    console.log(`Server chalu ho gaya hai!`);
    console.log(`Website kholne ke liye yahan click karein: http://localhost:${PORT}`);
});