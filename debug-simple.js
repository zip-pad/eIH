// Simple debugging script to test filter functionality
console.log('🔍 SIMPLE FILTER DEBUG STARTING...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, testing filter...');
    
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    
    console.log('Elements found:', {
        toggle: !!filterToggle,
        dropdown: !!filterDropdown,
        options: filterOptions.length
    });
    
    if (filterToggle) {
        console.log('Toggle element:', filterToggle);
        console.log('Toggle classes:', filterToggle.classList.toString());
    }
    
    if (filterDropdown) {
        console.log('Dropdown element:', filterDropdown);
        console.log('Dropdown classes:', filterDropdown.classList.toString());
        console.log('Dropdown computed style:', {
            position: window.getComputedStyle(filterDropdown).position,
            left: window.getComputedStyle(filterDropdown).left,
            top: window.getComputedStyle(filterDropdown).top,
            transform: window.getComputedStyle(filterDropdown).transform,
            opacity: window.getComputedStyle(filterDropdown).opacity,
            visibility: window.getComputedStyle(filterDropdown).visibility,
            zIndex: window.getComputedStyle(filterDropdown).zIndex
        });
    }
    
    // Test if toggle works
    if (filterToggle && filterDropdown) {
        console.log('Testing toggle click...');
        filterToggle.click();
        
        setTimeout(() => {
            console.log('After toggle click:');
            console.log('  - Dropdown classes:', filterDropdown.classList.toString());
            console.log('  - Dropdown opacity:', window.getComputedStyle(filterDropdown).opacity);
            console.log('  - Dropdown visibility:', window.getComputedStyle(filterDropdown).visibility);
        }, 100);
    }
    
    // Test if options work
    filterOptions.forEach((option, index) => {
        console.log(`Testing option ${index}:`, option.textContent.trim());
        
        // Check if option is clickable
        const rect = option.getBoundingClientRect();
        console.log(`  - Bounding rect:`, rect);
        console.log(`  - Is visible:`, rect.width > 0 && rect.height > 0);
        
        // Test click
        option.click();
        
        setTimeout(() => {
            console.log(`  - After click, classes:`, option.classList.toString());
        }, 50);
    });
    
    console.log('🔍 SIMPLE FILTER DEBUG COMPLETE');
});
