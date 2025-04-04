// Theme toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create theme toggle button if it doesn't exist
    if (!document.querySelector('.theme-toggle')) {
        createThemeToggle();
    }
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    }
});

function createThemeToggle() {
    const themeToggle = document.createElement('div');
    themeToggle.className = 'theme-toggle';
    
    const toggleText = document.createElement('span');
    toggleText.className = 'theme-toggle-text';
    toggleText.textContent = 'Theme';
    
    const toggleIcon = document.createElement('div');
    toggleIcon.className = 'theme-toggle-icon';
    toggleIcon.innerHTML = getCurrentThemeIcon();
    
    themeToggle.appendChild(toggleText);
    themeToggle.appendChild(toggleIcon);
    
    themeToggle.addEventListener('click', toggleTheme);
    document.body.appendChild(themeToggle);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const toggleIcon = document.querySelector('.theme-toggle-icon');
    if (toggleIcon) {
        toggleIcon.innerHTML = theme === 'dark' ? getSunIcon() : getMoonIcon();
    }
}

function getCurrentThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    return currentTheme === 'dark' ? getSunIcon() : getMoonIcon();
}

function getMoonIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;
}

function getSunIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;
} 