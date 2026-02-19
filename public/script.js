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
    // 2. MOBILE HAMBURGER MENU
    // ==========================================
    const menuIcon = document.querySelector('#menu-icon');
    const navbar = document.querySelector('.navbar');

    if (menuIcon) {
        menuIcon.onclick = () => {
            menuIcon.classList.toggle('bx-x'); // Icon ko 'X' banao
            navbar.classList.toggle('active'); // Menu open/close karo
        };
    }

    // Jab user scroll kare to mobile menu apne aap band ho jaye
    window.onscroll = () => {
        if (menuIcon) {
            menuIcon.classList.remove('bx-x');
            navbar.classList.remove('active');
        }
    };

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
