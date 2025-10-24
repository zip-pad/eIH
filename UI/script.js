// Digital Library JavaScript - This file controls all the interactive features
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Global variables to store our library data
let libraryItems = []; // This array will store all your books and papers
let currentSection = 'library'; // Tracks which section we're currently viewing
let currentTheme = 'white'; // Current theme color for the floating dock
let currentUser = null; // Current authenticated user

// AUTHENTICATION FUNCTIONS
// Check if user is authenticated and redirect if not
async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Auth check error:', error);
            redirectToLanding();
            return false;
        }
        
        if (!session) {
            console.log('No active session, redirecting to landing page');
            redirectToLanding();
            return false;
        }
        
        currentUser = session.user;
        console.log('User authenticated:', currentUser.email);
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLanding();
        return false;
    }
}

// Redirect to landing page
function redirectToLanding() {
    window.location.href = 'landing.html';
}

// Sign out function
async function signOut() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign out error:', error);
            showNotification('Error signing out', 'error');
        } else {
            showNotification('Signed out successfully', 'success');
            redirectToLanding();
        }
    } catch (error) {
        console.error('Sign out failed:', error);
        showNotification('Error signing out', 'error');
    }
}

// SEMANTIC SCHOLAR API SERVICE
// This class handles integration with Semantic Scholar API for academic papers
class SemanticScholarService {
    static async searchPapers(query, retryCount = 0) {
        const maxRetries = 2;
        
        try {
            console.log('🔬 Searching Semantic Scholar for:', query, retryCount > 0 ? `(Retry ${retryCount}/${maxRetries})` : '');
            
            const fields = 'title,authors,year,abstract,citationCount,venue,publicationDate,openAccessPdf';
            const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&fields=${fields}`;
            
            console.log('🔗 Request URL:', url);
            
            // Add timeout to fetch request
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
            
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            clearTimeout(timeoutId);
            
            console.log('📡 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Semantic Scholar API response:', data);
            console.log('📊 Number of papers found:', data.total, '| Returning:', data.data?.length || 0);
            
            return this.transformResults(data.data || []);
        } catch (error) {
            console.error('💥 Semantic Scholar API error:', error);
            console.error('💥 Error name:', error.name);
            console.error('💥 Error message:', error.message);
            
            // Retry on timeout or network error
            if ((error.name === 'AbortError' || error.message.includes('Failed to fetch')) && retryCount < maxRetries) {
                console.warn(`⚠️ Request failed, retrying... (${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Progressive delay
                return this.searchPapers(query, retryCount + 1);
            }
            
            console.error('❌ All retries exhausted or non-retryable error');
            return [];
        }
    }
    
    static transformResults(papers) {
        return papers.map(paper => ({
            id: `semantic_${paper.paperId}`,
            title: paper.title || 'Unknown Title',
            author: paper.authors?.map(a => a.name).join(', ') || 'Unknown Author',
            year: paper.year || null,
            publishedDate: paper.publicationDate || null,
            publishingYear: paper.year || null,
            summary: paper.abstract || 'No abstract available',
            description: paper.abstract || 'No abstract available',
            citedBy: paper.citationCount || 0,
            venue: paper.venue || 'Unknown Venue',
            pdfUrl: paper.openAccessPdf?.url || null,
            category: 'Research',
            type: 'Paper',
            source: 'semantic_scholar',
            // Note: Semantic Scholar API doesn't provide page numbers
            // Users will need to enter this manually after selection
            pages: null
        }));
    }
}

// GOOGLE BOOKS API SERVICE
// This class handles integration with Google Books API
class GoogleBooksService {
    static async searchBooks(query) {
        try {
            console.log('Searching Google Books for:', query);
            
            const response = await fetch(
                `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Google Books API response:', data);
            
            return this.transformResults(data.items || []);
        } catch (error) {
            console.error('Google Books API error:', error);
            return [];
        }
    }
    
    static transformResults(items) {
        return items.map(item => ({
            id: `google_${item.id}`,
            title: item.volumeInfo.title || 'Unknown Title',
            author: item.volumeInfo.authors?.join(', ') || 'Unknown Author',
            isbn: item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_13')?.identifier ||
                  item.volumeInfo.industryIdentifiers?.find(id => id.type === 'ISBN_10')?.identifier ||
                  'No ISBN',
            coverImage: item.volumeInfo.imageLinks?.thumbnail || 
                       item.volumeInfo.imageLinks?.smallThumbnail ||
                       null,
            description: item.volumeInfo.description || 'No description available',
            publishedDate: item.volumeInfo.publishedDate || 'Unknown',
            pageCount: item.volumeInfo.pageCount || null,
            language: item.volumeInfo.language || 'Unknown',
            publisher: item.volumeInfo.publisher || 'Unknown Publisher',
            categories: item.volumeInfo.categories || [],
            averageRating: item.volumeInfo.averageRating || null,
            ratingsCount: item.volumeInfo.ratingsCount || null,
            previewLink: item.volumeInfo.previewLink || null,
            infoLink: item.volumeInfo.infoLink || null,
            source: 'Google Books'
        }));
    }
    
    static getCoverImageUrl(item, size = 'medium') {
        if (!item.volumeInfo?.imageLinks) return null;
        
        const sizes = {
            small: item.volumeInfo.imageLinks.smallThumbnail,
            medium: item.volumeInfo.imageLinks.thumbnail,
            large: item.volumeInfo.imageLinks.medium || item.volumeInfo.imageLinks.large
        };
        
        return sizes[size] || sizes.medium;
    }
}

// When the page loads, this function runs first
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Digital Library loaded successfully!');
    
    // Check authentication first
    console.log('🔍 Checking authentication...');
    const isAuthenticated = await checkAuth();
    console.log('🔍 Authentication result:', isAuthenticated);
    console.log('🔍 Current user after checkAuth:', currentUser);
    
    if (!isAuthenticated) {
        console.log('❌ Not authenticated, should redirect to landing');
        return; // User will be redirected to landing page
    }
    
    console.log('✅ User authenticated:', currentUser?.email, 'ID:', currentUser?.id);
    
    // Load user's library data from Supabase
    console.log('🔍 About to load library data...');
    await loadLibraryData();
    console.log('🔍 After loading, libraryItems count:', libraryItems.length);
    
    // Set up all the interactive features
    setupMainNavigation();
    setupAddForm();
    setupSearch();
    setupDecryptedText();
    setupTypingEffect();
    setupPlanetControls();
    setupOverlaySearch();
    
    // Load saved view preference
    loadSavedView();
    
    // Update the display
    updateLibraryDisplay();
});

// TYPING EFFECT SYSTEM
// This function sets up the typing effect for the header
function setupTypingEffect() {
    console.log('Setting up typing effect...');
    
    const texts = ["Knowledge Hub", "Your Digital Library"];
    const typingHeader = document.getElementById('typing-header');
    const typingSpeed = 75;
    const pauseDuration = 1500;
    const showCursor = true;
    const cursorCharacter = "|";
    
    let currentTextIndex = 0;
    let currentCharIndex = 0;
    let isDeleting = false;
    let timeout;
    
    function typeText() {
        const currentText = texts[currentTextIndex];
        
        if (isDeleting) {
            // Delete characters
            typingHeader.textContent = currentText.substring(0, currentCharIndex - 1) + (showCursor ? cursorCharacter : '');
            currentCharIndex--;
        } else {
            // Add characters
            typingHeader.textContent = currentText.substring(0, currentCharIndex + 1) + (showCursor ? cursorCharacter : '');
            currentCharIndex++;
        }
        
        let timeoutDuration = typingSpeed;
        
        if (isDeleting) {
            timeoutDuration = typingSpeed / 2; // Faster when deleting
        }
        
        if (!isDeleting && currentCharIndex === currentText.length) {
            // Finished typing, pause before deleting
            timeoutDuration = pauseDuration;
            isDeleting = true;
        } else if (isDeleting && currentCharIndex === 0) {
            // Finished deleting, move to next text
            isDeleting = false;
            currentTextIndex = (currentTextIndex + 1) % texts.length;
        }
        
        timeout = setTimeout(typeText, timeoutDuration);
    }
    
    // Start the typing effect
    typeText();
    
    // Pause on hover, resume on leave
    typingHeader.addEventListener('mouseenter', function() {
        clearTimeout(timeout);
    });
    
    typingHeader.addEventListener('mouseleave', function() {
        typeText();
    });
}

// MAIN NAVIGATION SYSTEM
// This function sets up the main navigation sidebar
// Global filter state
let activeFilters = {
    type: 'all',
    status: 'all',
    rating: 'all',
    difficulty: 'all',
    language: 'all',
    category: 'all'
};

function setupMainNavigation() {
    console.log('Setting up main navigation...');
    
    const navLinks = document.querySelectorAll('.nav-link');
    const filterToggle = document.getElementById('filter-toggle');
    const filterDropdown = document.getElementById('filter-dropdown');
    
    console.log('Filter toggle element:', filterToggle);
    console.log('Filter dropdown element:', filterDropdown);
    const filterOptions = document.querySelectorAll('.dropdown-option[data-filter]');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const planetViewBtn = document.getElementById('planet-view-btn');
    const masonryViewBtn = document.getElementById('masonry-view-btn');
    
    // Handle navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            // Add active class to clicked link
            this.classList.add('active');
            
            const action = this.getAttribute('data-action');
            const section = this.getAttribute('data-section');
            
            if (action === 'add') {
                openModal('add-modal');
            } else if (action === 'stats') {
                openModal('stats-modal');
                displayStatistics();
            } else if (action === 'signout') {
                signOut();
            } else if (section === 'search') {
                openOverlaySearch();
            }
        });
    });
    
    // Handle filter dropdown toggle
    if (filterToggle && filterDropdown) {
        console.log('Setting up filter toggle event listener');
        filterToggle.addEventListener('click', function(e) {
            console.log('Filter toggle clicked!');
            e.stopPropagation();
            const isOpening = !filterDropdown.classList.contains('active');
            console.log('Filter is opening:', isOpening);
            filterDropdown.classList.toggle('active');
            filterToggle.classList.toggle('active');
            
            console.log('Filter dropdown classes after toggle:', filterDropdown.classList.toString());
            console.log('Filter dropdown computed style:', window.getComputedStyle(filterDropdown).display);
            console.log('Filter dropdown z-index:', window.getComputedStyle(filterDropdown).zIndex);
            
            // Disable/enable sidebar based on dropdown state
            if (isOpening) {
                console.log('Disabling sidebar for filter dropdown');
                disableSidebar();
            } else {
                console.log('Enabling sidebar for filter dropdown');
                enableSidebar();
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!filterToggle.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.remove('active');
                filterToggle.classList.remove('active');
                
                // Enable sidebar when filter is closed
                enableSidebar();
            }
        });
    }
    
    // Handle filter options
    filterOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event from bubbling up
            const filterType = this.getAttribute('data-filter');
            const filterValue = this.getAttribute('data-value');
            
            console.log('Filter option clicked:', filterType, filterValue);
            
            // Update active state within the same filter category
            const categoryOptions = document.querySelectorAll(`[data-filter="${filterType}"]`);
            categoryOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter state
            activeFilters[filterType] = filterValue;
            
            // Apply filters
            applyFilters();
        });
    });
    
    // Handle clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            // Reset all filters to 'all'
            activeFilters = {
                type: 'all',
                status: 'all',
                rating: 'all',
                difficulty: 'all',
                language: 'all',
                category: 'all'
            };
            
            // Reset UI - remove active from all filter options and set 'all' as active
            filterOptions.forEach(option => {
                option.classList.remove('active');
                if (option.getAttribute('data-value') === 'all') {
                    option.classList.add('active');
                }
            });
            
            // Apply filters (which will show all items)
            applyFilters();
            showNotification('All filters cleared!', 'info');
        });
    }
    
    // Populate dynamic categories
    populateFilterCategories();
    
    // Handle view switching
    if (planetViewBtn) {
        planetViewBtn.addEventListener('click', function() {
            switchToView('planet');
            // Update active states
            planetViewBtn.classList.add('active');
            masonryViewBtn.classList.remove('active');
        });
    }
    
    if (masonryViewBtn) {
        masonryViewBtn.addEventListener('click', function() {
            switchToView('masonry');
            // Update active states
            masonryViewBtn.classList.add('active');
            planetViewBtn.classList.remove('active');
        });
    }
}

// FILTER SYSTEM
// This function populates the category filter options dynamically
function populateFilterCategories() {
    const categoryFilterOptions = document.getElementById('category-filter-options');
    if (!categoryFilterOptions) return;
    
    // Get unique categories from library items
    const categories = new Set();
    libraryItems.forEach(item => {
        if (item.category && item.category.trim() !== '') {
            categories.add(item.category);
        }
    });
    
    // Keep the "All" button and add category buttons
    const allButton = categoryFilterOptions.querySelector('[data-value="all"]');
    categoryFilterOptions.innerHTML = '';
    if (allButton) {
        categoryFilterOptions.appendChild(allButton);
    }
    
    // Add buttons for each unique category
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'dropdown-option';
        button.setAttribute('data-filter', 'category');
        button.setAttribute('data-value', category);
        button.innerHTML = `<span>${category}</span>`;
        
        button.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter');
            const filterValue = this.getAttribute('data-value');
            
            // Update active state
            const categoryOptions = document.querySelectorAll(`[data-filter="${filterType}"]`);
            categoryOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            
            // Update filter state
            activeFilters[filterType] = filterValue;
            
            // Apply filters
            applyFilters();
        });
        
        categoryFilterOptions.appendChild(button);
    });
}

// This function applies all active filters to the library items
function applyFilters() {
    const currentView = localStorage.getItem('currentView') || 'masonry';
    
    // Filter the library items
    let filteredItems = libraryItems.filter(item => {
        // Type filter
        if (activeFilters.type !== 'all' && item.type !== activeFilters.type) {
            return false;
        }
        
        // Status filter
        if (activeFilters.status !== 'all' && item.status !== activeFilters.status) {
            return false;
        }
        
        // Rating filter
        if (activeFilters.rating !== 'all') {
            const ratingThreshold = parseInt(activeFilters.rating);
            if (!item.rating || item.rating < ratingThreshold) {
                return false;
            }
        }
        
        // Difficulty filter
        if (activeFilters.difficulty !== 'all') {
            if (!item.difficulty) return false;
            
            const difficulty = parseInt(item.difficulty);
            if (activeFilters.difficulty === 'easy' && (difficulty < 1 || difficulty > 3)) {
                return false;
            }
            if (activeFilters.difficulty === 'medium' && (difficulty < 4 || difficulty > 7)) {
                return false;
            }
            if (activeFilters.difficulty === 'hard' && (difficulty < 8 || difficulty > 10)) {
                return false;
            }
        }
        
        // Language filter
        if (activeFilters.language !== 'all' && item.language !== activeFilters.language) {
            return false;
        }
        
        // Category filter
        if (activeFilters.category !== 'all' && item.category !== activeFilters.category) {
            return false;
        }
        
        return true;
    });
    
    // Update the display with filtered items
    if (currentView === 'masonry') {
        updateMasonryDisplay(filteredItems);
    } else {
        updatePlanetDisplay(filteredItems);
    }
    
    // Show notification about filtered results
    const activeFilterCount = Object.values(activeFilters).filter(v => v !== 'all').length;
    if (activeFilterCount > 0) {
        showNotification(`Showing ${filteredItems.length} of ${libraryItems.length} items`, 'info');
    }
}

// MASONRY VIEW SYSTEM
// This function switches between planet and masonry views
function switchToView(viewType) {
    const planetContainer = document.querySelector('.planet-container');
    const masonryContainer = document.getElementById('masonry-container');
    
    if (viewType === 'masonry') {
        planetContainer.style.display = 'none';
        masonryContainer.style.display = 'block';
        updateMasonryDisplay();
    } else {
        planetContainer.style.display = 'block';
        masonryContainer.style.display = 'none';
        updateLibraryDisplay(); // Refresh planet view
    }
    
    // Save view preference
    localStorage.setItem('currentView', viewType);
}

// GENERATE PAPER PREVIEW HTML
// This function generates a paper-style preview for the cover preview area
function generatePaperPreviewHTML(title, author) {
    // Truncate title to fit nicely
    const truncatedTitle = title.length > 60 ? title.substring(0, 57) + '...' : title;
    const truncatedAuthor = author.length > 40 ? author.substring(0, 37) + '...' : author;
    
    return `
        <div style="
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            box-sizing: border-box;
            border-radius: 6px;
        ">
            <div style="
                width: 100%;
                height: 100%;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 4px;
                padding: 0.75rem;
                display: flex;
                flex-direction: column;
                box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
            ">
                <div style="
                    font-size: 0.7rem;
                    font-weight: 600;
                    color: #667eea;
                    margin-bottom: 0.5rem;
                    text-align: center;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">Research Paper</div>
                <div style="
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #2c3e50;
                    line-height: 1.2;
                    margin-bottom: 0.5rem;
                    text-align: center;
                    flex-grow: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">${truncatedTitle}</div>
                <div style="
                    font-size: 0.65rem;
                    color: #7f8c8d;
                    text-align: center;
                    padding-top: 0.5rem;
                    border-top: 1px solid #e0e0e0;
                ">${truncatedAuthor}</div>
            </div>
        </div>
    `;
}

// NEW MASONRY ITEM CREATION FUNCTION
// This function creates a single masonry item with proper paper/book handling
function createMasonryItem(item, index) {
    const typeIcons = {
        'book': '📚',
        'paper': '📄',
        'article': '📰',
        'other': '📊'
    };
    
    const coverImage = item.coverImage || item.coverUrl;
    const itemType = item.type ? item.type.toLowerCase() : 'book';
    const displayType = item.type || 'Book'; // Keep original capitalization for display
    const fallbackIcon = typeIcons[itemType] || '📖';
    
    // Check if it's a paper and if it has a cover
    const isPaper = itemType === 'paper';
    const hasCover = coverImage && coverImage.trim() !== '';
    
    // Create cover HTML
    let coverHTML = '';
    if (hasCover) {
        coverHTML = `
            <img src="${coverImage}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div style="display: none; font-size: 3rem;">${fallbackIcon}</div>
        `;
    } else if (isPaper) {
        // Create paper-style cover for papers without images
        coverHTML = `
            <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border: 1px solid #dee2e6; border-radius: 4px; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Times New Roman', serif; color: #333; padding: 1rem; box-sizing: border-box;">
                <div style="font-size: 1rem; font-weight: bold; margin-bottom: 0.5rem; text-align: center; line-height: 1.2;">${item.title.length > 25 ? item.title.substring(0, 25) + '...' : item.title}</div>
                <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.3rem; text-align: center;">${item.author || 'Unknown Author'}</div>
                <div style="font-size: 0.7rem; color: #888; text-align: center;">Research Paper</div>
            </div>
        `;
    } else {
        coverHTML = `<div style="font-size: 3rem;">${fallbackIcon}</div>`;
    }
    
    return `
        <div class="masonry-item" data-item-index="${index}" style="animation-delay: ${index * 0.05}s;">
            <div class="masonry-cover">
                ${coverHTML}
            </div>
            <div class="masonry-content">
                <h3 class="masonry-title">${item.title}</h3>
                <div class="masonry-author">${item.author || 'Unknown Author'}</div>
                <div class="masonry-meta">
                    ${item.publishingYear ? `<span>${item.publishingYear}</span>` : ''}
                    ${item.pages ? `<span>${item.pages} pages</span>` : ''}
                    ${item.category ? `<span>${item.category}</span>` : ''}
                    ${item.language ? `<span>${item.language}</span>` : ''}
                </div>
                ${item.summary ? `<div class="masonry-summary">${item.summary}</div>` : ''}
            </div>
            <div class="masonry-type">${displayType}</div>
            <button class="masonry-delete-btn" onclick="deleteLibraryItem('${item.id}')" title="Delete item">×</button>
            ${item.rating ? `<div class="masonry-rating">${'★'.repeat(Math.floor(item.rating))}${item.rating % 1 ? '☆' : ''}</div>` : ''}
        </div>
    `;
}

// This function updates the planet display with filtered items
function updatePlanetDisplay(itemsToDisplay = null) {
    const items = itemsToDisplay || libraryItems;
    const planet = document.getElementById('knowledge-planet');
    
    if (!planet) return;
    
    // Clear existing particles
    planet.innerHTML = '';
    
    if (items.length === 0) {
        planet.innerHTML = '<div style="color: rgba(255, 255, 255, 0.5); text-align: center;">No items match the current filters</div>';
        return;
    }
    
    // Create particles for filtered items
    items.forEach((item, index) => {
        const particle = createPlanetParticle(item, index, items.length);
        planet.appendChild(particle);
    });
}

// This function updates the masonry display with current library items
function updateMasonryDisplay(itemsToDisplay = null) {
    const masonryGrid = document.getElementById('masonry-grid');
    const items = itemsToDisplay || libraryItems;
    
    if (items.length === 0) {
        masonryGrid.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; min-height: 50vh; color: rgba(255, 255, 255, 0.6);">
                <button onclick="openModal('add-modal')" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.3); color: #ffffff; padding: 0.75rem 2rem; border-radius: 8px; cursor: pointer; font-weight: 500; margin: 0 auto 0 calc(50% - 20px); transform: translateX(-50%);">
                    Add Your First Item
                </button>
            </div>
        `;
        return;
    }
    
    masonryGrid.innerHTML = items.map((item, index) => {
        return createMasonryItem(item, index);
    }).join('');
    
    // Add click handlers and animate items
    setTimeout(() => {
        masonryGrid.querySelectorAll('.masonry-item').forEach((itemElement, displayIndex) => {
            itemElement.classList.add('animate');
            
            itemElement.addEventListener('click', function(e) {
                // Don't trigger if clicking delete button
                if (e.target.closest('.masonry-delete-btn')) {
                    return;
                }
                
                const itemIndex = parseInt(this.getAttribute('data-item-index'));
                const selectedItem = items[itemIndex];
                if (selectedItem) {
                    openEditModal(selectedItem);
                }
            });
        });
    }, 100);
}

// Load saved view preference
function loadSavedView() {
    const savedView = localStorage.getItem('currentView');
    if (savedView === 'masonry') {
        switchToView('masonry');
        // Update button states
        const planetViewBtn = document.getElementById('planet-view-btn');
        const masonryViewBtn = document.getElementById('masonry-view-btn');
        if (planetViewBtn && masonryViewBtn) {
            planetViewBtn.classList.remove('active');
            masonryViewBtn.classList.add('active');
        }
    }
}

// PLANET CONTROLS SYSTEM
// This function sets up planet rotation controls
function setupPlanetControls() {
    console.log('Setting up planet controls...');
    
    const planet = document.getElementById('knowledge-planet');
    let isPaused = false;
    let currentSpeed = 20; // Default speed in seconds
    
    // Keyboard controls for 3D rotation - ONLY when NOT typing
    document.addEventListener('keydown', function(e) {
        // Check if user is currently focused on an input element
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' || 
                            activeElement.tagName === 'TEXTAREA' ||
                            activeElement.tagName === 'SELECT' ||
                            activeElement.isContentEditable;
        
        // If user is typing, don't interfere with keyboard at all
        if (isInputField) {
            return; // Let the input handle ALL keys naturally
        }
        
        // Only handle arrow keys for planet control when NOT in an input
        switch(e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                // Slow down rotation
                currentSpeed = Math.min(60, currentSpeed + 10);
                planet.style.animationDuration = currentSpeed + 's';
                break;
            case 'ArrowRight':
                e.preventDefault();
                // Speed up rotation
                currentSpeed = Math.max(5, currentSpeed - 5);
                planet.style.animationDuration = currentSpeed + 's';
                break;
            case 'ArrowUp':
                e.preventDefault();
                // Change rotation axis (add more Y rotation)
                planet.style.animation = `planetRotate3D_Y ${currentSpeed}s linear infinite`;
                break;
            case 'ArrowDown':
                e.preventDefault();
                // Change rotation axis (add more X rotation)
                planet.style.animation = `planetRotate3D_X ${currentSpeed}s linear infinite`;
                break;
        }
    });
    
    // Reset to normal speed and default rotation on mouse leave
    planet.addEventListener('mouseleave', function() {
        if (!isPaused) {
            planet.style.animationDuration = '20s';
            planet.style.animation = 'planetRotate3D 20s linear infinite';
            currentSpeed = 20;
        }
    });
}

// SIDEBAR SYSTEM
// This function sets up the sidebar functionality
function setupSidebar() {
    console.log('Setting up sidebar...');
    
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const colorOptions = document.querySelectorAll('.color-option');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const clearLibraryBtn = document.getElementById('clear-library-btn');
    
    // Make toggleSidebar globally accessible
    window.toggleSidebar = function() {
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('active');
    };
    
    // Close sidebar
    function closeSidebar() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    }
    
    // Event listeners
    sidebarToggle.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Color theme switching
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            colorOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Get theme and color
            const theme = this.getAttribute('data-theme');
            const color = this.getAttribute('data-color');
            
            // Update current theme
            currentTheme = theme;
            
            // Apply theme to floating dock
            applyThemeToDock(color);
            
            // Save theme to localStorage
            localStorage.setItem('libraryTheme', theme);
            
            console.log(`Theme changed to: ${theme}`);
        });
    });
    
    // Sidebar buttons
    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', function() {
            forceLoadDummyData();
            closeSidebar();
        });
    }
    
    if (clearLibraryBtn) {
        clearLibraryBtn.addEventListener('click', function() {
            clearLibrary();
            closeSidebar();
        });
    }
    
    // Load saved theme
    loadSavedTheme();
}

// DECRYPTED TEXT EFFECT SYSTEM
// This function sets up the decrypted text effect
function setupDecryptedText() {
    console.log('Setting up decrypted text effect...');
    
    const decryptedTextElements = document.querySelectorAll('.decrypted-text');
    
    decryptedTextElements.forEach(element => {
        // Skip all elements - no Matrix animation for clean design
        return;
    });
}

// Generate encrypted text with random characters
function generateEncryptedText(text, characters) {
    return text.split('').map(char => {
        if (char === ' ') return ' ';
        return characters[Math.floor(Math.random() * characters.length)];
    }).join('');
}

// Decrypt text animation
function decryptText(element, originalText, characters) {
    const text = originalText;
    const speed = 50; // milliseconds per character
    const maxIterations = 3;
    
    let iterations = 0;
    let currentIndex = 0;
    
    element.classList.remove('encrypted');
    element.classList.add('revealed');
    
    const decryptInterval = setInterval(() => {
        if (currentIndex >= text.length) {
            iterations++;
            currentIndex = 0;
            
            if (iterations >= maxIterations) {
                element.textContent = text;
                clearInterval(decryptInterval);
                return;
            }
        }
        
        const currentText = text.substring(0, currentIndex + 1);
        const remainingText = text.substring(currentIndex + 1);
        const encryptedRemaining = remainingText.split('').map(char => {
            if (char === ' ') return ' ';
            return characters[Math.floor(Math.random() * characters.length)];
        }).join('');
        
        element.textContent = currentText + encryptedRemaining;
        currentIndex++;
    }, speed);
}

// This function applies theme colors to the floating dock
function applyThemeToDock(color) {
    // Apply theme to navigation elements
    const navLinks = document.querySelectorAll('.nav-link');
    const settingsToggle = document.querySelector('.settings-toggle');
    
    // Update navigation link borders on hover
    navLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.borderLeftColor = color;
        });
    });
    
    // Update settings toggle on hover
    if (settingsToggle) {
        settingsToggle.addEventListener('mouseenter', function() {
            this.style.borderColor = color;
        });
    }
    
    // Store current theme color globally for other elements
    window.currentThemeColor = color;
}

// This function loads the saved theme from localStorage
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('libraryTheme');
    if (savedTheme) {
        currentTheme = savedTheme;
        
        // Find and activate the saved theme option
        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(option => {
            option.classList.remove('active');
            if (option.getAttribute('data-theme') === savedTheme) {
                option.classList.add('active');
                const color = option.getAttribute('data-color');
                applyThemeToDock(color);
            }
        });
    }
}

// FLOATING DOCK SYSTEM
// This function handles the floating dock interactions

// Section switching function removed - no longer needed with floating dock

// MODAL SYSTEM
// This function opens a modal overlay
function openModal(modalId) {
    console.log(`Opening modal: ${modalId}`);
    
    // Hide all modals first
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Show the requested modal
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.error(`Modal with ID '${modalId}' not found!`);
        return;
    }
    console.log(`Found modal:`, modal);
    modal.style.display = 'block';
    
    // Show modal overlay and blur library view
    const overlay = document.getElementById('modal-overlay');
    const libraryView = document.getElementById('library-view');
    const mainNav = document.getElementById('main-nav');
    
    overlay.classList.add('active');
    libraryView.classList.add('blurred');
    
    // Disable sidebar when modal is open
    disableSidebar();
    
    // Add click outside to close functionality
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeModal();
        }
    });
}

// Make openModal globally accessible
window.openModal = openModal;

// Simple approach: Add/remove CSS class to disable sidebar
function disableSidebar() {
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
        mainNav.classList.add('sidebar-disabled');
        document.body.classList.add('modal-open');
        console.log('Sidebar disabled with CSS class');
    }
}

function enableSidebar() {
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
        mainNav.classList.remove('sidebar-disabled');
        document.body.classList.remove('modal-open');
        console.log('Sidebar enabled - CSS class removed');
    }
}

// This function closes the modal overlay
function closeModal() {
    console.log('Closing modal...');
    
    const overlay = document.getElementById('modal-overlay');
    const libraryView = document.getElementById('library-view');
    const mainNav = document.getElementById('main-nav');
    
    overlay.classList.remove('active');
    libraryView.classList.remove('blurred');
    
    // Enable sidebar when modal is closed
    enableSidebar();
    
    // Hide all modals
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    
    // Clear all dock item selections
    document.querySelectorAll('.dock-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Reset add modal to default state
    resetAddModal();
    
    // Clear search results and input
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    if (searchInput) {
        searchInput.value = '';
    }
    if (searchResults) {
        searchResults.innerHTML = '<p style="text-align: center; color: #cccccc;">Enter a search term to find items in your library.</p>';
    }
    
    // Clear add modal search results and input
    const addModalSearchInput = document.getElementById('add-modal-search');
    const addModalSearchResults = document.getElementById('add-modal-search-results');
    if (addModalSearchInput) {
        addModalSearchInput.value = '';
    }
    if (addModalSearchResults) {
        addModalSearchResults.innerHTML = '';
    }
}

// ADD NEW ITEM SYSTEM
// This function sets up the form for adding new books/papers
function setupAddForm() {
    console.log('Setting up add form...');
    
    const form = document.getElementById('add-item-form');
    const coverUrlInput = document.getElementById('item-cover-url');
    const coverPreview = document.getElementById('cover-preview');
    const noCover = document.getElementById('no-cover');
    const starRating = document.getElementById('item-rating');
    const ratingDisplay = starRating.querySelector('.rating-display');
    const stars = starRating.querySelectorAll('.star');
    
    // Type tab functionality
    const bookTab = document.getElementById('book-tab');
    const paperTab = document.getElementById('paper-tab');
    const typeInput = document.getElementById('item-type');
    
    // Handle tab switching
    if (bookTab && paperTab) {
        bookTab.addEventListener('click', function() {
            bookTab.classList.add('active');
            paperTab.classList.remove('active');
            typeInput.value = 'Book';
            console.log('✅ Switched to Book mode');
            
            // Re-run search if there's a query
            const currentQuery = searchInput.value.trim();
            if (currentQuery) {
                console.log('🔄 Re-running search for Book tab:', currentQuery);
                performAddModalSearch(currentQuery);
            }
        });
        
        paperTab.addEventListener('click', function() {
            paperTab.classList.add('active');
            bookTab.classList.remove('active');
            typeInput.value = 'Paper';
            console.log('✅ Switched to Paper mode');
            
            // Re-run search if there's a query
            const currentQuery = searchInput.value.trim();
            if (currentQuery) {
                console.log('🔄 Re-running search for Paper tab:', currentQuery);
                performAddModalSearch(currentQuery);
            }
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('add-modal-search');
    const searchBtn = document.getElementById('add-modal-search-btn');
    const searchResults = document.getElementById('add-modal-search-results');
    
    // Search elements are ready
    
    // Simple search function for add modal
    async function performAddModalSearch(query) {
        searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: #ffffff;">🔍 Searching...</div>';
        
        try {
            const results = [];
            
            // Check which tab is active
            const bookTab = document.getElementById('book-tab');
            const paperTab = document.getElementById('paper-tab');
            const bookTabActive = bookTab?.classList.contains('active');
            const paperTabActive = paperTab?.classList.contains('active');
            
            console.log('🔍 Search Debug:', {
                query,
                bookTabActive,
                paperTabActive,
                bookTabClasses: bookTab?.className,
                paperTabClasses: paperTab?.className
            });
            
            if (bookTabActive) {
                // Search Google Books (limited to 5 results)
                console.log('📚 Book tab active - searching Google Books');
                try {
                    const googleBooksResults = await GoogleBooksService.searchBooks(query);
                    results.push(...googleBooksResults.slice(0, 5).map(book => ({
                        ...book,
                        source: 'google_books',
                        searchType: 'book'
                    })));
                } catch (error) {
                    console.error('Google Books search failed:', error);
                }
            } else if (paperTabActive) {
                // Search Semantic Scholar (limited to 5 results)
                console.log('📄 Paper tab active - searching Semantic Scholar');
                try {
                    const semanticScholarResults = await SemanticScholarService.searchPapers(query);
                    console.log('📄 Semantic Scholar returned:', semanticScholarResults);
                    results.push(...semanticScholarResults.slice(0, 5).map(paper => ({
                        ...paper,
                        source: 'semantic_scholar',
                        searchType: 'paper'
                    })));
                } catch (error) {
                    console.error('Semantic Scholar search failed:', error);
                }
            } else {
                console.warn('⚠️ No tab is active! This shouldn\'t happen.');
            }
            
            // Search existing library items (limited to 5 results)
            const existingResults = libraryItems.filter(item => {
            const searchTerm = query.toLowerCase();
            return item.title.toLowerCase().includes(searchTerm) ||
                   (item.author && item.author.toLowerCase().includes(searchTerm)) ||
                   (item.category && item.category.toLowerCase().includes(searchTerm));
        });
        
            results.push(...existingResults.slice(0, 5).map(item => ({
                ...item,
                source: 'library',
                searchType: 'existing'
            })));
            
            // Ensure total results don't exceed 10
            results.splice(10);
            
            displayAddModalSearchResults(results, query);
            
        } catch (error) {
            console.error('Search error:', error);
            searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: #ff6b6b;">❌ Search failed. Please try again.</div>';
        }
    }
    
    // Display search results in add modal - MOVED TO GLOBAL SCOPE
    window.displayAddModalSearchResults = function(results, query) {
        if (results.length === 0) {
            searchResults.innerHTML = '<div style="padding: 1rem; text-align: center; color: rgba(255, 255, 255, 0.7);">🔍 No results found</div>';
            return;
        }
        
        // Add helpful message if we have exactly 10 results (might be more available)
        let moreResultsMessage = '';
        if (results.length === 10) {
            moreResultsMessage = '<div style="padding: 0.5rem 1rem; text-align: center; color: rgba(255, 255, 255, 0.6); font-size: 0.85rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">Showing top 10 results. Try more specific search terms for better results.</div>';
        }
        
        searchResults.innerHTML = results.map((item, index) => {
            const sourceIcon = item.source === 'google_books' ? '📚' : 
                              item.source === 'semantic_scholar' ? '📄' :
                              item.source === 'google_scholar' ? '📄' : '📖';
            const sourceText = item.source === 'google_books' ? 'Google Books' : 
                              item.source === 'semantic_scholar' ? 'Semantic Scholar' :
                              item.source === 'google_scholar' ? 'Google Scholar' : 'Your Library';
            
            return `
                <div class="search-result-item ${item.source === 'google_books' ? 'google-books-result' : item.source === 'library' ? 'local-result' : ''}" data-item-index="${index}">
                    <div class="result-content-wrapper">
                        ${item.coverImage ? `<div class="result-cover"><img src="${item.coverImage}" alt="Cover" /></div>` : ''}
                        <div class="result-text-content">
                            <div class="search-result-header">
                <div class="search-result-title">${item.title}</div>
                                <div class="search-result-source">${sourceIcon} ${sourceText}</div>
                            </div>
                <div class="search-result-author">${item.author || 'Unknown Author'}</div>
                            <div class="search-result-details">
                                ${item.publishingYear || item.year ? `<span class="year">${item.publishingYear || item.year}</span>` : ''}
                                ${item.pageCount ? `<span class="pages">${item.pageCount} pages</span>` : ''}
                                ${item.pages ? `<span class="pages">${item.pages} pages</span>` : ''}
                                ${item.venue ? `<span class="venue">${item.venue}</span>` : ''}
                                ${item.category ? `<span class="category">${item.category}</span>` : ''}
                                ${item.citedBy ? `<span class="citations">📊 ${item.citedBy} citations</span>` : ''}
            </div>
                            ${item.description ? `<div class="search-result-summary">${item.description.substring(0, 150)}...</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('') + moreResultsMessage;
        
        // Add click handlers to search results
        searchResults.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', function() {
                const itemIndex = parseInt(this.getAttribute('data-item-index'));
                const selectedItem = results[itemIndex];
                
                if (selectedItem) {
                    // Fill form with selected item data
                    document.getElementById('item-title').value = selectedItem.title || '';
                    document.getElementById('item-author').value = selectedItem.author || '';
                    
                    // Set type based on source (Semantic Scholar = Paper, Google Books = Book)
                    const itemType = selectedItem.source === 'semantic_scholar' ? 'Paper' : 'Book';
                    document.getElementById('item-type').value = itemType;
                    
                    // Enhanced auto-filling for category
                    const categoryValue = selectedItem.category || 
                                        (selectedItem.categories && selectedItem.categories.length > 0 ? selectedItem.categories[0] : '');
                    document.getElementById('item-category').value = categoryValue;
                    
                    // Extract year from various possible formats
                    let yearValue = '';
                    if (selectedItem.publishingYear) {
                        yearValue = selectedItem.publishingYear;
                    } else if (selectedItem.year) {
                        yearValue = selectedItem.year;
                    } else if (selectedItem.publishedDate) {
                        // Google Books format: "2010-06-07" or "2010" → extract year
                        yearValue = selectedItem.publishedDate.split('-')[0];
                    }
                    document.getElementById('item-publishing-year').value = yearValue;
                    
                    // Enhanced auto-filling for pages
                    const pagesValue = selectedItem.pages || selectedItem.pageCount || '';
                    const pagesInput = document.getElementById('item-pages');
                    pagesInput.value = pagesValue;
                    
                    // Add helpful placeholder for Semantic Scholar papers (no page data)
                    if (selectedItem.source === 'semantic_scholar' && !pagesValue) {
                        pagesInput.placeholder = 'Page count not available - please enter manually';
                    } else {
                        pagesInput.placeholder = '';
                    }
                    
                    // Enhanced auto-filling for language
                    const languageValue = selectedItem.language || 'english';
                    // Convert language code to readable format
                    const languageMap = {
                        'en': 'english',
                        'de': 'german',
                        'fr': 'french',
                        'es': 'spanish',
                        'it': 'italian',
                        'pt': 'portuguese',
                        'ru': 'russian',
                        'zh': 'mandarin',
                        'ja': 'japanese',
                        'ko': 'korean'
                    };
                    const normalizedLanguage = languageMap[languageValue.toLowerCase()] || languageValue.toLowerCase() || 'english';
                    document.getElementById('item-language').value = normalizedLanguage;
                    
                    document.getElementById('item-url').value = selectedItem.link || selectedItem.infoLink || '';
                    
                    // Set cover URL and trigger preview update
                    const coverUrlInput = document.getElementById('item-cover-url');
                    const coverUrl = selectedItem.coverImage || selectedItem.coverUrl || '';
                    coverUrlInput.value = coverUrl;
                    
                    // Manually trigger cover preview update
                    const coverPreview = document.getElementById('cover-preview');
                    const noCover = document.getElementById('no-cover');
                    
                    if (coverUrl) {
                        coverPreview.src = coverUrl;
                        coverPreview.style.display = 'block';
                        noCover.style.display = 'none';
                        
                        coverPreview.onerror = function() {
                            coverPreview.style.display = 'none';
                            noCover.style.display = 'block';
                            noCover.textContent = 'Invalid image URL';
                        };
                    } else if (itemType === 'Paper') {
                        // Generate paper-style preview for papers without covers
                        const paperPreviewHTML = generatePaperPreviewHTML(selectedItem.title || 'Research Paper', selectedItem.author || 'Unknown Author');
                        noCover.innerHTML = paperPreviewHTML;
                        noCover.style.display = 'flex';
                        coverPreview.style.display = 'none';
                    }
                    
                    // Enhanced auto-filling for summary with English default
                    let summaryValue = selectedItem.summary || selectedItem.description || '';
                    // If summary is in German, translate key terms or set English default
                    if (summaryValue.toLowerCase().includes('deutsche') || 
                        summaryValue.toLowerCase().includes('german') ||
                        summaryValue.toLowerCase().includes('buch') ||
                        summaryValue.toLowerCase().includes('autor')) {
                        summaryValue = selectedItem.description || 'No summary available in English';
                    }
                    document.getElementById('item-summary').value = summaryValue;
                    
                    // Set rating if exists
                    if (selectedItem.averageRating) {
                        const ratingStars = document.querySelectorAll('.star');
                        ratingStars.forEach(star => {
                            if (parseFloat(star.getAttribute('data-rating')) === selectedItem.averageRating) {
                                star.classList.add('active');
                            }
                        });
                        ratingDisplay.textContent = `${selectedItem.averageRating} star${selectedItem.averageRating !== 1 ? 's' : ''}`;
                        form.setAttribute('data-rating', selectedItem.averageRating);
                    }
                    
                    // Clear search results
                    searchResults.innerHTML = '';
                    searchInput.value = '';
                    
                    // Show notification
                    const sourceName = selectedItem.source === 'google_books' ? 'Google Books' : 
                                      selectedItem.source === 'semantic_scholar' ? 'Semantic Scholar' :
                                      selectedItem.source === 'google_scholar' ? 'Google Scholar' : 'Library';
                    showNotification(`Item data loaded from ${sourceName}!`, 'success');
                }
            });
        });
    };
    
    // Search functionality with debouncing to prevent constant reloading
    let addModalSearchTimeout;
    searchInput.addEventListener('input', function() {
        clearTimeout(addModalSearchTimeout);
        const query = this.value.trim();
        
        if (query.length >= 3) {
            addModalSearchTimeout = setTimeout(() => {
                performAddModalSearch(query);
            }, 500); // Wait 500ms after user stops typing
        } else {
            searchResults.innerHTML = '';
        }
    });
    
    searchBtn.addEventListener('click', function() {
        const query = searchInput.value.trim();
        if (query.length >= 3) {
            performAddModalSearch(query);
        }
    });
    
    // Scan button functionality
    const scanBtn = document.getElementById('add-modal-scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', function() {
            openCameraModal();
        });
    }
    
    // Search functionality is now handled by the main closeModal function
    
    // Star rating functionality
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseFloat(this.getAttribute('data-rating'));
            
            // Update visual state
            stars.forEach(s => s.classList.remove('active'));
            this.classList.add('active');
            
            // Update display text
            ratingDisplay.textContent = `${rating} star${rating !== 1 ? 's' : ''}`;
            
            // Store rating in hidden input or data attribute
            form.setAttribute('data-rating', rating);
        });
    });
    
    // Cover image preview functionality
    coverUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        
        if (url && isValidImageUrl(url)) {
            coverPreview.src = url;
            coverPreview.style.display = 'block';
            noCover.style.display = 'none';
            
            // Handle image load errors
            coverPreview.onerror = function() {
                coverPreview.style.display = 'none';
                noCover.style.display = 'block';
                noCover.textContent = 'Invalid image URL';
            };
            
            coverPreview.onload = function() {
                noCover.style.display = 'none';
                noCover.textContent = 'No cover image';
            };
        } else {
            coverPreview.style.display = 'none';
            noCover.style.display = 'block';
            noCover.textContent = 'No cover image';
        }
    });
    
    // Add event listener for when the form is submitted
    form.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevents the form from refreshing the page
        
        // Get all the form data
        const formData = new FormData(form);
        
        // Check if we're editing an existing item
        const isEditing = window.currentEditingItem;
        
        // Create the item object with all fields
        const itemData = {
            id: isEditing ? window.currentEditingItem.id : Date.now(), // Keep existing ID or create new
            title: formData.get('title'),
            author: formData.get('author'),
            type: formData.get('type'),
            category: formData.get('category'),
            publishingYear: formData.get('publishingYear'),
            status: formData.get('status'),
            pages: formData.get('pages') ? parseInt(formData.get('pages')) : null,
            difficulty: formData.get('difficulty') ? parseInt(formData.get('difficulty')) : null,
            language: formData.get('language'),
            url: formData.get('url'),
            coverUrl: formData.get('coverUrl'),
            rating: form.getAttribute('data-rating') ? parseFloat(form.getAttribute('data-rating')) : null,
            summary: formData.get('summary'),
            notes: formData.get('notes'),
            dateAdded: isEditing ? window.currentEditingItem.dateAdded : new Date().toISOString(), // Keep original date
            dateModified: new Date().toISOString() // Always update modification date
        };
        
        if (isEditing) {
            // Update existing item
            updateLibraryItem(itemData);
            showNotification('Item updated successfully!', 'success');
        } else {
            // Add new item
            addLibraryItem(itemData);
            showNotification('Item added to your library!', 'success');
        }
        
        // Reset the form and modal state
        resetAddModal();
        
        // Close modal and return to library view
        closeModal();
    });
}

// Function to reset the add modal to its default state
function resetAddModal() {
    const form = document.getElementById('add-item-form');
    const submitBtn = document.querySelector('#add-item-form button[type="submit"]');
    const coverPreview = document.getElementById('cover-preview');
    const noCover = document.getElementById('no-cover');
    const ratingDisplay = document.querySelector('#item-rating .rating-display');
    const stars = document.querySelectorAll('#item-rating .star');
    
    // Show search section and type tabs (in case they were hidden during edit)
    const searchSection = document.querySelector('.search-section');
    const typeTabs = document.querySelector('.type-tabs');
    if (searchSection) searchSection.style.display = 'block';
    if (typeTabs) typeTabs.style.display = 'flex';
    
    // Hide edit title if it exists
    const editTitle = document.querySelector('.edit-title');
    if (editTitle) editTitle.style.display = 'none';
    
    // Clear current editing item
    window.currentEditingItem = null;
    
    // Reset type tabs to Book
    const bookTab = document.getElementById('book-tab');
    const paperTab = document.getElementById('paper-tab');
    if (bookTab && paperTab) {
        bookTab.classList.add('active');
        paperTab.classList.remove('active');
    }
    
    // Reset form
        form.reset();
        form.removeAttribute('data-rating');
    
    // Reset type to Book
    document.getElementById('item-type').value = 'Book';
    
    // Reset submit button text
    submitBtn.textContent = 'Add to Library';
    
    // Reset rating
        stars.forEach(s => s.classList.remove('active'));
        ratingDisplay.textContent = 'No rating';
    
    // Reset cover preview
        coverPreview.style.display = 'none';
    noCover.style.display = 'flex';
        noCover.textContent = 'No cover image';
        
    // Clear editing state
    window.currentEditingItem = null;
    
    // Clear search results
    const searchResults = document.getElementById('add-modal-search-results');
    const searchInput = document.getElementById('add-modal-search');
    if (searchResults) searchResults.innerHTML = '';
    if (searchInput) searchInput.value = '';
}

// Function to update an existing library item
function updateLibraryItem(updatedItem) {
    console.log('Updating library item:', updatedItem);
    
    // Find the item in the library array by ID
    const itemIndex = libraryItems.findIndex(item => item.id === updatedItem.id);
    
    if (itemIndex !== -1) {
        // Update the item
        libraryItems[itemIndex] = updatedItem;
        
        // Save to storage
        saveLibraryData();
        
        // Update the display
        updateLibraryDisplay();
        
        console.log('Item updated successfully');
    } else {
        console.error('Item not found for update');
        showNotification('Error: Item not found for update', 'error');
    }
}

// Helper function to validate image URLs
function isValidImageUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

// This function adds a new item to the library
async function addLibraryItem(item) {
    console.log('➕ Adding new item:', item);
    
    // If user is authenticated, save directly to Supabase
    if (currentUser && supabase) {
        try {
            console.log('💾 Saving directly to Supabase...');
            
            const dbItem = {
                user_id: currentUser.id,
                title: item.title || 'Untitled',
                author: item.author || null,
                type: (item.type || 'book').toLowerCase(), // Ensure lowercase for database constraint
                category: item.category || null,
                status: item.status || null,
                language: item.language || null,
                url: item.url || null,
                summary: item.summary || null,
                notes: item.notes || null,
                publishing_year: item.publishingYear || null,
                cover_url: item.coverUrl || item.coverImage || null,
                cover_image: item.coverUrl || item.coverImage || null
            };
            
            // Add numeric fields with conversion
            if (item.publishingYear) {
                const yearNum = parseInt(item.publishingYear);
                if (!isNaN(yearNum)) dbItem.year = yearNum;
            }
            if (item.pages) {
                const pagesNum = parseInt(item.pages);
                if (!isNaN(pagesNum)) dbItem.pages = pagesNum;
            }
            if (item.rating) {
                const ratingNum = parseFloat(item.rating);
                if (!isNaN(ratingNum)) dbItem.rating = ratingNum;
            }
            if (item.difficulty) {
                const diffNum = parseInt(item.difficulty);
                if (!isNaN(diffNum) && diffNum >= 1 && diffNum <= 5) {
                    dbItem.difficulty = diffNum;
                }
            }
            
            console.log('💾 Inserting item to Supabase:', dbItem);
            
            const { data: insertedData, error } = await supabase
                .from('libraries')
                .insert([dbItem])
                .select();
            
            if (error) {
                console.error('❌ Supabase insert error:', error);
                throw error;
            }
            
            console.log('✅ Item saved to Supabase!', insertedData);
            
            // Add to local array with database ID
            if (insertedData && insertedData[0]) {
                item.id = insertedData[0].id;
            }
            libraryItems.push(item);
            
        } catch (error) {
            console.error('Failed to save to Supabase:', error);
            showNotification('Error saving item: ' + error.message, 'error');
            // Don't add to local array if database save failed
            return;
        }
    } else {
        // No authentication, use localStorage
        console.log('💾 No auth, saving to localStorage');
        libraryItems.push(item);
        localStorage.setItem('digitalLibrary', JSON.stringify(libraryItems));
    }
    
    // Update the display
    updateLibraryDisplay();
    
    console.log('✅ Item added successfully!');
}

// Function to delete an item from the library
async function deleteLibraryItem(itemId) {
    console.log('🗑️ Delete function called with ID:', itemId);
    console.log('🗑️ Current user:', currentUser);
    console.log('🗑️ Supabase client:', supabase);
    
    // Find the item
    const itemIndex = libraryItems.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        console.error('Item not found:', itemId);
        showNotification('Error: Item not found.', 'error');
        return;
    }
    
    const deletedItem = libraryItems[itemIndex];
    
    // If user is authenticated, delete from Supabase
    if (currentUser && supabase) {
        try {
            console.log('🗑️ Deleting from Supabase...');
            
            const { error } = await supabase
                .from('libraries')
                .delete()
                .eq('id', itemId)
                .eq('user_id', currentUser.id); // Extra safety check
            
            if (error) {
                console.error('❌ Supabase delete error:', error);
                throw error;
            }
            
            console.log('✅ Item deleted from Supabase!');
            
        } catch (error) {
            console.error('Failed to delete from Supabase:', error);
            showNotification('Error deleting item: ' + error.message, 'error');
            return;
        }
    } else {
        // No authentication, use localStorage
        console.log('🗑️ No auth, updating localStorage');
    }
    
    // Remove from local array
    libraryItems.splice(itemIndex, 1);
    
    // Save to localStorage as backup
    if (!currentUser) {
        localStorage.setItem('digitalLibrary', JSON.stringify(libraryItems));
    }
    
    // Update the display
    updateLibraryDisplay();
    
    // Show notification
    showNotification(`"${deletedItem.title}" has been deleted.`, 'info');
}

// Make deleteLibraryItem globally accessible
window.deleteLibraryItem = deleteLibraryItem;

// Test function to verify delete functionality
window.testDelete = function() {
    console.log('🧪 Testing delete function...');
    if (libraryItems.length > 0) {
        const firstItem = libraryItems[0];
        console.log('🧪 Deleting first item:', firstItem.title);
        deleteLibraryItem(firstItem.id);
    } else {
        console.log('🧪 No items to delete');
    }
};

// Function to clear all library data (including dummy data)
function clearAllLibraryData() {
    if (confirm('Are you sure you want to clear ALL library data? This cannot be undone.')) {
        libraryItems = [];
        localStorage.removeItem('digitalLibrary');
        updateLibraryDisplay();
        showNotification('All library data cleared successfully!', 'info');
        console.log('All library data cleared');
    }
}

// Make clearAllLibraryData globally accessible
window.clearAllLibraryData = clearAllLibraryData;

// Function to delete all items except "Attention Is All You Need"
function deleteAllExceptAttention() {
    if (confirm('Are you sure you want to delete all items except "Attention Is All You Need"? This cannot be undone.')) {
        const originalLength = libraryItems.length;
        libraryItems = libraryItems.filter(item => 
            item.title.toLowerCase().includes('attention is all you need')
        );
        
        const deletedCount = originalLength - libraryItems.length;
        
        // Save the updated data
        saveLibraryData();
        
        // Update the display
        updateLibraryDisplay();
        
        // Show notification
        showNotification(`Deleted ${deletedCount} items. Kept "Attention Is All You Need".`, 'info');
        console.log(`Deleted ${deletedCount} items, kept ${libraryItems.length} items`);
    }
}

// Make deleteAllExceptAttention globally accessible
window.deleteAllExceptAttention = deleteAllExceptAttention;

// SEARCH SYSTEM
// This function sets up the search functionality
function setupSearch() {
    console.log('Setting up search system...');
    
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const searchResults = document.getElementById('search-results');
    
    // Initialize search results with placeholder text
    if (searchResults) {
        searchResults.innerHTML = '<p style="text-align: center; color: #cccccc;">Enter a search term to find items in your library.</p>';
    }
    
    // Search when button is clicked
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const searchTerm = searchInput.value.toLowerCase().trim();
            performSearch(searchTerm, searchResults);
        });
    }
    
    // Search as you type (with a small delay)
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const searchTerm = this.value.toLowerCase().trim();
                performSearch(searchTerm, searchResults);
            }, 300); // Wait 300ms after user stops typing
        });
    }
}

// This function performs the actual search
function performSearch(searchTerm, resultsContainer) {
    console.log(`Searching for: ${searchTerm}`);
    
    if (!resultsContainer) {
        resultsContainer = document.getElementById('search-results');
    }
    
    if (!searchTerm) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #cccccc;">Enter a search term to find items in your library.</p>';
        return;
    }
    
    // Filter library items based on search term
    const results = libraryItems.filter(item => {
        return item.title.toLowerCase().includes(searchTerm) ||
               item.author.toLowerCase().includes(searchTerm) ||
               item.category.toLowerCase().includes(searchTerm) ||
               item.type.toLowerCase().includes(searchTerm);
    });
    
    // Display results
    displaySearchResults(results, resultsContainer);
}

// This function displays search results
function displaySearchResults(results, container) {
    if (results.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #cccccc;">No items found matching your search.</p>';
        return;
    }
    
    // Create HTML for each result
    const resultsHTML = results.map(item => `
        <div class="result-item">
            <h3>${item.title}</h3>
            <p><strong>Author:</strong> ${item.author || 'Unknown'}</p>
            <p><strong>Type:</strong> ${item.type}</p>
            <p><strong>Category:</strong> ${item.category || 'Uncategorized'}</p>
            ${item.year ? `<p><strong>Year:</strong> ${item.year}</p>` : ''}
            ${item.notes ? `<p><strong>Notes:</strong> ${item.notes}</p>` : ''}
            <p><strong>Added:</strong> ${new Date(item.dateAdded).toLocaleDateString()}</p>
        </div>
    `).join('');
    
    container.innerHTML = resultsHTML;
}

// PLANET VISUALIZATION SYSTEM
// This function sets up the interactive planet with cursor following

// This function updates the planet visualization with your library items
function updateLibraryDisplay() {
    console.log('Updating library display...');
    
    // Check current view and update accordingly
    const currentView = localStorage.getItem('currentView') || 'masonry';
    
    if (currentView === 'masonry') {
        updateMasonryDisplay();
        return;
    }
    
    const planet = document.getElementById('knowledge-planet');
    
    // Clear existing particles
    planet.innerHTML = '';
    
    // Add CSS class based on whether planet is empty
    if (libraryItems.length === 0) {
        planet.classList.add('empty');
        planet.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #00ff00; font-size: 1.2rem; padding: 2rem; font-family: \'Orbitron\', monospace; text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);">Click the + button below<br>to start building your library!</div>';
        return;
    } else {
        planet.classList.remove('empty');
    }
    
    // Create particles for each library item
    libraryItems.forEach((item, index) => {
        createPlanetParticle(item, index, planet);
    });
    
    // Add click event to the planet
    planet.addEventListener('click', function(e) {
        // Only trigger if clicking on the planet itself, not on particles
        if (e.target === planet) {
            if (libraryItems.length > 0) {
                showNotification(`Your library contains ${libraryItems.length} items!`, 'info');
            } else {
                showNotification('Click "Add New" to start building your library!', 'info');
            }
        }
    });
    
    // Planet statistics removed - no longer needed since planet-info section was removed
}

// NEW SIMPLIFIED PLANET PARTICLE CREATION
// This function creates a particle for the planet view with proper paper/book handling
function createPlanetParticle(item, index, planet) {
    // Create particle element
    const particle = document.createElement('div');
    particle.className = 'planet-particle cover-particle';
    
    // Calculate position using spherical distribution
    const totalItems = libraryItems.length;
    const phi = Math.acos(1 - 2 * (index + 0.5) / totalItems);
    const theta = Math.PI * (1 + Math.sqrt(5)) * index;
    
    // Convert to Cartesian coordinates
    const radius = 200;
    const x = radius * Math.sin(phi) * Math.cos(theta) + 225;
    const y = radius * Math.sin(phi) * Math.sin(theta) + 225;
    
    // Set position
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.animationDelay = `${index * 0.1}s`;
    
    // Create content based on item type
    const itemType = item.type ? item.type.toLowerCase() : 'book';
    const isPaper = itemType === 'paper';
    const hasCover = (item.coverImage || item.coverUrl) && (item.coverImage || item.coverUrl).trim() !== '';
    
    if (hasCover) {
        // Has cover image
        const img = document.createElement('img');
        img.src = item.coverImage || item.coverUrl;
        img.alt = `${item.title} cover`;
        img.className = 'cover-image';
        img.onerror = function() {
            this.style.display = 'none';
            createFallbackContent();
        };
        particle.appendChild(img);
    } else {
        // No cover image
        createFallbackContent();
    }
    
    function createFallbackContent() {
        if (isPaper) {
            // Create paper-style content
            const paperDiv = document.createElement('div');
            paperDiv.style.cssText = `
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                border: 1px solid #dee2e6;
                border-radius: 4px;
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-family: 'Times New Roman', serif;
                color: #333;
                font-size: 0.7rem;
                text-align: center;
                padding: 0.3rem;
                box-sizing: border-box;
            `;
            
            const title = document.createElement('div');
            title.textContent = item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title;
            title.style.cssText = 'font-weight: bold; margin-bottom: 0.2rem; line-height: 1.1;';
            
            const author = document.createElement('div');
            author.textContent = item.author || 'Unknown';
            author.style.cssText = 'color: #666; margin-bottom: 0.1rem; font-size: 0.6rem;';
            
            const type = document.createElement('div');
            type.textContent = 'Paper';
            type.style.cssText = 'color: #888; font-size: 0.5rem;';
            
            paperDiv.appendChild(title);
            paperDiv.appendChild(author);
            paperDiv.appendChild(type);
            
            particle.appendChild(paperDiv);
        } else {
            // Create book icon
            const iconDiv = document.createElement('div');
            iconDiv.className = 'fallback-icon';
            iconDiv.textContent = '📚';
            iconDiv.style.display = 'flex';
            particle.appendChild(iconDiv);
        }
    }
    
    // Add tooltip
    particle.title = `${item.title} - ${item.author || 'Unknown Author'} (${itemType})`;
    
    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'planet-delete-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete item';
    deleteBtn.onclick = function(e) {
        e.stopPropagation();
        deleteLibraryItem(item.id);
    };
    particle.appendChild(deleteBtn);
    
    // Add click event
    particle.addEventListener('click', function(e) {
        e.stopPropagation();
        openEditModal(item);
    });
    
    // Add magnet effect
    let originalX = x;
    let originalY = y;
    
    particle.addEventListener('mouseenter', function() {
        const mouseX = event.clientX - 450; // Center of planet
        const mouseY = event.clientY - 225;
        const distance = Math.sqrt(mouseX * mouseX + mouseY * mouseY);
        
        if (distance < 300) {
            const angle = Math.atan2(mouseY, mouseX);
            const newX = originalX + Math.cos(angle) * 20;
            const newY = originalY + Math.sin(angle) * 20;
            
            particle.style.transform = `translate(${newX - originalX}px, ${newY - originalY}px)`;
            particle.style.transition = 'transform 0.3s ease';
        }
    });
    
    particle.addEventListener('mouseleave', function() {
        particle.style.transform = 'translate(0px, 0px)';
        particle.style.transition = 'transform 0.3s ease';
    });
    
    // Add to planet
    planet.appendChild(particle);
}

// OLD FUNCTION - KEEPING FOR REFERENCE
// This function creates a particle (book/paper representation) for each library item
function createParticleForItem(item, index, planet) {
    // Create a particle element
    const particle = document.createElement('div');
    particle.className = `planet-particle cover-particle`;
    
    // Calculate position using spherical distribution for more natural planet formation
    const totalItems = libraryItems.length;
    const phi = Math.acos(1 - 2 * (index + 0.5) / totalItems); // Golden ratio distribution
    const theta = Math.PI * (1 + Math.sqrt(5)) * index; // Golden angle
    
    // Convert to Cartesian coordinates with increased spacing
    const radius = 200; // Increased distance from center for better spacing
    const x = radius * Math.sin(phi) * Math.cos(theta) + 225; // 225 is half the planet width
    const y = radius * Math.sin(phi) * Math.sin(theta) + 225; // 225 is half the planet height
    
    // Set position
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    
    // Add animation delay for staggered appearance
    particle.style.animationDelay = `${index * 0.1}s`;
    
    // Create cover image or fallback
    const coverImg = document.createElement('img');
    const fallbackIcon = document.createElement('div');
    fallbackIcon.className = 'fallback-icon';
    
    // Set up cover image
    const hasCover = (item.coverImage || item.coverUrl) && (item.coverImage || item.coverUrl).trim() !== '';
    const itemType = item.type ? item.type.toLowerCase() : 'book';
    const isPaper = itemType === 'paper';
    
    if (hasCover) {
        coverImg.src = item.coverImage || item.coverUrl;
        coverImg.alt = `${item.title} cover`;
        coverImg.className = 'cover-image';
        
        // Handle image load errors
        coverImg.onerror = function() {
            this.style.display = 'none';
            if (isPaper) {
                createPaperFallback();
            } else {
                fallbackIcon.style.display = 'flex';
            }
        };
        
        // Handle successful image load
        coverImg.onload = function() {
            this.style.display = 'block';
            fallbackIcon.style.display = 'none';
        };
        
        particle.appendChild(coverImg);
    } else {
        // No cover image, show fallback
        if (isPaper) {
            createPaperFallback();
        } else {
    const typeIcons = {
        'book': '📚',
        'paper': '📄',
        'article': '📰',
        'report': '📊'
    };
            fallbackIcon.textContent = typeIcons[itemType] || '📖';
            fallbackIcon.style.display = 'flex';
            particle.appendChild(fallbackIcon);
        }
    }
    
    function createPaperFallback() {
        const paperDiv = document.createElement('div');
        paperDiv.style.cssText = `
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            border: 1px solid #dee2e6;
            border-radius: 4px;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: 'Times New Roman', serif;
            color: #333;
            font-size: 0.8rem;
            text-align: center;
            padding: 0.5rem;
            box-sizing: border-box;
        `;
        
        const title = document.createElement('div');
        title.textContent = item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title;
        title.style.cssText = 'font-weight: bold; margin-bottom: 0.3rem; line-height: 1.2;';
        
        const author = document.createElement('div');
        author.textContent = item.author || 'Unknown';
        author.style.cssText = 'color: #666; margin-bottom: 0.2rem; font-size: 0.7rem;';
        
        const type = document.createElement('div');
        type.textContent = 'Research Paper';
        type.style.cssText = 'color: #888; font-size: 0.6rem;';
        
        paperDiv.appendChild(title);
        paperDiv.appendChild(author);
        paperDiv.appendChild(type);
        
        particle.appendChild(paperDiv);
    }
    
    // Add tooltip with item info
    particle.title = `${item.title} - ${item.author || 'Unknown Author'} (${itemType})`;
    
    // Add click event to edit item
    particle.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevents planet click event
        openEditModal(item);
    });
    
    // Add magnet-like cursor interaction
    let isMouseOver = false;
    let originalX = x;
    let originalY = y;
    
    // Store original position for reset
    particle.dataset.originalX = originalX;
    particle.dataset.originalY = originalY;
    
    // Mouse enter effect
    particle.addEventListener('mouseenter', function() {
        isMouseOver = true;
        this.style.zIndex = '100';
        this.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.3)';
        this.style.filter = 'brightness(1.2)';
    });
    
    // Mouse leave effect
    particle.addEventListener('mouseleave', function() {
        isMouseOver = false;
        this.style.transform = 'scale(1)';
        this.style.zIndex = '1';
        this.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
        this.style.filter = 'brightness(1)';
        
        // Reset to original position
        this.style.left = originalX + 'px';
        this.style.top = originalY + 'px';
    });
    
    // Mouse move effect - magnet attraction
    document.addEventListener('mousemove', function(e) {
        if (!isMouseOver) return;
        
        const particleRect = particle.getBoundingClientRect();
        const particleCenterX = particleRect.left + particleRect.width / 2;
        const particleCenterY = particleRect.top + particleRect.height / 2;
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        // Calculate distance from mouse to particle center
        const deltaX = mouseX - particleCenterX;
        const deltaY = mouseY - particleCenterY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Magnet effect parameters
        const maxDistance = 100; // Maximum distance for magnet effect
        const maxPull = 30; // Maximum pixels to pull the particle
        
        if (distance < maxDistance) {
            // Calculate pull intensity (stronger when closer)
            const intensity = Math.max(0, 1 - (distance / maxDistance));
            const pullDistance = maxPull * intensity * intensity; // Quadratic falloff
            
            // Calculate pull direction
            const pullX = (deltaX / distance) * pullDistance;
            const pullY = (deltaY / distance) * pullDistance;
            
            // Apply the pull
            const newX = originalX + pullX;
            const newY = originalY + pullY;
            
            particle.style.left = newX + 'px';
            particle.style.top = newY + 'px';
            particle.style.transform = `scale(${1 + intensity * 0.2})`; // Slight scale increase
        }
    });
    
    // Add to planet
    planet.appendChild(particle);
}

// Planet stats function removed - no longer needed since planet-info section was removed

// Categories system removed - no longer needed

// STATISTICS SYSTEM
// This function displays library statistics
function displayStatistics() {
    console.log('Displaying statistics...');
    
    const container = document.getElementById('stats-content');
    
    // Calculate statistics
    const totalItems = libraryItems.length;
    const itemsByType = libraryItems.reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
    }, {});
    
    const itemsByYear = libraryItems.reduce((acc, item) => {
        if (item.year) {
            acc[item.year] = (acc[item.year] || 0) + 1;
        }
        return acc;
    }, {});
    
    const recentItems = libraryItems
        .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
        .slice(0, 5);
    
    // Create statistics HTML
    const statsHTML = `
        <div class="stat-item">
            <h3>Total Items</h3>
            <p style="font-size: 2rem; color: #00d4ff; margin: 1rem 0;">${totalItems}</p>
        </div>
        <div class="stat-item">
            <h3>By Type</h3>
            ${Object.entries(itemsByType).map(([type, count]) => 
                `<div style="margin: 0.5rem 0;">${type}: ${count}</div>`
            ).join('')}
        </div>
        <div class="stat-item">
            <h3>Recent Additions</h3>
            ${recentItems.map(item => 
                `<div style="font-size: 0.9rem; margin: 0.5rem 0;">${item.title}</div>`
            ).join('')}
        </div>
    `;
    
    container.innerHTML = statsHTML;
}

// UTILITY FUNCTIONS
// This function shows notifications to the user
function showNotification(message, type = 'info') {
    console.log(`Notification (${type}): ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 6px;
        color: #0a0a0a;
        font-weight: bold;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    const colors = {
        'success': '#00ff88',
        'error': '#ff6b6b',
        'info': '#00d4ff'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// This function shows detailed information about an item
// Function to open edit modal with pre-filled data
function openEditModal(item) {
    console.log('Opening edit modal for:', item);
    
    // Close search overlay if it's active
    const overlaySearch = document.getElementById('overlay-search');
    if (overlaySearch && overlaySearch.classList.contains('active')) {
        closeOverlaySearch();
    }
    
    // Store the item being edited
    window.currentEditingItem = item;
    
    // Use the proper modal system
    openModal('add-modal');
    
    // Hide search section and type tabs when editing
    const searchSection = document.querySelector('.search-section');
    const typeTabs = document.querySelector('.type-tabs');
    if (searchSection) searchSection.style.display = 'none';
    if (typeTabs) typeTabs.style.display = 'none';
    
    // Update modal header to show "Edit Item"
    const modalHeader = document.querySelector('#add-modal .modal-header');
    let editTitle = modalHeader.querySelector('.edit-title');
    if (!editTitle) {
        editTitle = document.createElement('h2');
        editTitle.className = 'edit-title';
        editTitle.style.margin = '0';
        editTitle.style.color = '#ffffff';
        modalHeader.insertBefore(editTitle, modalHeader.firstChild);
    }
    editTitle.textContent = 'Edit Item';
    editTitle.style.display = 'block';
    
    // Update submit button
    const submitBtn = document.querySelector('#add-item-form button[type="submit"]');
    submitBtn.textContent = 'Update Item';
    
    // Pre-fill all form fields
    prefillEditForm(item);
}

// Function to pre-fill the form with existing item data
function prefillEditForm(item) {
    // Basic fields
    document.getElementById('item-title').value = item.title || '';
    document.getElementById('item-author').value = item.author || '';
    document.getElementById('item-type').value = item.type || 'Book';
    document.getElementById('item-category').value = item.category || '';
    document.getElementById('item-notes').value = item.notes || '';
    
    // Set the correct type tab
    const bookTab = document.getElementById('book-tab');
    const paperTab = document.getElementById('paper-tab');
    if (bookTab && paperTab) {
        const itemType = item.type ? item.type.toLowerCase() : 'book';
        if (itemType === 'paper') {
            paperTab.classList.add('active');
            bookTab.classList.remove('active');
    } else {
            bookTab.classList.add('active');
            paperTab.classList.remove('active');
        }
    }
    
    // Extended fields (if they exist)
    if (item.publishingYear) document.getElementById('item-publishing-year').value = item.publishingYear;
    if (item.status) document.getElementById('item-status').value = item.status;
    if (item.pages) document.getElementById('item-pages').value = item.pages;
    if (item.difficulty) document.getElementById('item-difficulty').value = item.difficulty;
    if (item.language) document.getElementById('item-language').value = item.language;
    if (item.url) document.getElementById('item-url').value = item.url;
    if (item.coverUrl) document.getElementById('item-cover-url').value = item.coverUrl;
    if (item.summary) document.getElementById('item-summary').value = item.summary;
    
    // Handle rating
    if (item.rating) {
        const stars = document.querySelectorAll('#item-rating .star');
        const ratingDisplay = document.querySelector('#item-rating .rating-display');
        
        stars.forEach(star => {
            star.classList.remove('active');
            if (parseFloat(star.getAttribute('data-rating')) === item.rating) {
                star.classList.add('active');
            }
        });
        
        ratingDisplay.textContent = `${item.rating} star${item.rating !== 1 ? 's' : ''}`;
        document.getElementById('add-item-form').setAttribute('data-rating', item.rating);
    }
    
    // Handle cover image preview
    const coverPreview = document.getElementById('cover-preview');
    const noCover = document.getElementById('no-cover');
    
    if (item.coverUrl || item.coverImage) {
        const coverUrl = item.coverUrl || item.coverImage;
        coverPreview.src = coverUrl;
        coverPreview.style.display = 'block';
        noCover.style.display = 'none';
        
        // Handle image load errors
        coverPreview.onerror = function() {
            console.error('Failed to load cover image:', coverUrl);
            coverPreview.style.display = 'none';
            noCover.style.display = 'flex';
            
            // If it's a paper, show paper preview instead of error
            const itemType = item.type ? item.type.toLowerCase() : 'book';
            if (itemType === 'paper') {
                const paperPreviewHTML = generatePaperPreviewHTML(item.title || 'Research Paper', item.author || 'Unknown Author');
                noCover.innerHTML = paperPreviewHTML;
            } else {
                noCover.textContent = 'Failed to load cover image';
            }
        };
        
        coverPreview.onload = function() {
            console.log('Cover image loaded successfully:', coverUrl);
        };
    } else {
        coverPreview.style.display = 'none';
        noCover.style.display = 'flex';
        
        // If it's a paper without cover, show paper-style preview
        const itemType = item.type ? item.type.toLowerCase() : 'book';
        if (itemType === 'paper') {
            const paperPreviewHTML = generatePaperPreviewHTML(item.title || 'Research Paper', item.author || 'Unknown Author');
            noCover.innerHTML = paperPreviewHTML;
        } else {
            noCover.textContent = 'No cover image';
        }
    }
}

function showItemDetails(item) {
    // This function is now replaced by openEditModal
    // Keeping it for backward compatibility but redirecting to edit modal
    openEditModal(item);
}

// DATA STORAGE FUNCTIONS
// This function is now a no-op since we save items individually
// Kept for backward compatibility with existing code
async function saveLibraryData() {
    console.log('💾 saveLibraryData called (legacy - items are now saved individually)');
    
    // If not using Supabase, fall back to localStorage
    if (!currentUser || !supabase) {
        console.log('💾 Saving to localStorage as fallback');
        localStorage.setItem('digitalLibrary', JSON.stringify(libraryItems));
    }
    return; // Items are saved individually in addLibraryItem now
    
    console.log('💾 currentUser:', currentUser);
    console.log('💾 libraryItems count:', libraryItems.length);
    
    // Try Supabase first if user is authenticated
    if (currentUser) {
        try {
            console.log('💾 Saving library data to Supabase for user:', currentUser.email);
            console.log('💾 User ID:', currentUser.id);
            
            // Delete existing items for this user
            const { error: deleteError } = await supabase
                .from('libraries')
                .delete()
                .eq('user_id', currentUser.id);
                
            if (deleteError) {
                console.error('Error deleting existing items:', deleteError);
                throw deleteError;
            }
            
            // Insert new items
            if (libraryItems.length > 0) {
                console.log(`💾 Preparing to insert ${libraryItems.length} items...`);
                
                const itemsToSave = libraryItems.map(item => {
                    const dbItem = {
                        user_id: currentUser.id,
                        title: item.title || 'Untitled',
                        author: item.author || null,
                        type: item.type || 'book',
                        category: item.category || null,
                        status: item.status || null,
                        language: item.language || null,
                        url: item.url || null,
                        summary: item.summary || null,
                        notes: item.notes || null
                    };
                    
                    // Add year - handle both string and number
                    if (item.publishingYear) {
                        const yearNum = parseInt(item.publishingYear);
                        if (!isNaN(yearNum)) {
                            dbItem.year = yearNum;
                        }
                        dbItem.publishing_year = item.publishingYear;
                    }
                    
                    // Add pages - convert to integer
                    if (item.pages) {
                        const pagesNum = parseInt(item.pages);
                        if (!isNaN(pagesNum)) {
                            dbItem.pages = pagesNum;
                        }
                    }
                    
                    // Add rating - convert to decimal
                    if (item.rating) {
                        const ratingNum = parseFloat(item.rating);
                        if (!isNaN(ratingNum)) {
                            dbItem.rating = ratingNum;
                        }
                    }
                    
                    // Add difficulty - convert to integer (1-5)
                    if (item.difficulty) {
                        const diffNum = parseInt(item.difficulty);
                        if (!isNaN(diffNum) && diffNum >= 1 && diffNum <= 5) {
                            dbItem.difficulty = diffNum;
                        }
                    }
                    
                    // Add cover images
                    if (item.coverUrl || item.coverImage) {
                        dbItem.cover_url = item.coverUrl || item.coverImage;
                        dbItem.cover_image = item.coverUrl || item.coverImage;
                    }
                    
                    return dbItem;
                });
                
                console.log(`💾 Items to save:`, itemsToSave);
                
                const { data: insertedData, error: insertError } = await supabase
                    .from('libraries')
                    .insert(itemsToSave)
                    .select();
                    
                if (insertError) {
                    console.error('❌ Error inserting items:', insertError);
                    console.error('❌ Error code:', insertError.code);
                    console.error('❌ Error message:', insertError.message);
                    console.error('❌ Error details:', insertError.details);
                    throw insertError;
                }
                
                console.log(`✅ Insert successful! Inserted data:`, insertedData);
            }
            
            console.log(`✅ Successfully saved ${libraryItems.length} items to Supabase for user ${currentUser.email}`);
            console.log(`✅ Save complete! Data is now in database.`);
            return; // Success, exit early
        } catch (error) {
            console.error('Failed to save to Supabase, falling back to localStorage:', error);
            // Fall through to localStorage fallback
        }
    }
    
    // Fallback to localStorage (works even without authentication)
    try {
        console.log('Saving library data to localStorage...');
        localStorage.setItem('digitalLibrary', JSON.stringify(libraryItems));
        console.log(`Successfully saved ${libraryItems.length} items to localStorage`);
    } catch (error) {
        console.error('Failed to save to localStorage:', error);
        showNotification('Failed to save library data', 'error');
    }
}

// This function loads library data from Supabase database
async function loadLibraryData() {
    // Try Supabase first if user is authenticated
    if (currentUser) {
        try {
            console.log('Loading library data from Supabase for user:', currentUser.email);
            console.log('User ID:', currentUser.id);
            
            const { data, error } = await supabase
                .from('libraries')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('date_added', { ascending: false });
                
            if (error) {
                console.error('Error loading library data:', error);
                throw error;
            }
            
            // Transform database format back to app format
            libraryItems = (data || []).map(item => ({
                id: item.id,
                title: item.title,
                author: item.author || '',
                type: item.type,
                publishingYear: item.publishing_year || item.year?.toString() || '',
                pages: item.pages?.toString() || '',
                rating: item.rating?.toString() || '0',
                difficulty: item.difficulty?.toString() || 'medium',
                language: item.language || '',
                category: item.category || '',
                status: item.status || 'unread',
                summary: item.summary || '',
                coverUrl: item.cover_url || item.cover_image || '',
                coverImage: item.cover_url || item.cover_image || '',
                isbn: item.isbn || '',
                doi: item.doi || '',
                url: item.url || ''
            }));
            
            console.log(`✅ Loaded ${libraryItems.length} items from Supabase for user ${currentUser.email}`);
            
            // Clear localStorage to avoid confusion
            localStorage.removeItem('digitalLibrary');
            console.log('Cleared localStorage - now using Supabase only');
            
            return; // Success, exit early
        } catch (error) {
            console.error('Failed to load from Supabase, falling back to localStorage:', error);
            // Fall through to localStorage fallback
        }
    }
    
    // Fallback to localStorage (works even without authentication)
    try {
        console.log('Loading library data from localStorage...');
        const savedData = localStorage.getItem('digitalLibrary');
        if (savedData) {
            libraryItems = JSON.parse(savedData);
            console.log(`Loaded ${libraryItems.length} items from localStorage`);
        } else {
            libraryItems = [];
            console.log('No saved data found in localStorage');
        }
    } catch (error) {
        console.error('Failed to load from localStorage:', error);
        showNotification('Failed to load library data', 'error');
        libraryItems = [];
    }
}

// Function to force load dummy data (useful for testing)
function forceLoadDummyData() {
    console.log('Force loading dummy data...');
    loadDummyData();
    updateLibraryDisplay();
    showNotification('Dummy data loaded successfully!', 'success');
}

// Function to clear the library
function clearLibrary() {
    if (confirm('Are you sure you want to clear all library data?')) {
        console.log('Clearing library...');
        libraryItems = [];
        localStorage.removeItem('digitalLibrary');
        updateLibraryDisplay();
        showNotification('Library cleared successfully!', 'info');
    }
}

// This function loads dummy data to demonstrate the planet visualization
function loadDummyData() {
    console.log('Loading dummy data for demonstration...');
    
    const dummyItems = [
        // Books
        {
            id: 1,
            title: "The Design of Everyday Things",
            author: "Don Norman",
            type: "Book",
            category: "Design",
            publishingYear: 2013,
            status: "finished",
            pages: 368,
            difficulty: 4,
            language: "english",
            rating: 4.5,
            summary: "A comprehensive guide to understanding how design affects our daily interactions with objects and systems.",
            notes: "Essential reading for understanding user experience design principles.",
            dateAdded: "2024-01-15T10:30:00Z"
        },
        {
            id: 2,
            title: "Clean Code",
            author: "Robert C. Martin",
            type: "Book",
            category: "Programming",
            publishingYear: 2008,
            status: "reading",
            pages: 464,
            difficulty: 6,
            language: "english",
            rating: 4.0,
            summary: "A handbook of agile software craftsmanship with practical advice on writing clean, maintainable code.",
            notes: "Great insights on writing maintainable and readable code.",
            dateAdded: "2024-01-20T14:15:00Z"
        },
        {
            id: 3,
            title: "Thinking, Fast and Slow",
            author: "Daniel Kahneman",
            type: "Book",
            category: "Psychology",
            publishingYear: 2011,
            status: "not-started",
            pages: 499,
            difficulty: 7,
            language: "english",
            rating: null,
            summary: "An exploration of the two systems that drive the way we think and make decisions.",
            notes: "Fascinating exploration of human decision-making processes.",
            dateAdded: "2024-02-01T09:45:00Z"
        },
        {
            id: 4,
            title: "Atomic Habits",
            author: "James Clear",
            type: "Book",
            category: "Self-Improvement",
            year: 2018,
            notes: "Practical framework for building good habits and breaking bad ones.",
            dateAdded: "2024-02-10T16:20:00Z"
        },
        {
            id: 5,
            title: "The Lean Startup",
            author: "Eric Ries",
            type: "Book",
            category: "Business",
            year: 2011,
            notes: "Revolutionary approach to building and managing startups.",
            dateAdded: "2024-02-15T11:30:00Z"
        },
        {
            id: 6,
            title: "Sapiens",
            author: "Yuval Noah Harari",
            type: "Book",
            category: "History",
            year: 2014,
            notes: "Thought-provoking history of humankind from the Stone Age to present.",
            dateAdded: "2024-02-20T13:45:00Z"
        },
        
        // Research Papers
        {
            id: 7,
            title: "Attention Is All You Need",
            author: "Vaswani et al.",
            type: "Paper",
            category: "Machine Learning",
            year: 2017,
            notes: "Groundbreaking paper introducing the Transformer architecture.",
            dateAdded: "2024-03-01T08:15:00Z"
        },
        {
            id: 8,
            title: "Deep Residual Learning for Image Recognition",
            author: "He et al.",
            type: "Paper",
            category: "Computer Vision",
            year: 2016,
            notes: "ResNet architecture that revolutionized deep learning.",
            dateAdded: "2024-03-05T10:30:00Z"
        },
        {
            id: 9,
            title: "BERT: Pre-training of Deep Bidirectional Transformers",
            author: "Devlin et al.",
            type: "Paper",
            category: "Natural Language Processing",
            year: 2018,
            notes: "Bidirectional encoder representations from transformers.",
            dateAdded: "2024-03-10T14:20:00Z"
        },
        {
            id: 10,
            title: "Generative Adversarial Networks",
            author: "Goodfellow et al.",
            type: "Paper",
            category: "Machine Learning",
            year: 2014,
            notes: "Foundational paper on GANs and adversarial training.",
            dateAdded: "2024-03-12T16:45:00Z"
        },
        {
            id: 11,
            title: "ImageNet Classification with Deep Convolutional Neural Networks",
            author: "Krizhevsky et al.",
            type: "Paper",
            category: "Computer Vision",
            year: 2012,
            notes: "AlexNet - the paper that started the deep learning revolution.",
            dateAdded: "2024-03-15T09:30:00Z"
        },
        
        // Articles
        {
            id: 12,
            title: "The Future of Web Development",
            author: "Sarah Johnson",
            type: "article",
            category: "Web Development",
            year: 2024,
            notes: "Insights into emerging trends and technologies in web development.",
            dateAdded: "2024-03-20T12:00:00Z"
        },
        {
            id: 13,
            title: "Sustainable Software Architecture",
            author: "Michael Chen",
            type: "article",
            category: "Software Architecture",
            year: 2024,
            notes: "Best practices for building environmentally conscious software systems.",
            dateAdded: "2024-03-22T15:30:00Z"
        },
        {
            id: 14,
            title: "The Psychology of User Interface Design",
            author: "Dr. Emily Rodriguez",
            type: "article",
            category: "UX Design",
            year: 2024,
            notes: "Understanding cognitive psychology principles in UI design.",
            dateAdded: "2024-03-25T11:15:00Z"
        },
        {
            id: 15,
            title: "Blockchain Technology in Healthcare",
            author: "Alex Thompson",
            type: "article",
            category: "Healthcare Technology",
            year: 2024,
            notes: "Exploring blockchain applications for secure health data management.",
            dateAdded: "2024-03-28T14:45:00Z"
        },
        
        // Reports
        {
            id: 16,
            title: "2024 Global Technology Trends Report",
            author: "Tech Research Institute",
            type: "report",
            category: "Technology Trends",
            year: 2024,
            notes: "Comprehensive analysis of emerging technologies and their impact.",
            dateAdded: "2024-04-01T10:00:00Z"
        },
        {
            id: 17,
            title: "AI Ethics and Governance Framework",
            author: "AI Ethics Committee",
            type: "report",
            category: "Artificial Intelligence",
            year: 2024,
            notes: "Guidelines for responsible AI development and deployment.",
            dateAdded: "2024-04-05T13:20:00Z"
        },
        {
            id: 18,
            title: "Cybersecurity Threat Landscape 2024",
            author: "Security Research Lab",
            type: "report",
            category: "Cybersecurity",
            year: 2024,
            notes: "Analysis of current cybersecurity threats and mitigation strategies.",
            dateAdded: "2024-04-08T16:30:00Z"
        },
        {
            id: 19,
            title: "Remote Work Productivity Study",
            author: "Workplace Innovation Center",
            type: "report",
            category: "Workplace",
            year: 2024,
            notes: "Research on productivity patterns in remote and hybrid work environments.",
            dateAdded: "2024-04-10T09:45:00Z"
        },
        {
            id: 20,
            title: "Sustainable Computing Practices",
            author: "Green Tech Initiative",
            type: "report",
            category: "Sustainability",
            year: 2024,
            notes: "Environmental impact of computing and strategies for greener technology.",
            dateAdded: "2024-04-12T12:15:00Z"
        },
        
        // Additional books for more variety
        {
            id: 21,
            title: "The Pragmatic Programmer",
            author: "David Thomas & Andrew Hunt",
            type: "Book",
            category: "Programming",
            year: 1999,
            notes: "Timeless advice for software developers.",
            dateAdded: "2024-04-15T08:30:00Z"
        },
        {
            id: 22,
            title: "Design Patterns",
            author: "Gang of Four",
            type: "Book",
            category: "Software Design",
            year: 1994,
            notes: "Classic patterns for object-oriented software design.",
            dateAdded: "2024-04-18T14:00:00Z"
        },
        {
            id: 23,
            title: "The Art of Computer Programming",
            author: "Donald Knuth",
            type: "Book",
            category: "Computer Science",
            year: 1968,
            notes: "Comprehensive treatise on computer programming algorithms.",
            dateAdded: "2024-04-20T11:45:00Z"
        },
        {
            id: 24,
            title: "Machine Learning Yearning",
            author: "Andrew Ng",
            type: "Book",
            category: "Machine Learning",
            year: 2018,
            notes: "Practical guide to machine learning project management.",
            dateAdded: "2024-04-22T15:30:00Z"
        },
        {
            id: 25,
            title: "The Mythical Man-Month",
            author: "Frederick Brooks",
            type: "Book",
            category: "Software Engineering",
            year: 1975,
            notes: "Classic essays on software engineering and project management.",
            dateAdded: "2024-04-25T10:15:00Z"
        }
    ];
    
    libraryItems = dummyItems;
    saveLibraryData(); // Save the dummy data so it persists
    console.log(`Loaded ${libraryItems.length} dummy items for demonstration`);
}

// This function exports library data as JSON
function exportLibrary() {
    const dataStr = JSON.stringify(libraryItems, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'digital-library-backup.json';
    link.click();
    URL.revokeObjectURL(url);
}

// This function imports library data from JSON
function importLibrary(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            libraryItems = importedData;
            saveLibraryData();
            updateLibraryDisplay();
            showNotification('Library imported successfully!', 'success');
        } catch (error) {
            showNotification('Error importing library data', 'error');
        }
    };
    reader.readAsText(file);
}

// CAMERA AND SCAN FUNCTIONALITY
// Global variables for camera functionality
let currentStream = null;
let capturedImageData = null;

// Function to open the camera modal
function openCameraModal() {
    console.log('Opening camera modal...');
    const cameraModal = document.getElementById('camera-modal');
    cameraModal.classList.add('active');
    
    // Initialize camera
    initializeCamera();
    
    // Set up camera modal event listeners
    setupCameraModalEvents();
}

// Function to close the camera modal
function closeCameraModal() {
    console.log('Closing camera modal...');
    const cameraModal = document.getElementById('camera-modal');
    cameraModal.classList.remove('active');
    
    // Stop camera stream
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Reset camera state
    resetCameraState();
}

// Function to initialize camera
async function initializeCamera() {
    try {
        const video = document.getElementById('camera-video');
        
        // Get available video devices first
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Request camera access with NO constraints to prevent zooming
        const constraints = {
            video: {
                facingMode: 'environment', // Use back camera if available
                // Completely remove any size constraints
            }
        };
        
        // Try to get the stream
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // Set video properties to prevent any scaling
        video.srcObject = currentStream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        // Wait for video to load and then play
        video.onloadedmetadata = () => {
            video.play().catch(e => console.log('Video play failed:', e));
        };
        
        console.log('Camera initialized successfully');
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showNotification('Camera access denied or not available', 'error');
        closeCameraModal();
    }
}

// Function to setup camera modal event listeners
function setupCameraModalEvents() {
    const closeBtn = document.getElementById('close-camera-btn');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const processBtn = document.getElementById('process-btn');
    
    // Close button
    closeBtn.addEventListener('click', closeCameraModal);
    
    // Capture button
    captureBtn.addEventListener('click', captureImage);
    
    // Retake button
    retakeBtn.addEventListener('click', retakeImage);
    
    // Process button
    processBtn.addEventListener('click', processImage);
}

// Function to capture image from camera
function captureImage() {
    console.log('Capturing image...');
    
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const processBtn = document.getElementById('process-btn');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to base64
    capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Update UI
    captureBtn.style.display = 'none';
    retakeBtn.style.display = 'inline-flex';
    processBtn.style.display = 'inline-flex';
    
    // Hide video and show captured image
    video.style.display = 'none';
    canvas.style.display = 'block';
    
    console.log('Image captured successfully');
    showNotification('Image captured! Click "Process Image" to analyze with AI', 'success');
}

// Function to retake image
function retakeImage() {
    console.log('Retaking image...');
    
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const processBtn = document.getElementById('process-btn');
    
    // Reset UI
    captureBtn.style.display = 'inline-flex';
    retakeBtn.style.display = 'none';
    processBtn.style.display = 'none';
    
    // Show video and hide canvas
    video.style.display = 'block';
    canvas.style.display = 'none';
    
    // Clear captured data
    capturedImageData = null;
}

// NEW DATA LOADING SYSTEM
// This function loads data from data.json file and populates libraryItems
async function loadDataFromFile() {
    console.log('Loading data from data.json...');
    
    try {
        const response = await fetch('./data.json');
        if (response.ok) {
            const data = await response.json();
            libraryItems = data;
            console.log(`✅ Loaded ${libraryItems.length} items from data.json`);
            
            // Save to localStorage for consistency
            localStorage.setItem('digitalLibrary', JSON.stringify(libraryItems));
            
            // Update the display
            updateLibraryDisplay();
        } else {
            console.error('❌ Failed to load data.json');
        }
    } catch (error) {
        console.error('❌ Error loading data.json:', error);
    }
}

// Function to clear localStorage and reload data (for debugging)
function clearAndReload() {
    localStorage.clear();
    location.reload();
}

// Make it available globally for debugging
window.clearAndReload = clearAndReload;

// Function to process image with AI
async function processImage() {
    if (!capturedImageData) {
        showNotification('No image captured', 'error');
        return;
    }
    
    console.log('Processing image with AI...');
    
    const processBtn = document.getElementById('process-btn');
    const progressDiv = document.getElementById('scan-progress');
    
    // Show progress
    processBtn.style.display = 'none';
    progressDiv.style.display = 'block';
    
    try {
        // Convert data URL to base64
        const base64Data = capturedImageData.split(',')[1];
        
        // Send to Vercel API for processing
        const response = await fetch('/api/scan', {
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                imageBase64: base64Data,
                mimeType: 'image/jpeg'
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            throw new Error(`API Error ${response.status}: ${errorText}`);
        }
        
        const result = await response.json();
        console.log('Raw API response:', result);
        
        if (result.success) {
            console.log('AI processing successful, data:', result.data);
            
            // Handle the results with error protection
            try {
                // The API returns {success: true, data: extractedInfo}
                // We need to convert this to the format handleScanResults expects
                const scanData = {
                    extractedInfo: result.data,
                    searchResults: [] // We'll search for books based on extracted info
                };
                handleScanResults(scanData);
            } catch (handleError) {
                console.error('Error in handleScanResults:', handleError);
                showNotification(`Error handling results: ${handleError.message}`, 'error');
            }
            
        } else {
            console.error('API returned error:', result.error);
            throw new Error(result.error || 'Failed to process image');
        }
        
    } catch (error) {
        console.error('Error processing image:', error);
        const errorMessage = error.message || error.toString() || 'Unknown error occurred';
        showNotification(`Error processing image: ${errorMessage}`, 'error');
    } finally {
        // Hide progress
        progressDiv.style.display = 'none';
        processBtn.style.display = 'inline-flex';
    }
}

// Function to handle scan results - COMPLETELY REWRITTEN
function handleScanResults(data) {
    console.log('=== SCAN RESULTS DEBUG ===');
    console.log('Raw data received:', data);
    console.log('Data type:', typeof data);
    console.log('Data keys:', Object.keys(data || {}));
    
    // Safely extract data with multiple fallback strategies
    let extractedInfo = null;
    let searchResults = [];
    
    // Strategy 1: Direct destructuring
    if (data && typeof data === 'object') {
        extractedInfo = data.extractedInfo || data.extracted_info || null;
        searchResults = data.searchResults || data.search_results || data.results || [];
    }
    
    // Strategy 2: Check if data is nested
    if (!extractedInfo && !searchResults.length && data && data.data) {
        extractedInfo = data.data.extractedInfo || data.data.extracted_info || null;
        searchResults = data.data.searchResults || data.data.search_results || data.data.results || [];
    }
    
    // Strategy 3: Check if it's an array directly
    if (Array.isArray(data)) {
        searchResults = data;
    }
    
    console.log('Extracted info:', extractedInfo);
    console.log('Search results:', searchResults);
    console.log('Search results length:', searchResults?.length || 0);
    
    // Close camera modal first
    closeCameraModal();
    
    try {
        // Check if we have search results
        if (Array.isArray(searchResults) && searchResults.length > 0) {
            console.log('Processing search results...');
            
            // Put extracted title/author in search box for context
            const searchInput = document.getElementById('add-modal-search');
            if (searchInput && extractedInfo) {
                const searchQuery = extractedInfo.author 
                    ? `${extractedInfo.title} ${extractedInfo.author}`
                    : extractedInfo.title;
                searchInput.value = searchQuery;
            }
            
            // Convert search results to the expected format
            const formattedResults = searchResults.map((book, index) => {
                console.log(`Processing book ${index}:`, book);
                return {
                    ...book,
                    source: 'google_books',
                    searchType: 'book'
                };
            });
            
            console.log('Formatted results:', formattedResults);
            
            // Display results in the search area
            const searchResultsElement = document.getElementById('add-modal-search-results');
            if (searchResultsElement && window.displayAddModalSearchResults) {
                window.displayAddModalSearchResults(formattedResults, 'AI Scan Results');
                showNotification(`Found ${searchResults.length} matching books from scan!`, 'success');
            } else {
                console.error('Search results element or function not found!');
                showNotification('Error displaying results', 'error');
            }
            
        } else if (extractedInfo && extractedInfo.title) {
            console.log('No search results, but have extracted info:', extractedInfo);
            
            // Instead of auto-filling, trigger a search with the extracted title and author
            const searchQuery = extractedInfo.author 
                ? `${extractedInfo.title} ${extractedInfo.author}`
                : extractedInfo.title;
            
            // Put the search query in the search box and trigger search
            const searchInput = document.getElementById('add-modal-search');
            if (searchInput) {
                searchInput.value = searchQuery;
                
                // Trigger the search by simulating input event
                const inputEvent = new Event('input', { bubbles: true });
                searchInput.dispatchEvent(inputEvent);
                
                showNotification(`Searching for: "${searchQuery}"`, 'success');
            } else {
                // Fallback to old behavior if search box not found
                fillFormFromExtractedInfo(extractedInfo);
                showNotification('Book information extracted! Form filled with AI data.', 'success');
            }
            
        } else {
            console.log('No useful data extracted');
            showNotification('No book information could be extracted from the image', 'error');
        }
        
    } catch (error) {
        console.error('Error in handleScanResults:', error);
        showNotification(`Error processing scan results: ${error.message}`, 'error');
    }
    
    console.log('=== END SCAN RESULTS DEBUG ===');
}

// Function to fill form with extracted information
function fillFormFromExtractedInfo(extractedInfo) {
    console.log('Filling form with extracted info:', extractedInfo);
    
    // Fill basic fields
    if (extractedInfo.title) {
        document.getElementById('item-title').value = extractedInfo.title;
    }
    if (extractedInfo.author) {
        document.getElementById('item-author').value = extractedInfo.author;
    }
    if (extractedInfo.publisher) {
        document.getElementById('item-category').value = extractedInfo.publisher;
    }
    if (extractedInfo.year) {
        document.getElementById('item-publishing-year').value = extractedInfo.year;
    }
    if (extractedInfo.description) {
        document.getElementById('item-summary').value = extractedInfo.description;
    }
    if (extractedInfo.category) {
        document.getElementById('item-category').value = extractedInfo.category;
    }
    
    // Set type to Book
    document.getElementById('item-type').value = 'Book';
    
    // Set language to English as default
    document.getElementById('item-language').value = 'english';
}

// Function to reset camera state
function resetCameraState() {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const retakeBtn = document.getElementById('retake-btn');
    const processBtn = document.getElementById('process-btn');
    const progressDiv = document.getElementById('scan-progress');
    
    // Reset UI elements
    video.style.display = 'block';
    canvas.style.display = 'none';
    captureBtn.style.display = 'inline-flex';
    retakeBtn.style.display = 'none';
    processBtn.style.display = 'none';
    progressDiv.style.display = 'none';
    
    // Clear captured data
    capturedImageData = null;
}

// ============================================
// OVERLAY SEARCH FUNCTIONALITY
// ============================================

function openOverlaySearch() {
    const overlaySearch = document.getElementById('overlay-search');
    const searchInput = document.getElementById('overlay-search-input');
    const masonryContainer = document.getElementById('masonry-container');
    const overlayBg = document.getElementById('overlay-search-background');
    
    // Only works in masonry view
    if (masonryContainer.style.display === 'none') {
        showNotification('Please switch to Masonry view to use search', 'info');
        return;
    }
    
    // Show overlay search
    overlaySearch.classList.add('active');
    document.body.classList.add('search-active');
    
    // Disable sidebar when search is active
    disableSidebar();
    
    // Show background
    if (overlayBg) {
        overlayBg.style.display = 'block';
    }
    
    // Focus on search input
    setTimeout(() => {
        searchInput.focus();
    }, 300);
    
    // Blur all items initially
    const masonryItems = document.querySelectorAll('.masonry-item');
    masonryItems.forEach(item => {
        item.classList.remove('search-match');
    });
}

window.openOverlaySearch = openOverlaySearch;

function closeOverlaySearch() {
    const overlaySearch = document.getElementById('overlay-search');
    const searchInput = document.getElementById('overlay-search-input');
    const overlayBg = document.getElementById('overlay-search-background');
    
    // Hide overlay search
    overlaySearch.classList.remove('active');
    document.body.classList.remove('search-active');
    
    // Enable sidebar when search is closed
    enableSidebar();
    
    // Hide background
    if (overlayBg) {
        overlayBg.style.display = 'none';
    }
    
    // Clear search input
    searchInput.value = '';
    
    // Remove all blur classes
    const masonryItems = document.querySelectorAll('.masonry-item');
    masonryItems.forEach(item => {
        item.classList.remove('search-match');
        item.classList.remove('blurred');
        item.classList.remove('clear');
    });
}

window.closeOverlaySearch = closeOverlaySearch;

function performOverlaySearch(query) {
    const masonryItems = document.querySelectorAll('.masonry-item');
    
    if (!query || query.trim() === '') {
        // If search is empty, blur all items
        masonryItems.forEach(item => {
            item.classList.remove('search-match');
        });
        return;
    }
    
    const searchTerm = query.toLowerCase().trim();
    let matchCount = 0;
    
    masonryItems.forEach((item, index) => {
        const libraryItem = libraryItems[index];
        
        if (!libraryItem) return;
        
        // Check if item matches search term
        const titleMatch = libraryItem.title?.toLowerCase().includes(searchTerm);
        const authorMatch = libraryItem.author?.toLowerCase().includes(searchTerm);
        const categoryMatch = libraryItem.category?.toLowerCase().includes(searchTerm);
        const typeMatch = libraryItem.type?.toLowerCase().includes(searchTerm);
        const yearMatch = libraryItem.publishingYear?.toString().includes(searchTerm) || 
                         libraryItem.year?.toString().includes(searchTerm);
        
        const isMatch = titleMatch || authorMatch || categoryMatch || typeMatch || yearMatch;
        
        if (isMatch) {
            item.classList.add('search-match');
            matchCount++;
        } else {
            item.classList.remove('search-match');
        }
    });
    
    // Show notification if no matches
    if (matchCount === 0 && searchTerm) {
        console.log('No matches found for:', searchTerm);
    }
}

// Setup overlay search event listeners
function setupOverlaySearch() {
    const overlaySearch = document.getElementById('overlay-search');
    const searchInput = document.getElementById('overlay-search-input');
    const mainHeader = document.getElementById('main-header');
    
    if (!overlaySearch || !searchInput) return;
    
    // Search input listener
    searchInput.addEventListener('input', function() {
        performOverlaySearch(this.value);
    });
    
    // Click on header area to close
    if (mainHeader) {
        mainHeader.addEventListener('click', function(e) {
            if (overlaySearch.classList.contains('active')) {
                closeOverlaySearch();
            }
        });
    }
    
    // Create clickable background element for closing search
    const overlayBg = document.createElement('div');
    overlayBg.id = 'overlay-search-background';
    overlayBg.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 100px;
        z-index: 1999;
        display: none;
        pointer-events: auto;
    `;
    document.body.appendChild(overlayBg);
    
    overlayBg.addEventListener('click', function() {
        if (overlaySearch.classList.contains('active')) {
            closeOverlaySearch();
        }
    });
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlaySearch.classList.contains('active')) {
            closeOverlaySearch();
        }
    });
}
