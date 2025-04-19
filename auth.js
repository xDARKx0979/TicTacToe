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

// --- Path and authentication helpers ---
function getCleanPath() {
    let path = window.location.pathname;
    if (path !== '/' && path.endsWith('/')) {
        path = path.slice(0, -1);
    }
    return path;
}

function isAuthPage(path) {
    const loginPath = '/login';
    const signupPath = '/signup';
    const resetPath = '/reset-password';
    return path === loginPath || path === loginPath + '.html' || 
           path === signupPath || path === signupPath + '.html' || 
           path === resetPath || path === resetPath + '.html';
    // Removed '/' so homepage requires authentication
}

// --- Attempt to clear old insecure data ---
try {
    localStorage.removeItem('users');
    console.log('Attempted to remove old user data from localStorage.');
} catch (e) {
    console.warn('Could not remove old data from localStorage:', e);
}

// --- IMMEDIATE AUTH CHECK ON PAGE LOAD ---
// This runs immediately when the script is loaded, before any event handlers
(function immediateAuthCheck() {
    const currentPath = getCleanPath();
    
    // Skip immediate check on auth pages
    if (isAuthPage(currentPath)) {
        console.log('>>> On auth page, skipping immediate auth check');
        return;
    }
    
    // If user has a valid token in this session, don't redirect
    if (sessionStorage.getItem(authTokenKey)) {
        console.log('>>> Active auth token found, allowing immediate access check to proceed');
        return;
    }
    
    console.log('>>> Running immediate auth check for:', currentPath);
    
    // Clear any lingering auth tokens
    sessionStorage.removeItem(authTokenKey);
    
    // Force redirect to login if not on an auth page
    console.log('>>> Forcing redirect to login from:', currentPath);
    sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
    window.location.href = '/login.html';
})();

// --- Firebase Authentication Logic ---

// Get Firebase Auth instance (initialized in firebase-init.js)
const fbAuth = firebase.auth();

// Force SESSION persistence only - no persistent logins
fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .then(() => {
    console.log('Firebase auth persistence strictly set to SESSION');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

// Strict authentication token
const authTokenKey = 'strict_auth_token';

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
            // Signed up 
            console.log("User signed up successfully:", userCredential.user);
            
            // Send verification email
            userCredential.user.sendEmailVerification()
                .then(() => {
                    console.log("Verification email sent.");
                    // Optionally, display a message on the signup form confirmation area
                    // e.g., clearError('signup-error'); 
                    // displayError('signup-success', 'Signup successful! Please check your email to verify your account before logging in.'); 
                    // Maybe automatically redirect to login page after a delay?
                    // Or just let onAuthStateChanged handle showing the message later.
                    // For now, just log it. We'll add UI prompts via onAuthStateChanged.
                })
                .catch((error) => {
                    console.error("Error sending verification email:", error);
                    // Display a generic signup error, but log the specific issue
                     displayError('signup-error', 'Signup successful, but failed to send verification email. Please contact support or try logging in later.');
                });
            
            // Let onAuthStateChanged handle redirects/state based on verification later.
            // No direct redirect here.
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

    // Set the strict auth token BEFORE login to ensure it's available
    // when the auth state changes
    sessionStorage.setItem(authTokenKey, Date.now().toString());
    console.log('Auth token set to:', sessionStorage.getItem(authTokenKey));

    fbAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in - DO NOT REDIRECT YET
            // onAuthStateChanged will handle checking survey and redirecting.
            console.log("User login API call successful, waiting for auth state change:", userCredential.user);
            
            // Double-check token is set
            if (!sessionStorage.getItem(authTokenKey)) {
                sessionStorage.setItem(authTokenKey, Date.now().toString());
                console.log('Auth token re-set after login');
            }
        })
        .catch((error) => {
            // Clear token if login fails
            sessionStorage.removeItem(authTokenKey);
            console.error("Login Error:", error.code, error.message);
            let message = 'Invalid email or password.';
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
    
    // Clear the strict auth token before signing out
    sessionStorage.removeItem(authTokenKey);
    
    fbAuth.signOut().then(() => {
        // onAuthStateChanged will handle the redirect
        console.log("User logged out successfully via button.");
        // Explicitly redirect here as well for immediate feedback
        window.location.href = '/login.html'; 
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// --- Add Resend Verification Email Function ---
function handleResendVerificationEmail() {
    const user = fbAuth.currentUser;
    if (user && !user.emailVerified) {
        user.sendEmailVerification()
            .then(() => {
                console.log("Verification email resent successfully.");
                // Display a confirmation message (reuse auth-message or use a new one)
                displayError('auth-message', 'Verification email sent again. Please check your inbox (and spam folder).'); 
                // Optionally disable the button for a while after clicking
                const resendButton = document.getElementById('resend-verification-button');
                if (resendButton) {
                    resendButton.disabled = true;
                    setTimeout(() => { resendButton.disabled = false; }, 60000); // Re-enable after 60 seconds
                }
            })
            .catch((error) => {
                console.error("Error resending verification email:", error);
                 displayError('auth-message', 'Failed to resend verification email. Please try again later or contact support.');
            });
    } else {
        console.log("Resend function called but user is null or already verified.");
        // Hide the button if it was somehow visible
        const resendButton = document.getElementById('resend-verification-button');
        if (resendButton) resendButton.style.display = 'none';
    }
}

// --- Add Password Reset Function ---
function handlePasswordReset(event) {
    event.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    const errorElement = document.getElementById('reset-error');
    const successElement = document.getElementById('reset-success');
    
    // Clear previous messages
    errorElement.textContent = '';
    errorElement.style.display = 'none';
    successElement.textContent = '';
    successElement.style.display = 'none';

    if (!email) {
        errorElement.textContent = 'Please enter your email address.';
        errorElement.style.display = 'block';
        return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
        errorElement.textContent = 'Please enter a valid email address.';
        errorElement.style.display = 'block';
        return;
    }

    console.log('Attempting password reset for:', email);
    fbAuth.sendPasswordResetEmail(email)
        .then(() => {
            console.log("Password reset email sent successfully.");
            successElement.textContent = 'Password reset email sent. Please check your inbox (and spam folder).';
            successElement.style.display = 'block';
            // Optionally clear the email field
            // document.getElementById('reset-email').value = ''; 
        })
        .catch((error) => {
            console.error("Password Reset Error:", error.code, error.message);
            if (error.code === 'auth/user-not-found') {
                errorElement.textContent = 'Email not linked to an account. Please sign up.';
            } else if (error.code === 'auth/invalid-email') {
                errorElement.textContent = 'Please enter a valid email address.';
            } else {
                errorElement.textContent = 'Failed to send reset email. Please try again later.';
            }
            errorElement.style.display = 'block';
        });
}

// Check Authentication State Changes
console.log('Setting up onAuthStateChanged listener...');
fbAuth.onAuthStateChanged((user) => {
    const currentPath = getCleanPath();
    console.log(`>>> onAuthStateChanged: User: ${user ? user.email : 'null'}. Path: ${currentPath}`);

    // Clear any previous verification messages
    clearError('auth-message'); 
    // Hide resend button initially
    const resendButton = document.getElementById('resend-verification-button');
    if (resendButton) resendButton.style.display = 'none';

    // Check if we're on an auth page that doesn't require login
    const isAuthPagePath = isAuthPage(currentPath);
    const isSurveyPage = currentPath === '/survey' || currentPath === '/survey.html'; 
    
    // Check for strict auth token to enforce session-specific authentication
    const hasAuthToken = !!sessionStorage.getItem(authTokenKey);
    console.log(`>>> Has strict auth token: ${hasAuthToken}`);

    // SPECIAL CASE: If on login page and user is authenticated, ensure auth token is set
    if (user && (currentPath === '/login' || currentPath === '/login.html') && !hasAuthToken) {
        console.log('>>> Setting auth token for logged in user on login page');
        sessionStorage.setItem(authTokenKey, Date.now().toString());
    }

    // Update has auth token after potential update
    const finalHasAuthToken = !!sessionStorage.getItem(authTokenKey);
    
    if (user && finalHasAuthToken) {
        // User is authenticated AND has a valid token for this session
        console.log('>>> Auth state: STRICT_AUTHENTICATED');
        document.body.classList.add('logged-in');

        // --- Check Email Verification FIRST ---
        if (!user.emailVerified) {
            console.log('>>> User email NOT verified.');
            // Display persistent message
            displayError('auth-message', 'Email address not verified. Please click the link in the verification email sent to you. If you just verified, try logging in again.'); 
            // Show the resend button IF on the login page
            if (currentPath === '/login' || currentPath === '/login.html' || currentPath === '/' && resendButton) {
                resendButton.style.display = 'block'; 
            }
            
            // Redirect if necessary - only allow unverified users on specific pages
            if (!isAuthPagePath) {
                 console.log(`>>> Redirecting unverified user from ${currentPath} to /login.html`);
                 window.location.href = '/login.html'; 
            }
            return; 
        }

        // --- Email is VERIFIED - Proceed with survey check ---
        console.log('>>> User email IS verified.');
        // Hide resend button just in case it was visible
        if (resendButton) resendButton.style.display = 'none'; 
        const db = firebase.firestore();
        const userDocRef = db.collection('users').doc(user.uid);

        userDocRef.get().then((doc) => {
            const surveyDone = doc.exists && doc.data().surveyCompleted === true;
            console.log(`>>> Firestore check: surveyDone=${surveyDone}`);

            if (surveyDone) {
                // Survey is completed.
                if (isSurveyPage) {
                    // Redirect away from survey page.
                    console.log(`>>> Survey completed, redirecting verified user from survey page to /index.html`);
                    window.location.href = '/index.html'; 
                } else if (isAuthPagePath) {
                    // Redirect away from login/signup page.
                    const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/index.html';
                    sessionStorage.removeItem('redirectAfterLogin');
                    console.log(`>>> Survey completed, redirecting verified user from ${currentPath} to ${redirectUrl}`);
                    window.location.href = redirectUrl;
                } else {
                    // Survey completed, on a protected page. Do nothing.
                    console.log(`>>> Survey completed, staying on protected page: ${currentPath}`);
                }
            } else {
                // Survey NOT completed (or doc doesn't exist).
                if (!isSurveyPage) {
                    // Redirect TO survey page.
                    console.log(`>>> Survey NOT completed, redirecting verified user from ${currentPath} to /survey.html`);
                    sessionStorage.setItem('redirectAfterSurvey', isAuthPagePath ? (sessionStorage.getItem('redirectAfterLogin') || '/index.html') : currentPath ); 
                    sessionStorage.removeItem('redirectAfterLogin'); 
                    window.location.href = '/survey.html';
                } else {
                     // Already ON survey page. Do nothing.
                    console.log(`>>> Survey NOT completed, staying on survey page.`);
                }
            }
        }).catch((error) => {
            console.error("Error checking survey status:", error);
            // If we fail to check the survey status for a verified user,
            // assume they haven't completed it.
            if (!isSurveyPage) {
                console.warn("Could not check survey status, redirecting verified user to survey page.");
                 sessionStorage.setItem('redirectAfterSurvey', isAuthPagePath ? (sessionStorage.getItem('redirectAfterLogin') || '/index.html') : currentPath ); 
                 sessionStorage.removeItem('redirectAfterLogin'); 
                window.location.href = '/survey.html';
            } else {
                 console.warn("Could not check survey status, staying on survey page.");
            }
        });
    } else {
        // User is NOT properly authenticated
        console.log('>>> Auth state: NOT_AUTHENTICATED');
        document.body.classList.remove('logged-in');
        
        // Don't clear the auth token if on login page - leave it for login function
        if (!isAuthPagePath) {
            sessionStorage.removeItem(authTokenKey);
        }

        // If NOT on an auth page, redirect TO login
        if (!isAuthPagePath && !isSurveyPage) {
            console.log(`>>> Redirecting unauthenticated user from ${currentPath} to /login.html`);
            sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
            window.location.href = '/login.html';
        } else {
            // User is NOT authenticated but on an auth/survey page - do nothing.
            console.log(`>>> Staying on auth/survey page: ${currentPath}`);
        }
        
        // Hide resend button
        if (resendButton) resendButton.style.display = 'none'; 
    }
});

// --- Event Listeners (Run after DOM is loaded) ---
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const resendBtn = document.getElementById('resend-verification-button');
    
    // --- Password Reset Elements ---
    const resetForm = document.getElementById('reset-form');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login-link');
    const loginContainer = loginForm ? loginForm.closest('.auth-container') : null; // Find the main login container
    const resetContainer = document.getElementById('reset-container');
    // -----------------------------

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', handleResendVerificationEmail);
    }

    // --- Password Reset Listeners ---
    if (resetForm) {
        resetForm.addEventListener('submit', handlePasswordReset);
    }

    if (forgotPasswordLink && loginContainer && resetContainer) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginContainer.style.display = 'none';
            resetContainer.style.display = 'block';
        });
    }

    if (backToLoginLink && loginContainer && resetContainer) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            resetContainer.style.display = 'none';
            loginContainer.style.display = 'block';
            // Clear any reset messages when going back
            const resetError = document.getElementById('reset-error');
            const resetSuccess = document.getElementById('reset-success');
            if(resetError) resetError.style.display = 'none';
            if(resetSuccess) resetSuccess.style.display = 'none';
        });
    }
    // -----------------------------
}); 