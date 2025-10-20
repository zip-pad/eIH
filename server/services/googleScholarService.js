const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

class GoogleScholarService {
    constructor() {
        this.baseUrl = 'https://scholar.google.com';
        this.searchUrl = 'https://scholar.google.com/scholar';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    }

    /**
     * Search for academic papers using Google Scholar
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum number of results (default: 10)
     * @returns {Promise<Array>} Array of paper objects
     */
    async searchPapers(query, maxResults = 10) {
        try {
            // Use Puppeteer for more reliable scraping
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();
            await page.setUserAgent(this.userAgent);
            await page.setViewport({ width: 1920, height: 1080 });

            // Navigate to Google Scholar
            const searchParams = new URLSearchParams({
                q: query,
                hl: 'en',
                as_sdt: '0,5'
            });

            await page.goto(`${this.searchUrl}?${searchParams}`, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for results to load
            await page.waitForSelector('.gs_rt, .gs_r', { timeout: 10000 });

            // Extract paper data
            const papers = await page.evaluate(() => {
                const results = [];
                const items = document.querySelectorAll('.gs_r, .gs_ri');

                items.forEach((item, index) => {
                    try {
                        const titleElement = item.querySelector('.gs_rt a, .gs_rt');
                        const title = titleElement ? titleElement.textContent.trim() : 'Unknown Title';
                        const link = titleElement && titleElement.href ? titleElement.href : null;

                        const authorsElement = item.querySelector('.gs_a');
                        const authors = authorsElement ? authorsElement.textContent.trim() : 'Unknown Authors';

                        const snippetElement = item.querySelector('.gs_rs');
                        const snippet = snippetElement ? snippetElement.textContent.trim() : '';

                        const citedByElement = item.querySelector('.gs_fl a[href*="cites"]');
                        const citedBy = citedByElement ? citedByElement.textContent.match(/\d+/)?.[0] || '0' : '0';

                        const yearElement = item.querySelector('.gs_a');
                        const yearMatch = yearElement ? yearElement.textContent.match(/(\d{4})/) : null;
                        const year = yearMatch ? parseInt(yearMatch[1]) : null;

                        const pdfElement = item.querySelector('.gs_ggs a[href*=".pdf"]');
                        const pdfLink = pdfElement ? pdfElement.href : null;

                        if (title && title !== 'Unknown Title') {
                            results.push({
                                title,
                                authors,
                                author: authors,
                                year,
                                snippet,
                                citedBy: parseInt(citedBy),
                                link,
                                pdfLink,
                                source: 'google_scholar'
                            });
                        }
                    } catch (error) {
                        console.error('Error parsing item:', error);
                    }
                });

                return results;
            });

            await browser.close();

            return papers.slice(0, maxResults);
        } catch (error) {
            console.error('Google Scholar scraping error:', error.message);
            
            // Fallback to simple HTTP request (less reliable)
            try {
                return await this.fallbackSearch(query, maxResults);
            } catch (fallbackError) {
                console.error('Fallback search also failed:', fallbackError.message);
                throw new Error(`Failed to search Google Scholar: ${error.message}`);
            }
        }
    }

    /**
     * Fallback search method using simple HTTP requests
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum number of results
     * @returns {Promise<Array>} Array of paper objects
     */
    async fallbackSearch(query, maxResults = 10) {
        try {
            const searchParams = new URLSearchParams({
                q: query,
                hl: 'en',
                as_sdt: '0,5'
            });

            const response = await axios.get(`${this.searchUrl}?${searchParams}`, {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                },
                timeout: 15000
            });

            const $ = cheerio.load(response.data);
            const papers = [];

            $('.gs_r, .gs_ri').each((index, element) => {
                if (papers.length >= maxResults) return false;

                try {
                    const $element = $(element);
                    
                    const titleElement = $element.find('.gs_rt a, .gs_rt').first();
                    const title = titleElement.text().trim() || 'Unknown Title';
                    const link = titleElement.attr('href') || null;

                    const authorsElement = $element.find('.gs_a').first();
                    const authors = authorsElement.text().trim() || 'Unknown Authors';

                    const snippetElement = $element.find('.gs_rs').first();
                    const snippet = snippetElement.text().trim() || '';

                    const citedByElement = $element.find('.gs_fl a[href*="cites"]').first();
                    const citedByText = citedByElement.text();
                    const citedBy = citedByText.match(/\d+/)?.[0] || '0';

                    const yearMatch = authorsElement.text().match(/(\d{4})/);
                    const year = yearMatch ? parseInt(yearMatch[1]) : null;

                    const pdfElement = $element.find('.gs_ggs a[href*=".pdf"]').first();
                    const pdfLink = pdfElement.attr('href') || null;

                    if (title && title !== 'Unknown Title') {
                        papers.push({
                            title,
                            authors,
                            author: authors,
                            year,
                            snippet,
                            citedBy: parseInt(citedBy),
                            link,
                            pdfLink,
                            source: 'google_scholar'
                        });
                    }
                } catch (error) {
                    console.error('Error parsing element:', error);
                }
            });

            return papers;
        } catch (error) {
            console.error('Fallback search error:', error.message);
            throw new Error(`Fallback search failed: ${error.message}`);
        }
    }

    /**
     * Format paper data to match our standard format
     * @param {Object} paper - Raw paper data
     * @returns {Object} Formatted paper object
     */
    formatPaperData(paper) {
        return {
            id: `scholar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: paper.title,
            authors: paper.authors,
            author: paper.author,
            year: paper.year,
            summary: paper.snippet,
            description: paper.snippet,
            citedBy: paper.citedBy,
            link: paper.link,
            pdfLink: paper.pdfLink,
            type: 'paper',
            category: 'Research',
            source: 'google_scholar',
            searchableText: this.createSearchableText(paper)
        };
    }

    /**
     * Create searchable text for better search results
     * @param {Object} paper - Paper object
     * @returns {string} Searchable text
     */
    createSearchableText(paper) {
        const parts = [
            paper.title,
            paper.authors,
            paper.snippet
        ].filter(Boolean);
        
        return parts.join(' ').toLowerCase();
    }

    /**
     * Get paper details by URL (if available)
     * @param {string} url - Paper URL
     * @returns {Promise<Object|null>} Paper details or null
     */
    async getPaperDetails(url) {
        try {
            if (!url) return null;

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            // Extract additional details from the paper page
            const abstract = $('.abstract, .summary, .description').first().text().trim();
            const keywords = $('.keywords, .tags').first().text().trim();
            const doi = $('a[href*="doi.org"]').first().attr('href');

            return {
                abstract,
                keywords,
                doi
            };
        } catch (error) {
            console.error('Error fetching paper details:', error.message);
            return null;
        }
    }
}

module.exports = new GoogleScholarService();

