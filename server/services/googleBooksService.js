const axios = require('axios');

class GoogleBooksService {
    constructor() {
        this.apiKey = process.env.GOOGLE_BOOKS_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/books/v1/volumes';
    }

    /**
     * Search for books using Google Books API
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum number of results (default: 10)
     * @returns {Promise<Array>} Array of book objects
     */
    async searchBooks(query, maxResults = 10) {
        try {
            if (!this.apiKey) {
                throw new Error('Google Books API key not configured');
            }

            const params = {
                q: query,
                maxResults: Math.min(maxResults, 40), // Google Books API limit
                key: this.apiKey,
                printType: 'books'
            };

            const response = await axios.get(this.baseUrl, { params });
            
            if (!response.data.items) {
                return [];
            }

            return response.data.items.map(item => this.formatBookData(item));
        } catch (error) {
            console.error('Google Books API Error:', error.message);
            throw new Error(`Failed to search books: ${error.message}`);
        }
    }

    /**
     * Get book details by ISBN
     * @param {string} isbn - ISBN of the book
     * @returns {Promise<Object|null>} Book object or null if not found
     */
    async getBookByISBN(isbn) {
        try {
            const query = `isbn:${isbn}`;
            const results = await this.searchBooks(query, 1);
            return results.length > 0 ? results[0] : null;
        } catch (error) {
            console.error('Error fetching book by ISBN:', error.message);
            throw new Error(`Failed to fetch book by ISBN: ${error.message}`);
        }
    }

    /**
     * Format Google Books API response to our standard format
     * @param {Object} item - Google Books API item
     * @returns {Object} Formatted book object
     */
    formatBookData(item) {
        const volumeInfo = item.volumeInfo || {};
        const saleInfo = item.saleInfo || {};
        const accessInfo = item.accessInfo || {};

        return {
            id: item.id,
            title: volumeInfo.title || 'Unknown Title',
            authors: volumeInfo.authors || ['Unknown Author'],
            author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
            publisher: volumeInfo.publisher || 'Unknown Publisher',
            publishedDate: volumeInfo.publishedDate || null,
            publishingYear: this.extractYear(volumeInfo.publishedDate),
            description: volumeInfo.description || '',
            summary: this.truncateText(volumeInfo.description || '', 500),
            isbn: this.extractISBN(volumeInfo.industryIdentifiers),
            pages: volumeInfo.pageCount || null,
            language: volumeInfo.language || 'en',
            categories: volumeInfo.categories || [],
            category: volumeInfo.categories ? volumeInfo.categories[0] : 'General',
            averageRating: volumeInfo.averageRating || null,
            ratingsCount: volumeInfo.ratingsCount || 0,
            maturityRating: volumeInfo.maturityRating || 'NOT_MATURE',
            imageLinks: volumeInfo.imageLinks || {},
            coverUrl: this.getBestCoverImage(volumeInfo.imageLinks),
            previewLink: volumeInfo.previewLink || null,
            infoLink: volumeInfo.infoLink || null,
            canonicalVolumeLink: volumeInfo.canonicalVolumeLink || null,
            webReaderLink: accessInfo.webReaderLink || null,
            isEbook: saleInfo.isEbook || false,
            saleability: saleInfo.saleability || 'NOT_FOR_SALE',
            buyLink: saleInfo.buyLink || null,
            listPrice: saleInfo.listPrice || null,
            retailPrice: saleInfo.retailPrice || null,
            availability: saleInfo.availability || 'NOT_AVAILABLE',
            type: 'book',
            source: 'google_books',
            searchableText: this.createSearchableText(volumeInfo)
        };
    }

    /**
     * Extract year from published date
     * @param {string} publishedDate - Published date string
     * @returns {number|null} Year or null
     */
    extractYear(publishedDate) {
        if (!publishedDate) return null;
        
        const year = parseInt(publishedDate.split('-')[0]);
        return isNaN(year) ? null : year;
    }

    /**
     * Extract ISBN from industry identifiers
     * @param {Array} identifiers - Industry identifiers array
     * @returns {string|null} ISBN or null
     */
    extractISBN(identifiers) {
        if (!identifiers || !Array.isArray(identifiers)) return null;
        
        const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
        const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
        
        return isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : null);
    }

    /**
     * Get the best available cover image
     * @param {Object} imageLinks - Image links object
     * @returns {string|null} Best cover image URL
     */
    getBestCoverImage(imageLinks) {
        if (!imageLinks) return null;
        
        // Prefer larger images
        return imageLinks.large || 
               imageLinks.medium || 
               imageLinks.small || 
               imageLinks.thumbnail || 
               imageLinks.smallThumbnail || 
               null;
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
     */
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength).trim() + '...';
    }

    /**
     * Create searchable text for better search results
     * @param {Object} volumeInfo - Volume info object
     * @returns {string} Searchable text
     */
    createSearchableText(volumeInfo) {
        const parts = [
            volumeInfo.title,
            volumeInfo.authors ? volumeInfo.authors.join(' ') : '',
            volumeInfo.publisher,
            volumeInfo.description,
            volumeInfo.categories ? volumeInfo.categories.join(' ') : ''
        ].filter(Boolean);
        
        return parts.join(' ').toLowerCase();
    }
}

module.exports = new GoogleBooksService();

