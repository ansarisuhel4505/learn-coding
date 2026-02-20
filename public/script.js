document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 CodeMaster Premium Script Loaded");

    // ==========================================
    // 1. STICKY HEADER (Scroll karne par background change)
    // ==========================================
    const header = document.querySelector('.header');
    
    window.addEventListener('scroll', () => {
        // Jab page thoda bhi niche scroll ho, 'sticky' class lag jayegi
        header.classList.toggle('sticky', window.scrollY > 0);
    });
    // ==========================================
// MOBILE MENU TOGGLE LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    const menuIcon = document.getElementById('menu-icon');
    const navbar = document.querySelector('.navbar');

    if(menuIcon && navbar) {
        menuIcon.addEventListener('click', () => {
            navbar.classList.toggle('active'); // Menu ko slide-in/slide-out karega
            menuIcon.classList.toggle('bx-x'); // Burger icon ko 'X' mein badal dega
        });

        // Agar user menu ke bahar screen par click kare, toh menu band ho jaye
        document.addEventListener('click', (e) => {
            if (!menuIcon.contains(e.target) && !navbar.contains(e.target)) {
                navbar.classList.remove('active');
                menuIcon.classList.remove('bx-x');
            }
        });
    }
});
    // ==========================================
// MOBILE MENU TOGGLE LOGIC (Fix)
// ==========================================
const menuIcon = document.querySelector('#menu-icon');
const navbar = document.querySelector('.navbar');

if (menuIcon && navbar) {
    // Burger icon par click karne ka function
    menuIcon.onclick = () => {
        menuIcon.classList.toggle('bx-x'); // Icon ko 'X' banayega
        navbar.classList.toggle('active'); // Menu ko bahar layega
    };

    // Agar menu ke bahar kahin bhi click ho, toh menu band ho jaye
    document.onclick = (e) => {
        if (!menuIcon.contains(e.target) && !navbar.contains(e.target)) {
            menuIcon.classList.remove('bx-x');
            navbar.classList.remove('active');
        }
    };
}
    

    // ==========================================
    // 3. TYPEWRITER EFFECT (Typed.js)
    // ==========================================
    const typeTarget = document.querySelector('.multiple-text');
    
    if (typeTarget) {
        const typed = new Typed('.multiple-text', {
            strings: ['Full-Stack Developer', 'AI Engineer', 'Software Expert', 'Tech Leader'],
            typeSpeed: 80,
            backSpeed: 50,
            backDelay: 1500,
            loop: true
        });
    }

    // ==========================================
    // 4. SMART AUTH CHECK (Login hai ya nahi?)
    // ==========================================
    checkUserLoginStatus();

    // ==========================================
    // 5. COURSE ACCESS PROTECTION
    // ==========================================
    // Jin buttons/links par click karne se courses khulte hain
    const protectedLinks = document.querySelectorAll(".course-btn, a[href='/courses']");
    
    protectedLinks.forEach(link => {
        link.addEventListener("click", async (e) => {
            e.preventDefault(); // Link ko direct khulne se roko
            
            const isLoggedIn = await isUserLoggedIn();
            
            if (isLoggedIn) {
                // Agar login hai, to courses page par jane do
                window.location.href = "/courses";
            } else {
                // Agar login nahi hai, to alert do aur login par bhejo
                alert("🔒 Please Login first to access Premium Courses!");
                window.location.href = "/login";
            }
        });
    });
});

// ==========================================
// 🛠️ HELPER FUNCTIONS (Backend API Calls)
// ==========================================

// Function 1: Server se user ka naam lao aur Header buttons update karo
async function checkUserLoginStatus() {
    try {
        const authContainer = document.querySelector("#auth-buttons");
        if (!authContainer) return;

        // /user-info route aapke server.js mein bana hua hai
        const response = await fetch('/user-info');
        const data = await response.json();

        if (data.name) {
            // ✅ USER LOGGED IN HAI
            // Login/Signup hata kar -> "Hi Suhel" + Dashboard + Logout lagao
            authContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: var(--text-main); font-weight: 600; font-size: 15px;">Hi, ${data.name.split(' ')[0]}</span>
                    <a href="/dashboard" class="btn-secondary" style="padding: 8px 15px; border-color: var(--primary-color); color: var(--primary-color);">Dashboard</a>
                    <a href="/logout" class="btn-primary" style="padding: 8px 15px; background: #ef4444; border: none;">Logout</a>
                </div>
            `;
        } else {
            // ❌ USER LOGGED IN NAHI HAI
            // Default Login / Sign Up buttons dikhao (CSS design ke hisaab se)
            authContainer.innerHTML = `
                <a href="/login" class="btn-login">Login</a>
                <a href="/signup" class="btn-signup">Sign Up Free</a>
            `;
        }

    } catch (error) {
        console.error("Auth Check Error:", error);
    }
}

// Function 2: Sirf True/False return karega (Course Protection logic ke liye)
async function isUserLoggedIn() {
    try {
        const response = await fetch('/user-info');
        const data = await response.json();
        return !!data.name; // Agar 'name' hai to True, warna False
    } catch (error) {
        return false;
    }
}
// ==========================================
// PAGE TRANSITION LOGIC (2 Second Logo Display)
// ==========================================

// 1. Screen par dikhne wala Overlay HTML se JS ke through banaya
const transitionHTML = `
    <div class="page-transition" id="pageTransition">
        <div class="logo"><i class='bx bx-code-block'></i> Code<span>Master</span></div>
    </div>
`;
document.body.insertAdjacentHTML('beforeend', transitionHTML);
const transitionOverlay = document.getElementById('pageTransition');

// 2. Saare links (<a> tags) ko dhoondho
const allLinks = document.querySelectorAll('a');

allLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        const targetUrl = this.getAttribute('href');

        // Agar link khali hai, ya usi page ka hai (jaise #about), toh mat roko
        if (!targetUrl || targetUrl.startsWith('#') || this.getAttribute('target') === '_blank') {
            return; 
        }

        // Normal link par click hone par turant page load hone se roko
        e.preventDefault(); 

        // Logo wali screen dikhao
        transitionOverlay.classList.add('active');

        // Theek 2 second (2000 milliseconds) baad naya page open karo
        setTimeout(() => {
            window.location.href = targetUrl;
        }, 2000); 
    });
});

// 3. Agar user browser ka "Back" button dabaye, toh loading screen hata do
window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
        transitionOverlay.classList.remove('active');
    }
});
// ==========================================
// DYNAMIC COURSE LOADING (Admin to Frontend)
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Us khali dabbe ko dhoondho jahan courses dikhane hain
    const courseContainer = document.getElementById('dynamic-courses');
    
    // Agar page par wo dabba nahi hai (jaise login page par), toh aage mat bado
    if (!courseContainer) return;

    try {
        // 2. Database se courses mangwao
        const response = await fetch('/api/courses');
        const courses = await response.json();

        // 3. Agar admin ne koi course add nahi kiya hai
        if (courses.length === 0) {
            courseContainer.innerHTML = '<p style="text-align:center; width: 100%; grid-column: 1 / -1; color: var(--text-muted);">No courses available right now. Please check back later!</p>';
            return;
        }

        // 4. Loading text ko hatao
        courseContainer.innerHTML = '';

        // 5. Har course ke liye ek Card banao aur screen par daal do
        courses.forEach(course => {
            // Agar admin ne thumbnail nahi daala, toh ek default photo lag jayegi
            const imageUrl = course.thumbnail ? course.thumbnail : 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=500&q=80';
            
            const courseCard = `
                <div class="course-card" style="background: var(--surface-color); border: 1px solid var(--border-color); border-radius: 15px; overflow: hidden; transition: transform 0.3s ease, box-shadow 0.3s ease; display: flex; flex-direction: column;">
                    
                    <img src="${imageUrl}" alt="${course.title}" style="width: 100%; height: 200px; object-fit: cover;">
                    
                    <div style="padding: 20px; display: flex; flex-direction: column; flex-grow: 1;">
                        <h3 style="margin-bottom: 10px; font-size: 20px; color: var(--text-main);">${course.title}</h3>
                        <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 20px; flex-grow: 1;">${course.description}</p>
                        
                        <a href="${course.videoLink}" target="_blank" style="text-align: center; background: var(--primary-color); color: #fff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; transition: 0.3s;">
                            Start Learning <i class='bx bx-play-circle' style="vertical-align: middle; font-size: 18px;"></i>
                        </a>
                    </div>
                </div>
            `;
            courseContainer.innerHTML += courseCard;
        });
        
    } catch (err) {
        console.error("Failed to load courses:", err);
        courseContainer.innerHTML = '<p style="text-align:center; width: 100%; grid-column: 1 / -1; color: #ef4444;">Failed to load courses. Please refresh the page.</p>';
    }
});
// ==========================================
// LOAD EXAMS ON HOME PAGE & CONNECT EXAM PORTAL
// ==========================================
document.addEventListener("DOMContentLoaded", async () => {
    const publicExamContainer = document.getElementById('public-exams');
    
    // Agar hum home page par hain tabhi ye chalega
    if (publicExamContainer) {
        try {
            const res = await fetch('/api/exams');
            const exams = await res.json();

            if (exams.length === 0) {
                publicExamContainer.innerHTML = '<p style="text-align:center; width: 100%; color: var(--text-muted);">No live exams available right now. Stay tuned!</p>';
                return;
            }

            publicExamContainer.innerHTML = '';
            
            // Har exam ka ek stylish card banayenge
            exams.forEach(exam => {
                publicExamContainer.innerHTML += `
                    <div style="background: var(--bg-color); border: 1px solid var(--border-color); padding: 30px; border-radius: 15px; text-align: center; transition: transform 0.3s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.1);" onmouseover="this.style.transform='translateY(-10px)'; this.style.borderColor='var(--primary-color)';" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border-color)';">
                        
                        <div style="font-size: 50px; color: #ef4444; margin-bottom: 15px;">
                            <i class='bx bx-laptop'></i>
                        </div>
                        <h3 style="color: var(--text-main); margin-bottom: 10px; font-size: 22px;">${exam.title}</h3>
                        <p style="color: var(--text-muted); margin-bottom: 25px; font-size: 15px;">
                            <i class='bx bx-time-five'></i> ${exam.duration} Mins &nbsp; | &nbsp; 
                            <i class='bx bx-target-lock'></i> ${exam.totalMarks} Marks
                        </p>
                        
                        <button onclick="checkLoginAndStartExam('${exam._id}')" style="background: var(--primary-color); color: #fff; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%; font-size: 16px; transition: 0.3s;">
                            Start Mock Test <i class='bx bx-right-arrow-alt'></i>
                        </button>
                    </div>
                `;
            });
        } catch (err) {
            publicExamContainer.innerHTML = '<p style="text-align:center; width: 100%; color: #ef4444;">Failed to load exams. Refresh the page.</p>';
        }
    }
});

// Button click hone par Login Check aur Redirect ka Logic
async function checkLoginAndStartExam(examId) {
    try {
        const res = await fetch('/user-info');
        const data = await res.json();
        
        if (data.loggedIn) {
            // Agar bachha logged in hai, seedha Exam Portal par bhejo!
            window.location.href = `/exam-portal.html?id=${examId}`;
        } else {
            // Agar login nahi hai, toh alert dikhakar login page par bhejo!
            alert("⚠️ Please Login or Sign Up first to take the Live Exam!");
            window.location.href = '/login.html';
        }
    } catch (err) {
        window.location.href = '/login.html';
    }
}








