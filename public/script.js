document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. HAMBURGER MENU (Three Lines) LOGIC
    // ==========================================
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // Navbar ko dikhane/chhupane ke liye 'active' class toggle karein
            navLinks.classList.toggle('active');
            
            // Icon badalne ke liye (Optional: Bars se X ban jayega)
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }

    // ==========================================
    // 2. TYPEWRITER EFFECT (Automatic Typing)
    // ==========================================
    const textElement = document.getElementById('typewriter');
    
    if (textElement) {
        const words = [
            "Python AI", 
            "Java Core", 
            "C++ Logic", 
            "JavaScript", 
            "HTML & CSS", 
            "MERN Stack"
        ];
        
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;

        function typeEffect() {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                // Akshar mita raha hai
                charIndex--;
            } else {
                // Akshar likh raha hai
                charIndex++;
            }

            textElement.textContent = currentWord.substring(0, charIndex);

            // Typing speed control
            let typeSpeed = isDeleting ? 50 : 150;

            if (!isDeleting && charIndex === currentWord.length) {
                // Word pura ho gaya, 2 second ruko
                isDeleting = true;
                typeSpeed = 2000;
            } else if (isDeleting && charIndex === 0) {
                // Word mit gaya, agla word lao
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500;
            }

            setTimeout(typeEffect, typeSpeed);
        }

        // Typewriter shuru karein
        typeEffect();
    }

    // ==========================================
    // 3. DASHBOARD & AUTH HELPER (Optional)
    // ==========================================
    // Agar logout button par koi confirm box lagana chahte hain
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            const confirmLogout = confirm("Kya aap sach mein logout karna chahte hain?");
            if (!confirmLogout) {
                e.preventDefault(); // Logout cancel kar dega
            }
        });
    }
});
