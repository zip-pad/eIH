// COMPREHENSIVE FILTER DEBUGGING SCRIPT
// This script will test all potential issues with the filter dropdown

console.log('🔍 STARTING COMPREHENSIVE FILTER DEBUGGING...');

// Test 1: Check if elements exist
function testElementExistence() {
    console.log('\n=== TEST 1: ELEMENT EXISTENCE ===');
    
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    
    console.log('Filter toggle exists:', !!filterToggle);
    console.log('Filter dropdown exists:', !!filterDropdown);
    console.log('Filter options count:', filterOptions.length);
    
    if (filterToggle) {
        console.log('Filter toggle element:', filterToggle);
        console.log('Filter toggle classes:', filterToggle.classList.toString());
        console.log('Filter toggle computed style:', window.getComputedStyle(filterToggle));
    }
    
    if (filterDropdown) {
        console.log('Filter dropdown element:', filterDropdown);
        console.log('Filter dropdown classes:', filterDropdown.classList.toString());
        console.log('Filter dropdown computed style:', window.getComputedStyle(filterDropdown));
        console.log('Filter dropdown z-index:', window.getComputedStyle(filterDropdown).zIndex);
        console.log('Filter dropdown position:', window.getComputedStyle(filterDropdown).position);
        console.log('Filter dropdown left:', window.getComputedStyle(filterDropdown).left);
        console.log('Filter dropdown top:', window.getComputedStyle(filterDropdown).top);
        console.log('Filter dropdown transform:', window.getComputedStyle(filterDropdown).transform);
        console.log('Filter dropdown opacity:', window.getComputedStyle(filterDropdown).opacity);
        console.log('Filter dropdown visibility:', window.getComputedStyle(filterDropdown).visibility);
        console.log('Filter dropdown display:', window.getComputedStyle(filterDropdown).display);
    }
    
    filterOptions.forEach((option, index) => {
        console.log(`Filter option ${index}:`, option);
        console.log(`  - Classes: ${option.classList.toString()}`);
        console.log(`  - Data attributes: filter=${option.getAttribute('data-filter')}, value=${option.getAttribute('data-value')}`);
        console.log(`  - Computed style:`, window.getComputedStyle(option));
        console.log(`  - Pointer events:`, window.getComputedStyle(option).pointerEvents);
        console.log(`  - Z-index:`, window.getComputedStyle(option).zIndex);
    });
}

// Test 2: Check event listeners
function testEventListeners() {
    console.log('\n=== TEST 2: EVENT LISTENERS ===');
    
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    
    // Test filter toggle
    if (filterToggle) {
        console.log('Testing filter toggle click...');
        filterToggle.click();
        
        setTimeout(() => {
            console.log('After toggle click:');
            console.log('  - Dropdown classes:', filterDropdown?.classList.toString());
            console.log('  - Dropdown opacity:', window.getComputedStyle(filterDropdown).opacity);
            console.log('  - Dropdown visibility:', window.getComputedStyle(filterDropdown).visibility);
        }, 100);
    }
    
    // Test filter options
    filterOptions.forEach((option, index) => {
        console.log(`Testing filter option ${index} click...`);
        
        // Check if option is clickable
        const rect = option.getBoundingClientRect();
        console.log(`  - Bounding rect:`, rect);
        console.log(`  - Is visible:`, rect.width > 0 && rect.height > 0);
        console.log(`  - Pointer events:`, window.getComputedStyle(option).pointerEvents);
        
        // Simulate click
        option.click();
        
        setTimeout(() => {
            console.log(`  - After click, classes:`, option.classList.toString());
        }, 50);
    });
}

// Test 3: Check CSS positioning and visibility
function testCSSIssues() {
    console.log('\n=== TEST 3: CSS POSITIONING & VISIBILITY ===');
    
    const filterDropdown = document.getElementById('filter-dropdown');
    if (!filterDropdown) return;
    
    const computedStyle = window.getComputedStyle(filterDropdown);
    const rect = filterDropdown.getBoundingClientRect();
    
    console.log('CSS Analysis:');
    console.log('  - Position:', computedStyle.position);
    console.log('  - Left:', computedStyle.left);
    console.log('  - Top:', computedStyle.top);
    console.log('  - Transform:', computedStyle.transform);
    console.log('  - Z-index:', computedStyle.zIndex);
    console.log('  - Opacity:', computedStyle.opacity);
    console.log('  - Visibility:', computedStyle.visibility);
    console.log('  - Display:', computedStyle.display);
    console.log('  - Pointer events:', computedStyle.pointerEvents);
    
    console.log('Bounding Rect Analysis:');
    console.log('  - X:', rect.x);
    console.log('  - Y:', rect.y);
    console.log('  - Width:', rect.width);
    console.log('  - Height:', rect.height);
    console.log('  - Is on screen:', rect.x >= 0 && rect.x <= window.innerWidth);
    console.log('  - Is visible:', rect.width > 0 && rect.height > 0);
    
    // Check if dropdown is positioned off-screen
    if (rect.x < 0 || rect.x > window.innerWidth) {
        console.log('❌ ISSUE: Dropdown is positioned off-screen!');
        console.log(`   X position: ${rect.x}, Screen width: ${window.innerWidth}`);
    }
    
    if (rect.y < 0 || rect.y > window.innerHeight) {
        console.log('❌ ISSUE: Dropdown is positioned off-screen vertically!');
        console.log(`   Y position: ${rect.y}, Screen height: ${window.innerHeight}`);
    }
}

// Test 4: Check for overlapping elements
function testOverlappingElements() {
    console.log('\n=== TEST 4: OVERLAPPING ELEMENTS ===');
    
    const filterDropdown = document.getElementById('filter-dropdown');
    if (!filterDropdown) return;
    
    const dropdownRect = filterDropdown.getBoundingClientRect();
    
    // Check all elements that might overlap
    const allElements = document.querySelectorAll('*');
    const overlappingElements = [];
    
    allElements.forEach(element => {
        if (element === filterDropdown) return;
        
        const rect = element.getBoundingClientRect();
        const zIndex = parseInt(window.getComputedStyle(element).zIndex) || 0;
        const dropdownZIndex = parseInt(window.getComputedStyle(filterDropdown).zIndex) || 0;
        
        // Check if elements overlap
        const overlaps = !(rect.right < dropdownRect.left || 
                          rect.left > dropdownRect.right || 
                          rect.bottom < dropdownRect.top || 
                          rect.top > dropdownRect.bottom);
        
        if (overlaps && zIndex > dropdownZIndex) {
            overlappingElements.push({
                element: element,
                tagName: element.tagName,
                className: element.className,
                zIndex: zIndex,
                rect: rect
            });
        }
    });
    
    console.log('Overlapping elements with higher z-index:');
    overlappingElements.forEach(overlap => {
        console.log(`  - ${overlap.tagName}.${overlap.className} (z-index: ${overlap.zIndex})`);
    });
    
    if (overlappingElements.length > 0) {
        console.log('❌ ISSUE: Elements with higher z-index are overlapping the dropdown!');
    }
}

// Test 5: Check event propagation
function testEventPropagation() {
    console.log('\n=== TEST 5: EVENT PROPAGATION ===');
    
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    
    if (!filterDropdown) return;
    
    // Add temporary event listeners to track propagation
    const originalClickHandler = filterDropdown.onclick;
    
    filterDropdown.addEventListener('click', function(e) {
        console.log('Dropdown clicked:', e.target);
        console.log('Event phase:', e.eventPhase);
        console.log('Bubbles:', e.bubbles);
        console.log('Cancelable:', e.cancelable);
        console.log('Default prevented:', e.defaultPrevented);
    }, true); // Capture phase
    
    filterDropdown.addEventListener('click', function(e) {
        console.log('Dropdown clicked (bubble phase):', e.target);
    }, false); // Bubble phase
    
    // Test clicking on options
    filterOptions.forEach((option, index) => {
        option.addEventListener('click', function(e) {
            console.log(`Option ${index} clicked:`, e.target);
            console.log('Event phase:', e.eventPhase);
            console.log('Stop propagation called:', e.defaultPrevented);
        });
    });
}

// Test 6: Check for JavaScript errors
function testJavaScriptErrors() {
    console.log('\n=== TEST 6: JAVASCRIPT ERRORS ===');
    
    // Check if setupMainNavigation is called
    console.log('Checking if setupMainNavigation is defined:', typeof setupMainNavigation);
    
    // Check if filterOptions is defined in scope
    try {
        const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
        console.log('Filter options query successful:', filterOptions.length);
    } catch (error) {
        console.log('❌ ERROR querying filter options:', error);
    }
    
    // Check if event listeners are properly attached
    const filterToggle = document.getElementById('filter-toggle');
    if (filterToggle) {
        console.log('Filter toggle has onclick:', !!filterToggle.onclick);
        console.log('Filter toggle has event listeners:', filterToggle.addEventListener ? 'Yes' : 'No');
    }
}

// Test 7: Check timing issues
function testTimingIssues() {
    console.log('\n=== TEST 7: TIMING ISSUES ===');
    
    console.log('Document ready state:', document.readyState);
    console.log('DOM content loaded:', document.readyState === 'complete');
    
    // Check if elements are available immediately
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    
    console.log('Elements available immediately:', {
        toggle: !!filterToggle,
        dropdown: !!filterDropdown
    });
    
    // Check if setupMainNavigation has been called
    console.log('setupMainNavigation called:', typeof setupMainNavigation === 'function');
}

// Run all tests
function runAllTests() {
    testElementExistence();
    testEventListeners();
    testCSSIssues();
    testOverlappingElements();
    testEventPropagation();
    testJavaScriptErrors();
    testTimingIssues();
    
    console.log('\n🔍 DEBUGGING COMPLETE');
    console.log('Check the console output above for potential issues.');
}

// Auto-run tests when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllTests);
} else {
    runAllTests();
}

// Make tests available globally
window.debugFilter = {
    runAllTests,
    testElementExistence,
    testEventListeners,
    testCSSIssues,
    testOverlappingElements,
    testEventPropagation,
    testJavaScriptErrors,
    testTimingIssues
};
