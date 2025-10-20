const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
    try {
        const { q: query, maxResults = 10 } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query required' });
        }
        
        // Mock response for testing
        res.json({
            success: true,
            data: [{
                title: `Search results for: ${query}`,
                author: 'Test Author',
                type: 'book',
                source: 'google_books'
            }],
            count: 1
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;