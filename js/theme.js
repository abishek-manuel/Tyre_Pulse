// theme.js - Handles global theme toggling (Light/Dark Mode)
(function () {
    // Determine target theme from local storage or default to light
    const currentTheme = localStorage.getItem('tyrepulse-theme') || 'light';

    // Apply immediately to HTML tag to prevent flash
    document.documentElement.setAttribute('data-bs-theme', currentTheme);

    // Provide global function to toggle theme
    window.toggleTheme = function (e) {
        if (e) e.preventDefault();

        const activeTheme = document.documentElement.getAttribute('data-bs-theme');
        const newTheme = activeTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('tyrepulse-theme', newTheme);

        // Update all toggle icons on the page
        const toggleIcons = document.querySelectorAll('.theme-icon');
        toggleIcons.forEach(icon => {
            icon.className = newTheme === 'light' ? 'bi bi-moon-fill theme-icon' : 'bi bi-sun-fill theme-icon';
        });
    };

    // Update icons on DOM load
    window.addEventListener('DOMContentLoaded', () => {
        const toggleIcons = document.querySelectorAll('.theme-icon');
        toggleIcons.forEach(icon => {
            icon.className = currentTheme === 'light' ? 'bi bi-moon-fill theme-icon' : 'bi bi-sun-fill theme-icon';
        });
    });
})();
