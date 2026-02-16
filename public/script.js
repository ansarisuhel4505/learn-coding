document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. HAMBURGER MENU (Burger Menu) LOGIC
    // ==========================================
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // Navbar ko open/close karne ke liye 'active' class toggle
            navLinks.classList.toggle('active');
            
            // Icon animation (Bars se X banana)
            const icon = menuToggle.querySelector('i');
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    }

    // Nav links par click karte hi menu ko auto-close karna (Mobile Fix)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                const icon = menuToggle.querySelector('i');
                icon.classList.replace('fa-times', 'fa-bars');
            }
        });
    });

    // ==========================================
    // 2. TYPEWRITER EFFECT (Auto Typing)
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
                charIndex--; // Akshar mita raha hai
            } else {
                charIndex++; // Akshar likh raha hai
            }

            textElement.textContent = currentWord.substring(0, charIndex);

            // Typing speed control
            let typeSpeed = isDeleting ? 70 : 150;

            if (!isDeleting && charIndex === currentWord.length) {
                isDeleting = true;
                typeSpeed = 2000; // Word pura hone par rukna
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500; // Mitaane ke baad naya word shuru karna
            }

            setTimeout(typeEffect, typeSpeed);
        }

        typeEffect();
    }

    // ==========================================
    // 3. LOGOUT & AUTH LOGIC
    // ==========================================
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            const confirmLogout = confirm("Kya aap sach mein logout karna chahte hain?");
            if (!confirmLogout) {
                e.preventDefault(); 
            }
        });
    }

    // ==========================================
    // 4. SMOOTH SCROLLING (Optional Enhancement)
    // ==========================================
    // Agar aap same page par #ID use kar rahe hain
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if(targetId !== "#") {
                e.preventDefault();
                const targetElement = document.querySelector(targetId);
                if(targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});
