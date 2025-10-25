// DEBUG ACTUAL FILTER SYSTEM
// This script will test the real filter system in the main app

console.log('🔍 DEBUGGING ACTUAL FILTER SYSTEM...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DOM loaded, starting filter debugging...');
    
    // Test 1: Check if setupMainNavigation is called
    console.log('🔍 setupMainNavigation function exists:', typeof setupMainNavigation);
    
    // Test 2: Check if elements exist after setup
    setTimeout(() => {
        const filterToggle = document.getElementById('filter-toggle');
        const filterDropdown = document.getElementById('filter-dropdown');
        const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
        
        console.log('🔍 After setup:');
        console.log('  - Filter toggle exists:', !!filterToggle);
        console.log('  - Filter dropdown exists:', !!filterDropdown);
        console.log('  - Filter options count:', filterOptions.length);
        
        if (filterToggle) {
            console.log('  - Filter toggle element:', filterToggle);
            console.log('  - Filter toggle classes:', filterToggle.classList.toString());
        }
        
        if (filterDropdown) {
            console.log('  - Filter dropdown element:', filterDropdown);
            console.log('  - Filter dropdown classes:', filterDropdown.classList.toString());
            console.log('  - Filter dropdown computed style:', window.getComputedStyle(filterDropdown));
        }
        
        // Test 3: Manually test filter toggle
        if (filterToggle && filterDropdown) {
            console.log('🔍 Testing filter toggle manually...');
            
            // Get initial state
            const initialClasses = filterDropdown.classList.toString();
            const initialOpacity = window.getComputedStyle(filterDropdown).opacity;
            
            console.log('  - Initial dropdown classes:', initialClasses);
            console.log('  - Initial dropdown opacity:', initialOpacity);
            
            // Simulate click
            filterToggle.click();
            
            // Check state after click
            setTimeout(() => {
                const afterClasses = filterDropdown.classList.toString();
                const afterOpacity = window.getComputedStyle(filterDropdown).opacity;
                const afterVisibility = window.getComputedStyle(filterDropdown).visibility;
                
                console.log('  - After click dropdown classes:', afterClasses);
                console.log('  - After click dropdown opacity:', afterOpacity);
                console.log('  - After click dropdown visibility:', afterVisibility);
                
                const isOpen = afterClasses.includes('active') && afterOpacity === '1';
                console.log('  - Dropdown opened successfully:', isOpen);
                
                if (!isOpen) {
                    console.log('❌ ISSUE: Dropdown failed to open!');
                    console.log('   Possible causes:');
                    console.log('   - CSS positioning issue');
                    console.log('   - JavaScript event not firing');
                    console.log('   - CSS transition not working');
                }
            }, 100);
        }
        
        // Test 4: Test filter options
        filterOptions.forEach((option, index) => {
            console.log(`🔍 Testing filter option ${index}:`, option.textContent.trim());
            
            const rect = option.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            const hasPointerEvents = window.getComputedStyle(option).pointerEvents !== 'none';
            
            console.log(`  - Option ${index} is visible:`, isVisible);
            console.log(`  - Option ${index} has pointer events:`, hasPointerEvents);
            console.log(`  - Option ${index} bounding rect:`, rect);
            
            if (!isVisible) {
                console.log(`❌ ISSUE: Option ${index} is not visible!`);
            }
            
            if (!hasPointerEvents) {
                console.log(`❌ ISSUE: Option ${index} has pointer-events: none!`);
            }
        });
        
    }, 1000); // Wait 1 second for setup to complete
});

// Test 5: Check for JavaScript errors
window.addEventListener('error', function(e) {
    console.log('❌ JAVASCRIPT ERROR:', e.error);
    console.log('❌ Error message:', e.message);
    console.log('❌ Error filename:', e.filename);
    console.log('❌ Error line:', e.lineno);
});

console.log('🔍 Filter debugging script loaded');
