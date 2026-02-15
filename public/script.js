// 1. Mobile Menu Toggle (Jo pehle diya tha)
document.getElementById('mobile-menu').addEventListener('click', function() {
    document.querySelector('.nav-links').classList.toggle('active');
});

// 2. TYPEWRITER EFFECT (Automatic Likhne Wala Logic)
const textElement = document.getElementById('typewriter');
const cursorElement = document.querySelector('.cursor');

// Yahan wo sab languages likhein jo aap dikhana chahte hain
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

const typeEffect = () => {
    const currentWord = words[wordIndex];
    const currentChar = currentWord.substring(0, charIndex);
    
    textElement.textContent = currentChar;
    textElement.classList.add("highlight"); // Color maintain rakhne ke liye

    if (!isDeleting && charIndex < currentWord.length) {
        // Likh raha hai...
        charIndex++;
        setTimeout(typeEffect, 100); // Typing speed (fast)
    } else if (isDeleting && charIndex > 0) {
        // Mita raha hai...
        charIndex--;
        setTimeout(typeEffect, 50); // Backspace speed (faster)
    } else {
        // Word pura ho gaya ya mit gaya
        isDeleting = !isDeleting;
        
        if (!isDeleting) {
            // Agla word shuru karein
            wordIndex = !isDeleting ? (wordIndex + 1) % words.length : wordIndex;
        }
        
        // Rukne ka time (Word pura hone par thoda rukega)
        setTimeout(typeEffect, isDeleting ? 100 : 1200);
    }
}

// Start the effect
typeEffect();
