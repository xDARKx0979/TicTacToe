// --- Helper Functions ---

function getUsers() {
    // Get users from localStorage, or return empty array if none exist
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    // Save users array to localStorage
    localStorage.setItem('users', JSON.stringify(users));
}

function setCurrentUser(email) {
    // Set logged-in user email in sessionStorage
    sessionStorage.setItem('currentUser', email);
}

function getCurrentUser() {
    // Get logged-in user email from sessionStorage
    return sessionStorage.getItem('currentUser');
}

function logoutUser() {
    // Remove logged-in user email from sessionStorage
    sessionStorage.removeItem('currentUser');
}

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

// --- Authentication Logic ---

// Signup Function
function handleSignup(event) {
    event.preventDefault(); // Prevent form submission
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

    // Basic email validation (can be improved)
    if (!/\S+@\S+\.\S+/.test(email)) {
        displayError('signup-error', 'Please enter a valid email address.');
        return;
    }

    const users = getUsers();

    // Check if email already exists
    if (users.some(user => user.email === email)) {
        displayError('signup-error', 'Email already registered. Please log in.');
        return;
    }

    // Add new user (WARNING: Storing plain text password - NOT SECURE)
    users.push({ email: email, password: password });
    saveUsers(users);

    // Automatically log in the user after successful signup
    setCurrentUser(email);
    window.location.href = 'index.html'; // Redirect to main page
}

// Login Function
function handleLogin(event) {
    event.preventDefault(); // Prevent form submission
    clearError('login-error');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        displayError('login-error', 'Email and password are required.');
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.email === email);

    // WARNING: Comparing plain text password - NOT SECURE
    if (user && user.password === password) {
        setCurrentUser(email);
        // Redirect to the page the user was trying to access, or default to index.html
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || 'index.html';
        sessionStorage.removeItem('redirectAfterLogin'); // Clean up
        window.location.href = redirectUrl;
    } else {
        displayError('login-error', 'Invalid email or password.');
    }
}

// Check Authentication on Page Load Function
function checkAuth() {
    const currentUser = getCurrentUser();
    // Include all game pages in protectedPages if necessary
    const protectedPages = [
        'index.html', 'papas-restaurant.html', '2048.html', 'tetris.html',
        'tictactoe.html', 'run.html', 'krunker.html', 'shellshock.html',
        // Add individual Papa's games if they should also be protected directly
        'games/papas-bakeria.html', 'games/papas-tacomia.html', 'games/papas-sushiria.html', 
        'games/papas-wingeria.html', 'games/papas-pancakeria.html', 'games/papas-donuteria.html',
        'games/papas-pizzeria.html', 'games/papas-hotdoggeria.html', 'games/papas-scooperia.html',
        'games/papa-louie-2.html', 'games/papas-burgeria.html', 'games/papas-cheeseria.html',
        'games/papas-pastaria.html', 'games/papas-freezeria.html'
        // Add other game pages like pacman, slope etc. if needed
    ]; 
    const pathSegments = window.location.pathname.split('/');
    // Handle paths like /games/papas-bakeria.html
    const currentPage = pathSegments.length > 2 && pathSegments[pathSegments.length - 2] === 'games' 
                        ? `games/${pathSegments.pop()}` 
                        : pathSegments.pop() || 'index.html'; // Default to index.html if path is just "/"

    // Exclude login/signup pages from the check
    if (currentPage === 'login.html' || currentPage === 'signup.html') {
        return;
    }

    // Check if current page is protected and user is not logged in
    if (protectedPages.includes(currentPage) && !currentUser) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
        // Use absolute path for redirection to handle cases inside /games/ folder
        window.location.href = '/login.html'; 
    }
}

// Run the authentication check immediately when the script loads
checkAuth();

// Logout Functionality
function handleLogout() {
    logoutUser();
    window.location.href = '/login.html'; // Redirect to login page after logout
}

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

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
}); 