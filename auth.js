// DIRECT SECURITY CHECK - This runs IMMEDIATELY!
// This needs to be the very first code in the file
(() => {
  // Skip this check only on explicitly allowed pages
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath === '/login.html' || currentPath === '/login';
  const isSignupPage = currentPath === '/signup.html' || currentPath === '/signup';
  const isResetPage = currentPath === '/reset-password.html' || currentPath === '/reset-password';
  
  // If not on an allowed page, enforce strict authentication
  if (!isLoginPage && !isSignupPage && !isResetPage) {
    console.log('⚠️ SECURITY: Protected page access attempt: ' + currentPath);
    
    // Check for Firebase auth in local storage - this is where Firebase actually stores its state
    let hasAuth = false;
    
    // Check for Firebase auth in localStorage keys that start with "firebase:authUser:"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('firebase:authUser:')) {
        hasAuth = true;
        break;
      }
    }
    
    // Also check sessionStorage as a backup
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('firebase:authUser:')) {
        hasAuth = true;
        break;
      }
    }
    
    if (!hasAuth) {
      console.log('⚠️ SECURITY: No auth detected, forcing redirect');
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
      window.location.replace('/login.html');
      // Stop all further script execution
      throw new Error('Unauthorized access blocked');
    }
  }
})();

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
    // Normalize .html extensions
    if (path.endsWith('.html')) {
         path = path.slice(0, -5);
    }
    if (path === '') path = '/index'; // Treat root as index
    return path;
}

const LOGIN_PATH = '/login';
const SIGNUP_PATH = '/signup';
const RESET_PATH = '/reset-password';
const VERIFY_EMAIL_PATH = '/verify-email';
const SURVEY_PATH = '/survey';
const INDEX_PATH = '/index';

// Pages that DO NOT require the user to be authenticated
const PUBLIC_PAGES = [LOGIN_PATH, SIGNUP_PATH, RESET_PATH, VERIFY_EMAIL_PATH];

// Pages that DO NOT require the user's email to be verified
const ALLOWED_UNVERIFIED_PAGES = [LOGIN_PATH, SIGNUP_PATH, RESET_PATH, VERIFY_EMAIL_PATH];

function isPublicPage(path) {
    return PUBLIC_PAGES.includes(path);
}

function isAllowedUnverifiedPage(path) {
     return ALLOWED_UNVERIFIED_PAGES.includes(path);
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
    
    // Skip this check only on explicitly public pages
    if (isPublicPage(currentPath)) {
        console.log('Public page, skipping immediate auth check');
        return;
    }

    console.log('⚠️ SECURITY: Protected page access attempt: ' + currentPath);

    // Check for Firebase auth in local/session storage
    let hasAuth = false;
    const storageKeys = [localStorage, sessionStorage];
    for (const storage of storageKeys) {
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
            if (key && key.startsWith('firebase:authUser:')) {
                hasAuth = true;
                break;
            }
        }
        if (hasAuth) break;
    }

    if (!hasAuth) {
        console.log('⚠️ SECURITY: No auth detected, forcing redirect');
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        window.location.replace(LOGIN_PATH + '.html');
        // Stop all further script execution
        throw new Error('Unauthorized access blocked');
    }
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
            const user = userCredential.user;
            console.log("User signed up successfully:", user);
            
            // Send verification email
            user.sendEmailVerification()
                .then(() => {
                    console.log("Verification email sent.");
                    // Store email for display on verification page
                    sessionStorage.setItem('emailForVerification', email);
                    // Redirect to the email verification page
                    window.location.href = '/verify-email.html'; 
                })
                .catch((error) => {
                    console.error("Error sending verification email:", error);
                    // Display a generic signup error, but log the specific issue
                     displayError('signup-error', 'Signup successful, but failed to send verification email. Please try logging in later or contact support.');
                });
            
            // No direct redirect here anymore, redirect happens after email is sent.
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
    console.log('Auth token set before login attempt:', sessionStorage.getItem(authTokenKey));

    fbAuth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in - RELOAD user profile to get latest emailVerified status
            console.log("User signed in via API, reloading profile...");
            return userCredential.user.reload().then(() => {
                console.log("User profile reloaded. emailVerified:", userCredential.user.emailVerified);
                // Now let onAuthStateChanged handle the state change with the updated profile.
                 console.log("User login API call successful, refreshed state, waiting for auth state change handler...");
                 // Double-check token is set (should be, but good practice)
                 if (!sessionStorage.getItem(authTokenKey)) {
                     sessionStorage.setItem(authTokenKey, Date.now().toString());
                     console.log('Auth token re-set after login just in case');
                 }
            });
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
    console.log('🔐 LOGOUT: Attempting logout...');
    
    try {
        // Clear ALL storage that could contain auth data
        console.log('🔐 LOGOUT: Clearing sessionStorage');
        sessionStorage.clear();
        
        console.log('🔐 LOGOUT: Clearing localStorage Firebase items');
        // Clear Firebase items from localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('firebase')) {
                console.log('🔐 LOGOUT: Removing localStorage item:', key);
                localStorage.removeItem(key);
                // Adjust index since we're removing items
                i--;
            }
        }
        
        // Most reliable method: Use Firebase signOut
        console.log('🔐 LOGOUT: Calling Firebase signOut');
        firebase.auth().signOut().then(() => {
            console.log('🔐 LOGOUT: Firebase signOut successful');
            console.log('🔐 LOGOUT: Redirecting to login page');
            
            // Force redirect to login page
            window.location.href = '/login.html';
            
            // Extra measure if redirect doesn't work immediately
            setTimeout(() => {
                console.log('🔐 LOGOUT: Redirect timeout triggered');
                window.location.replace('/login.html');
            }, 1000);
        }).catch(error => {
            console.error('🔐 LOGOUT ERROR:', error);
            
            // Try force logout anyway
            window.location.href = '/login.html';
        });
    } catch (error) {
        console.error('🔐 LOGOUT ERROR:', error);
        
        // Last resort
        alert('Logout error. Please close browser and re-open.');
        window.location.href = '/login.html';
    }
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

    clearError('auth-message');
    const resendButton = document.getElementById('resend-verification-button');
    if (resendButton) resendButton.style.display = 'none';

    const hasAuthToken = !!sessionStorage.getItem(authTokenKey); // Keep strict token check
    console.log(`>>> Has strict auth token: ${hasAuthToken}`);

    if (user && hasAuthToken) {
        // User is authenticated AND has a valid token for this session
        console.log('>>> Auth state: STRICT_AUTHENTICATED');
        document.body.classList.add('logged-in');

        // --- Check Email Verification FIRST ---
        if (!user.emailVerified) {
            console.log('>>> User email NOT verified.');
            displayError('auth-message', 'Email address not verified. Please click the link in the verification email sent to you. If you just verified, try logging in again.');

            // Show resend button ONLY on verify-email page
            if (currentPath === VERIFY_EMAIL_PATH && resendButton) {
                resendButton.style.display = 'inline-block';
            } else if (currentPath === LOGIN_PATH && resendButton) {
                 // Also show on login page if they somehow land there unverified
                 resendButton.style.display = 'inline-block';
            }

            // If user is not verified, they should ONLY be on allowed pages
            if (!isAllowedUnverifiedPage(currentPath)) {
                 console.log(`>>> Redirecting unverified user from ${currentPath} to ${VERIFY_EMAIL_PATH}`);
                 // Store the email again just in case it was lost
                 if (user.email) sessionStorage.setItem('emailForVerification', user.email);
                 window.location.href = VERIFY_EMAIL_PATH + '.html'; // Ensure .html extension
            } else {
                 console.log(`>>> Staying on allowed page for unverified user: ${currentPath}`);
            }
            return; // Stop further processing for unverified user
        }

        // --- Email is VERIFIED - Proceed ---
        console.log('>>> User email IS verified.');
        if (resendButton) resendButton.style.display = 'none';

        // If verified user is on verify-email page, redirect them away
        if (currentPath === VERIFY_EMAIL_PATH) {
            console.log(`>>> Verified user on verify page, redirecting to index`);
             window.location.href = INDEX_PATH + '.html'; // Ensure .html extension
             return;
        }
        
        // If verified user is on any public page (login, signup, reset), redirect to index
        if (isPublicPage(currentPath)) {
             console.log(`>>> Verified user on public page ${currentPath}, redirecting to index`);
             const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || (INDEX_PATH + '.html');
             sessionStorage.removeItem('redirectAfterLogin');
             window.location.href = redirectUrl;
             return;
        }

        // Verified user on a protected page (not verify-email or other public pages)
        // No further action needed, allow access.
        console.log(`>>> Verified user staying on protected page: ${currentPath}`);

    } else {
        // User is NOT properly authenticated (no user OR no token)
        console.log('>>> Auth state: NOT_AUTHENTICATED');
        document.body.classList.remove('logged-in');

        // Clear the auth token unless on login page
        if (currentPath !== LOGIN_PATH) {
            sessionStorage.removeItem(authTokenKey);
        }

        // If NOT on a public page, redirect TO login
        if (!isPublicPage(currentPath)) { 
            console.log(`>>> Redirecting unauthenticated user from ${currentPath} to ${LOGIN_PATH}`);
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search); // Use original path here
            window.location.href = LOGIN_PATH + '.html';
        } else {
            console.log(`>>> Staying on public page: ${currentPath}`);
        }

        if (resendButton) resendButton.style.display = 'none';
    }
});

// --- Event Listeners (Run after DOM is loaded) ---
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    const logoutButton = document.getElementById('logout-button');
    const resendBtn = document.getElementById('resend-verification-button');
    
    console.log("DOM loaded, setting up event listeners");
    console.log("Logout button found:", !!logoutButton);
    
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

    // FIX: Add direct logout handler for all elements with logout class OR id
    document.querySelectorAll('.logout-button, #logout-button, [data-action="logout"]').forEach(button => {
        console.log("Adding click listener to logout button:", button);
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Logout button clicked!");
            handleLogout();
        });
    });
    
    // Also attach the original way as backup
    if (logoutButton) {
        console.log("Adding click listener to main logout button");
        logoutButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Main logout button clicked!");
            handleLogout();
        });
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

// Global logout function that can be called from HTML onclick
function logoutUser() {
    console.log('Global logout function called');
    handleLogout();
} 