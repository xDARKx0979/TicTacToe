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

// Set persistence to SESSION to prevent automatic login after browser restart
// This makes users login again after closing the browser
fbAuth.setPersistence(firebase.auth.Auth.Persistence.SESSION)
  .then(() => {
    console.log('Firebase auth persistence set to SESSION');
  })
  .catch((error) => {
    console.error('Error setting auth persistence:', error);
  });

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

    fbAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in - DO NOT REDIRECT YET
            // onAuthStateChanged will handle checking survey and redirecting.
            console.log("User login API call successful, waiting for auth state change:", userCredential.user);
        })
        .catch((error) => {
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
    let currentPath = window.location.pathname;
    if (currentPath !== '/' && currentPath.endsWith('/')) {
        currentPath = currentPath.slice(0, -1);
    }
    console.log(`>>> onAuthStateChanged: User: ${user ? user.email : 'null'}. Path: ${currentPath}`);

    // Clear any previous verification messages
    clearError('auth-message'); 
    // Hide resend button initially
    const resendButton = document.getElementById('resend-verification-button');
    if (resendButton) resendButton.style.display = 'none';

    const loginPath = '/login';
    const signupPath = '/signup';
    const surveyPath = '/survey'; 
    // Add a dedicated page path if we create one later: const verifyEmailPath = '/verify-email';
    const isLoginPage = currentPath === loginPath || currentPath === loginPath + '.html' || currentPath === '/';
    const isSignupPage = currentPath === signupPath || currentPath === signupPath + '.html';
    const isSurveyPage = currentPath === surveyPath || currentPath === surveyPath + '.html'; 
    const isAuthPage = isLoginPage || isSignupPage; // Add verifyEmailPath here if created
    // Define pages that an unverified user IS allowed to be on
    const allowedUnverifiedPages = [loginPath, signupPath, '/', /* verifyEmailPath */]; 
    const isAllowedUnverifiedPage = allowedUnverifiedPages.some(p => currentPath === p || currentPath === p + '.html');


    console.log(`>>> Debug state: isLoginPage=${isLoginPage}, isSignupPage=${isSignupPage}, isSurveyPage=${isSurveyPage}, isAuthPage=${isAuthPage}, isAllowedUnverifiedPage=${isAllowedUnverifiedPage}`);

    if (user) {
        // User is signed IN (or just signed up)
        console.log('>>> Auth state: IN');
        document.body.classList.add('logged-in');

        // --- Check Email Verification FIRST ---
        if (!user.emailVerified) {
            console.log('>>> User email NOT verified.');
            // Display persistent message
            displayError('auth-message', 'Email address not verified. Please click the link in the verification email sent to you. If you just verified, try logging in again.'); 
            // Show the resend button IF on the login page
            if (isLoginPage && resendButton) {
                resendButton.style.display = 'block'; // Or 'inline-block' depending on styling
            }
            
            // Redirect if necessary
            if (!isAllowedUnverifiedPage) {
                 console.log(`>>> Redirecting unverified user from ${currentPath} to /login.html`);
                 window.location.href = '/login.html'; 
            } else {
                 console.log(`>>> Staying on allowed page for unverified user: ${currentPath}`);
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
                } else if (isAuthPage) {
                    // Redirect away from login/signup page.
                    const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '/index.html';
                    sessionStorage.removeItem('redirectAfterLogin');
                    console.log(`>>> Survey completed, redirecting verified user from ${currentPath} to ${redirectUrl}`);
                    window.location.href = redirectUrl;
                } else {
                    // Survey completed, on a protected page. Do nothing.
                    console.log(`>>> Survey completed, Staying on protected page: ${currentPath}`);
                }
            } else {
                // Survey NOT completed (or doc doesn't exist).
                if (!isSurveyPage) {
                    // Redirect TO survey page.
                    console.log(`>>> Survey NOT completed, redirecting verified user from ${currentPath} to /survey.html`);
                    sessionStorage.setItem('redirectAfterSurvey', isAuthPage ? (sessionStorage.getItem('redirectAfterLogin') || '/index.html') : currentPath ); 
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
                 sessionStorage.setItem('redirectAfterSurvey', isAuthPage ? (sessionStorage.getItem('redirectAfterLogin') || '/index.html') : currentPath ); 
                 sessionStorage.removeItem('redirectAfterLogin'); 
                window.location.href = '/survey.html';
            } else {
                 console.warn("Could not check survey status, staying on survey page.");
            }
        });

    } else {
        // User is signed OUT
        console.log('>>> Auth state: OUT');
        document.body.classList.remove('logged-in');

        // If NOT on an auth page (or survey page - although they shouldn't reach it logged out), redirect TO login
         if (!isAuthPage && !isSurveyPage) { // Keep survey check here just in case
            console.log(`>>> Redirecting OUT user from protected page ${currentPath} to /login.html`);
            sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
            window.location.href = '/login.html';
        } else {
             // User is OUT and on an auth/survey page - do nothing.
            console.log(`>>> Staying on auth/survey page: ${currentPath}`);
        }
        // Hide resend button if logged out
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