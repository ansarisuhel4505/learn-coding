document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. HEADER LOGIC (Mobile Menu & Sticky)
    // ==========================================
    
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const header = document.querySelector('header');

    // Mobile Menu Toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Sticky Header Effect on Scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            header.classList.add('shadow-xl'); // Add deeper shadow
            header.style.backgroundColor = 'rgba(31, 41, 55, 0.95)'; // Darker on scroll
        } else {
            header.classList.remove('shadow-xl');
            header.style.backgroundColor = 'rgba(31, 41, 55, 0.85)'; // Back to transparent
        }
    });

    // ==========================================
    // 2. MAIN SECTION LOGIC (Search & Typing Effect)
    // ==========================================

    // Search Bar Functionality
    const searchInput = document.querySelector('input[type="text"]');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = e.target.value.trim();
                if (query) {
                    alert(`Searching for: "${query}"... (Feature coming soon!)`);
                    // Real implementation: window.location.href = `/search?q=${query}`;
                    e.target.value = ''; // Clear input
                }
            }
        });
    }

    // Typing Animation for Hero Section
    // (Note: HTML update required below for this to work)
    const heroText = document.querySelector('h1 span'); // Target the span inside H1
    if (heroText) {
        const words = ["Real Projects", "C++ Logic", "Java Core", "Python AI"];
        let wordIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        
        function typeEffect() {
            const currentWord = words[wordIndex];
            
            if (isDeleting) {
                heroText.textContent = currentWord.substring(0, charIndex - 1);
                charIndex--;
            } else {
                heroText.textContent = currentWord.substring(0, charIndex + 1);
                charIndex++;
            }

            // Speed control
            let typeSpeed = isDeleting ? 100 : 200;

            if (!isDeleting && charIndex === currentWord.length) {
                isDeleting = true;
                typeSpeed = 2000; // Pause at end of word
            } else if (isDeleting && charIndex === 0) {
                isDeleting = false;
                wordIndex = (wordIndex + 1) % words.length;
                typeSpeed = 500; // Pause before new word
            }

            setTimeout(typeEffect, typeSpeed);
        }

        // Start animation
        typeEffect();
    }

    // ==========================================
    // 3. FOOTER LOGIC (Dynamic Year)
    // ==========================================
    
    // Find the copyright text and update year automatically
    const footerText = document.querySelector('footer p');
    if (footerText) {
        const currentYear = new Date().getFullYear();
        // Replace 2026 with current year dynamically if needed
        footerText.innerHTML = footerText.innerHTML.replace('2026', currentYear);
    }
});
