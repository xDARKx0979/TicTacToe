// --- Helper Functions ---

function displayError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
}

// --- Firebase Authentication Logic ---

// Get Firebase Auth instance (initialized in firebase-init.js)
const fbAuth = firebase.auth();

// Signup Function
function handleSignup(event) {
    event.preventDefault();
    clearError('signup-error');

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (!email || !password || !confirmPassword) {
        displayError('signup-error', 'All fields are required.');
        return;
    }
    if (password !== confirmPassword) {
        displayError('signup-error', 'Passwords do not match.');
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        displayError('signup-error', 'Please enter a valid email address.');
        return;
    }
    if (password.length < 6) {
        displayError('signup-error', 'Password must be at least 6 characters long.');
        return;
    }

    fbAuth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed up and signed in
            console.log("User signed up successfully:", userCredential.user);
            window.location.href = 'index.html'; // Redirect to main page
        })
        .catch((error) => {
            console.error("Signup Error:", error);
            // Provide user-friendly error messages
            let message = 'Signup failed. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'Email already registered. Please log in.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password is too weak. Please use a stronger password.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
            }
            displayError('signup-error', message);
        });
}

// Login Function
function handleLogin(event) {
    event.preventDefault();
    clearError('login-error');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        displayError('login-error', 'Email and password are required.');
        return;
    }

    fbAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            console.log("User logged in successfully:", userCredential.user);
            // Redirect to intended page or index.html
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || 'index.html';
            sessionStorage.removeItem('redirectAfterLogin'); 
            window.location.href = redirectUrl;
        })
        .catch((error) => {
            console.error("Login Error:", error);
            let message = 'Invalid email or password.';
            // Firebase provides more specific error codes like auth/user-not-found, auth/wrong-password
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                message = 'Invalid email or password.'; 
            } else if (error.code === 'auth/invalid-email') {
                message = 'Please enter a valid email address.';
            }
            displayError('login-error', message);
        });
}

// Logout Functionality
function handleLogout() {
    fbAuth.signOut().then(() => {
        console.log("User logged out successfully.");
        sessionStorage.removeItem('redirectAfterLogin'); // Clear any pending redirect
        window.location.href = '/login.html'; // Redirect to login page
    }).catch((error) => {
        console.error("Logout Error:", error);
        // Handle logout errors if necessary
    });
}

// Check Authentication State Changes
fbAuth.onAuthStateChanged((user) => {
    const isLoginPage = window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('/') && !window.location.pathname.includes('games');
    const isSignupPage = window.location.pathname.endsWith('signup.html');
    const pathSegments = window.location.pathname.split('/').filter(Boolean); // Remove empty segments
    const currentPage = pathSegments.length > 0 ? pathSegments[pathSegments.length -1] : 'index.html';
    const isProtected = !isLoginPage && !isSignupPage; // Define which pages need auth

    if (user) {
        // User is signed in.
        console.log("Auth state changed: User is logged in", user.email);
        // If user is logged in and tries to access login/signup, redirect to index
        if (isLoginPage || isSignupPage) {
            console.log("User already logged in, redirecting from auth page to index.");
            window.location.href = '/index.html';
        }
        // Add a class to body if you want to style based on login status
        document.body.classList.add('logged-in'); 
    } else {
        // User is signed out.
        console.log("Auth state changed: User is logged out.");
        document.body.classList.remove('logged-in');
        // If user is logged out and tries to access a protected page, redirect to login
        if (isProtected) {
            console.log(`User logged out, redirecting from protected page (${currentPage}) to login.`);
            // Store the page they tried to access *before* redirecting
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            window.location.href = '/login.html';
        }
    }
    // Hide loading indicator or show page content now that auth state is known
    // document.body.classList.remove('auth-loading'); // Example: if you added a loading state
});

// --- Event Listeners (Run after DOM is loaded) ---
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button might not be present on login/signup pages
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}); 