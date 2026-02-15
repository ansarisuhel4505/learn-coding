// 1. Mobile Menu Toggle
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            // Ye line 'active' class ko lagati aur hatati hai
            navLinks.classList.toggle('active');
        });
    }
});


// 2. TYPEWRITER EFFECT (Ye hai wo automatic likhne wala code)
const textElement = document.getElementById('typewriter');
const words = ["Python AI", "Java Core", "C++ Logic", "MERN Stack", "App Dev"];
let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const currentWord = words[wordIndex];
    
    if (isDeleting) {
        // Mita raha hai (Deleting)
        charIndex--;
        textElement.textContent = currentWord.substring(0, charIndex);
    } else {
        // Likh raha hai (Typing)
        charIndex++;
        textElement.textContent = currentWord.substring(0, charIndex);
    }

    // Speed Control
    let typeSpeed = isDeleting ? 50 : 150; // Mitana tez, likhna aaram se

    if (!isDeleting && charIndex === currentWord.length) {
        // Pura word likh liya, ab thoda ruk kar mitana shuru karo
        isDeleting = true;
        typeSpeed = 2000; // 2 second ruko
    } else if (isDeleting && charIndex === 0) {
        // Pura mita diya, ab agla word shuru karo
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        typeSpeed = 500; // Thoda sa ruk kar start karo
    }

    setTimeout(typeEffect, typeSpeed);
}

// Effect Start karein (Jab page load ho jaye)
document.addEventListener('DOMContentLoaded', typeEffect);

