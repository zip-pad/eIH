const express = require('express');
const router = express.Router();

router.get('/search', async (req, res) => {
    try {
        const { q: query, maxResults = 10 } = req.query;
        if (!query) {
            return res.status(400).json({ success: false, error: 'Query required' });
        }
        
        res.json({
            success: true,
            data: [{
                title: `Academic paper: ${query}`,
                author: 'Research Author',
                type: 'paper',
                source: 'google_scholar'
            }],
            count: 1
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;