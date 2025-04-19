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

// --- Attempt to clear old insecure data ---
try {
    localStorage.removeItem('users');
    console.log('Attempted to remove old user data from localStorage.');
} catch (e) {
    console.warn('Could not remove old data from localStorage:', e);
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

    console.log('Attempting signup for:', email);
    fbAuth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed up and signed in 
            // onAuthStateChanged will handle the redirect
            console.log("User signed up successfully, waiting for auth state change:", userCredential.user);
            // No direct redirect here - let onAuthStateChanged handle it
        })
        .catch((error) => {
            console.error("Signup Error:", error.code, error.message);
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

    console.log('Attempting login for:', email);
    fbAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in
            // onAuthStateChanged will handle the redirect
            console.log("User logged in successfully, waiting for auth state change:", userCredential.user);
             // Clear potential redirect item *before* potentially navigating away from login page
            const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/index.html'; 
            sessionStorage.removeItem('redirectAfterLogin');
            // We *can* redirect here, or let onAuthStateChanged handle it.
            // Let's keep the redirect here for now for immediate feedback after login button click.
            window.location.href = redirectUrl; 
        })
        .catch((error) => {
            console.error("Login Error:", error.code, error.message);
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
    console.log('Attempting logout...');
    fbAuth.signOut().then(() => {
        // onAuthStateChanged will handle the redirect
        console.log("User logged out successfully via button.");
        // Explicitly redirect here as well for immediate feedback
        window.location.href = '/login.html'; 
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// Check Authentication State Changes
console.log('Setting up onAuthStateChanged listener...');
fbAuth.onAuthStateChanged((user) => {
    console.log(`>>> onAuthStateChanged: Start. User: ${user ? user.email : 'null'}. Path: ${window.location.pathname}`);
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.endsWith('/login.html') || currentPath === '/';
    const isSignupPage = currentPath.endsWith('/signup.html');

    // Add a small delay to potentially avoid race conditions during redirects
    setTimeout(() => {
        if (user) {
            // User is signed in.
            console.log('>>> onAuthStateChanged: User is IN.');
            document.body.classList.add('logged-in');

            if (isLoginPage || isSignupPage) {
                const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/index.html';
                sessionStorage.removeItem('redirectAfterLogin');
                console.log(`>>> onAuthStateChanged: User IN, redirecting from Auth page (${currentPath}) to ${redirectUrl}`);
                window.location.href = redirectUrl;
            } else {
                 console.log(`>>> onAuthStateChanged: User IN, on protected page (${currentPath}), staying.`);
                 // User is logged in and on a protected page - do nothing.
            }
        } else {
            // User is signed out.
            console.log('>>> onAuthStateChanged: User is OUT.');
            document.body.classList.remove('logged-in');

            if (!isLoginPage && !isSignupPage) {
                 console.log(`>>> onAuthStateChanged: User OUT, redirecting from protected page (${currentPath}) to login.`);
                sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
                window.location.href = '/login.html';
            } else {
                console.log(`>>> onAuthStateChanged: User OUT, on login/signup page (${currentPath}), staying.`);
                // User is logged out and on login/signup page - do nothing.
            }
        }
        console.log('>>> onAuthStateChanged: Finish processing.');
    }, 50); // 50ms delay - adjust if needed, but keep it short

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