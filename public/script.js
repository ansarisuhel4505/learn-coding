// Jab poora page load ho jaye tab ye chalega
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 CodeMaster Script Loaded");

    // ==========================================
    // 1. GLOBAL VARIABLES & SELECTORS
    // ==========================================
    const header = document.querySelector("header");
    const menuIcon = document.querySelector("#menu-icon");
    const navbar = document.querySelector(".navbar");
    const authContainer = document.querySelector("#auth-buttons"); // Login/Signup buttons wala div

    // ==========================================
    // 2. STICKY HEADER (Scroll karne par design change)
    // ==========================================
    window.addEventListener("scroll", function () {
        // Jab thoda sa bhi scroll ho, 'sticky' class add kar do
        header.classList.toggle("sticky", window.scrollY > 0);

        // Scroll karte waqt mobile menu band kar do
        menuIcon.classList.remove("bx-x");
        navbar.classList.remove("active");
    });

    // ==========================================
    // 3. MOBILE MENU TOGGLE (Hamburger Icon)
    // ==========================================
    if (menuIcon) {
        menuIcon.onclick = () => {
            menuIcon.classList.toggle("bx-x"); // Icon 'X' ban jayega
            navbar.classList.toggle("active"); // Menu khul jayega
        };
    }

    // ==========================================
    // 4. SMART AUTH CHECK (Backend se pucho: Kaun Login hai?)
    // ==========================================
    checkUserLoginStatus();

    // ==========================================
    // 5. PROTECTED LINKS (Courses par click logic)
    // ==========================================
    // Koi bhi button jo courses page par le jata ho, use select karein
    const protectedLinks = document.querySelectorAll(".course-btn, a[href='/courses']");
    
    protectedLinks.forEach(link => {
        link.addEventListener("click", async (e) => {
            // Default link behavior roko
            e.preventDefault(); 
            
            // Check karo user login hai ya nahi
            const isLoggedIn = await isUserLoggedIn();
            
            if (isLoggedIn) {
                // Agar login hai, to jane do
                window.location.href = "/courses";
            } else {
                // Agar login nahi hai, to alert aur redirect
                alert("🔒 Please Login first to access Premium Courses!");
                window.location.href = "/login";
            }
        });
    });
});

// ==========================================
// 🛠️ HELPER FUNCTIONS
// ==========================================

// Function 1: Server se user ka data lao aur buttons update karo
async function checkUserLoginStatus() {
    try {
        const authContainer = document.querySelector("#auth-buttons");
        if (!authContainer) return; // Agar HTML mein ye div nahi mila to ruk jao

        // Backend API call (/user-info humne server.js mein banayi thi)
        const response = await fetch('/user-info');
        const data = await response.json();

        if (data.name) {
            // ✅ USER LOGGED IN HAI
            // Login/Register hata kar -> Dashboard/Logout dikhao
            // data.name.split(' ')[0] ka matlab sirf First Name dikhao
            authContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="color: white; font-weight: 600; font-size: 14px;">Hi, ${data.name.split(' ')[0]}</span>
                    <a href="/dashboard" class="user" style="background: #3b82f6; border: none;">Dashboard</a>
                    <a href="/logout" class="user" style="background: #ef4444; border: none;">Logout</a>
                </div>
            `;
        } else {
            // ❌ USER LOGGED IN NAHI HAI (Default)
            // Wapas Login/Register dikhao
            authContainer.innerHTML = `
                <a href="/login" class="user">Login</a>
                <a href="/signup" class="user" style="background: transparent; border: 1px solid #3b82f6; margin-left: 10px;">Register</a>
            `;
        }

    } catch (error) {
        console.error("Auth Check Error:", error);
    }
}

// Function 2: Sirf True/False return karega (Logic ke liye)
async function isUserLoggedIn() {
    try {
        const response = await fetch('/user-info');
        const data = await response.json();
        return !!data.name; // Agar naam hai to True, nahi to False
    } catch (error) {
        return false;
    }
}
