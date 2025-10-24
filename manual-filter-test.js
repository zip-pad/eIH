// MANUAL FILTER TESTING SCRIPT
// This script simulates user interactions to test the filter system

console.log('🧪 STARTING MANUAL FILTER TESTING...');

// Test 1: Simulate clicking the filter toggle
function testFilterToggleClick() {
    console.log('\n=== TEST 1: FILTER TOGGLE CLICK ===');
    
    const filterToggle = document.getElementById('filter-toggle');
    if (!filterToggle) {
        console.log('❌ Filter toggle not found!');
        return false;
    }
    
    console.log('Filter toggle found, simulating click...');
    
    // Get initial state
    const dropdown = document.getElementById('filter-dropdown');
    const initialClasses = dropdown?.classList.toString();
    const initialOpacity = window.getComputedStyle(dropdown).opacity;
    
    console.log('Before click:');
    console.log('  - Dropdown classes:', initialClasses);
    console.log('  - Dropdown opacity:', initialOpacity);
    
    // Simulate click
    filterToggle.click();
    
    // Check state after click
    setTimeout(() => {
        const afterClasses = dropdown?.classList.toString();
        const afterOpacity = window.getComputedStyle(dropdown).opacity;
        const afterVisibility = window.getComputedStyle(dropdown).visibility;
        
        console.log('After click:');
        console.log('  - Dropdown classes:', afterClasses);
        console.log('  - Dropdown opacity:', afterOpacity);
        console.log('  - Dropdown visibility:', afterVisibility);
        
        const isOpen = afterClasses?.includes('active') && afterOpacity === '1';
        console.log('✅ Dropdown opened successfully:', isOpen);
        
        if (!isOpen) {
            console.log('❌ Dropdown failed to open!');
            console.log('   Possible issues:');
            console.log('   - CSS positioning problem');
            console.log('   - Z-index too low');
            console.log('   - JavaScript event not firing');
            console.log('   - CSS transition not working');
        }
        
        return isOpen;
    }, 100);
}

// Test 2: Simulate clicking filter options
function testFilterOptionClicks() {
    console.log('\n=== TEST 2: FILTER OPTION CLICKS ===');
    
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    console.log('Found filter options:', filterOptions.length);
    
    if (filterOptions.length === 0) {
        console.log('❌ No filter options found!');
        return false;
    }
    
    let successCount = 0;
    
    filterOptions.forEach((option, index) => {
        console.log(`\nTesting option ${index}:`, option.textContent.trim());
        
        // Get initial state
        const initialClasses = option.classList.toString();
        const initialActive = option.classList.contains('active');
        
        console.log('Before click:');
        console.log('  - Classes:', initialClasses);
        console.log('  - Is active:', initialActive);
        console.log('  - Bounding rect:', option.getBoundingClientRect());
        console.log('  - Pointer events:', window.getComputedStyle(option).pointerEvents);
        
        // Check if element is clickable
        const rect = option.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const hasPointerEvents = window.getComputedStyle(option).pointerEvents !== 'none';
        
        console.log('Clickability check:');
        console.log('  - Is visible:', isVisible);
        console.log('  - Has pointer events:', hasPointerEvents);
        
        if (!isVisible) {
            console.log('❌ Option is not visible!');
            return;
        }
        
        if (!hasPointerEvents) {
            console.log('❌ Option has pointer-events: none!');
            return;
        }
        
        // Simulate click
        try {
            option.click();
            
            // Check state after click
            setTimeout(() => {
                const afterClasses = option.classList.toString();
                const afterActive = option.classList.contains('active');
                
                console.log('After click:');
                console.log('  - Classes:', afterClasses);
                console.log('  - Is active:', afterActive);
                
                if (afterActive) {
                    console.log('✅ Option click successful!');
                    successCount++;
                } else {
                    console.log('❌ Option click failed - not active after click');
                    console.log('   Possible issues:');
                    console.log('   - Event listener not attached');
                    console.log('   - Event propagation blocked');
                    console.log('   - JavaScript error in handler');
                    console.log('   - CSS preventing interaction');
                }
            }, 50);
            
        } catch (error) {
            console.log('❌ Error clicking option:', error);
        }
    });
    
    console.log(`\nSuccess rate: ${successCount}/${filterOptions.length} options responded to clicks`);
    return successCount > 0;
}

// Test 3: Check for CSS conflicts
function testCSSConflicts() {
    console.log('\n=== TEST 3: CSS CONFLICTS ===');
    
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
    
    // Check for positioning issues
    if (computedStyle.left === '100%') {
        console.log('❌ ISSUE: Dropdown positioned at left: 100% - likely off-screen!');
        console.log('   This means the dropdown is positioned to the right of the viewport.');
        console.log('   Solution: Change left positioning or use transform to center it.');
    }
    
    if (parseInt(computedStyle.zIndex) < 1000) {
        console.log('❌ ISSUE: Z-index too low!');
        console.log('   Current z-index:', computedStyle.zIndex);
        console.log('   Solution: Increase z-index to 10000 or higher.');
    }
    
    if (computedStyle.pointerEvents === 'none') {
        console.log('❌ ISSUE: Pointer events disabled!');
        console.log('   Solution: Set pointer-events: auto on dropdown.');
    }
    
    // Check if dropdown is visible
    if (rect.width === 0 || rect.height === 0) {
        console.log('❌ ISSUE: Dropdown has no dimensions!');
        console.log('   Width:', rect.width, 'Height:', rect.height);
        console.log('   Solution: Check CSS for width/height issues.');
    }
    
    // Check if dropdown is on screen
    if (rect.x < 0 || rect.x > window.innerWidth) {
        console.log('❌ ISSUE: Dropdown positioned off-screen horizontally!');
        console.log('   X position:', rect.x, 'Screen width:', window.innerWidth);
        console.log('   Solution: Adjust left positioning or use transform.');
    }
    
    if (rect.y < 0 || rect.y > window.innerHeight) {
        console.log('❌ ISSUE: Dropdown positioned off-screen vertically!');
        console.log('   Y position:', rect.y, 'Screen height:', window.innerHeight);
        console.log('   Solution: Adjust top positioning or use transform.');
    }
}

// Test 4: Check JavaScript event handling
function testJavaScriptEvents() {
    console.log('\n=== TEST 4: JAVASCRIPT EVENT HANDLING ===');
    
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    
    // Check if setupMainNavigation exists and is called
    console.log('setupMainNavigation function exists:', typeof setupMainNavigation);
    
    // Check if elements have event listeners
    if (filterToggle) {
        console.log('Filter toggle has event listeners:', filterToggle.addEventListener ? 'Yes' : 'No');
    }
    
    if (filterDropdown) {
        console.log('Filter dropdown has event listeners:', filterDropdown.addEventListener ? 'Yes' : 'No');
    }
    
    // Check filter options
    filterOptions.forEach((option, index) => {
        console.log(`Filter option ${index} has event listeners:`, option.addEventListener ? 'Yes' : 'No');
    });
    
    // Test if clicking outside closes dropdown
    console.log('\nTesting click outside behavior...');
    document.body.click();
    
    setTimeout(() => {
        const isOpen = filterDropdown?.classList.contains('active');
        console.log('Dropdown still open after body click:', isOpen);
        
        if (isOpen) {
            console.log('❌ ISSUE: Click outside not closing dropdown!');
            console.log('   Solution: Check click outside event listener.');
        }
    }, 100);
}

// Test 5: Check for timing issues
function testTimingIssues() {
    console.log('\n=== TEST 5: TIMING ISSUES ===');
    
    console.log('Document ready state:', document.readyState);
    console.log('DOM content loaded:', document.readyState === 'complete');
    
    // Check if elements are available
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    
    console.log('Elements available:');
    console.log('  - Filter toggle:', !!filterToggle);
    console.log('  - Filter dropdown:', !!filterDropdown);
    console.log('  - Filter options:', filterOptions.length);
    
    // Check if setupMainNavigation has been called
    if (typeof setupMainNavigation === 'function') {
        console.log('✅ setupMainNavigation function is available');
    } else {
        console.log('❌ setupMainNavigation function not available!');
        console.log('   This means the script.js file may not have loaded properly.');
    }
}

// Run all manual tests
function runManualTests() {
    console.log('🧪 RUNNING MANUAL FILTER TESTS...\n');
    
    testFilterToggleClick();
    
    setTimeout(() => {
        testFilterOptionClicks();
    }, 200);
    
    setTimeout(() => {
        testCSSConflicts();
    }, 400);
    
    setTimeout(() => {
        testJavaScriptEvents();
    }, 600);
    
    setTimeout(() => {
        testTimingIssues();
    }, 800);
    
    setTimeout(() => {
        console.log('\n🧪 MANUAL TESTING COMPLETE');
        console.log('Check the console output above for detailed analysis.');
    }, 1000);
}

// Auto-run tests
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runManualTests);
} else {
    runManualTests();
}

// Make tests available globally
window.manualFilterTest = {
    runManualTests,
    testFilterToggleClick,
    testFilterOptionClicks,
    testCSSConflicts,
    testJavaScriptEvents,
    testTimingIssues
};
