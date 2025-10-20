const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const googleBooksService = require('../services/googleBooksService');

router.post('/process', async (req, res) => {
    try {
        const { imageBase64, mimeType } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required'
            });
        }

        console.log('Processing scan request...');
        console.log('Image size:', imageBase64.length, 'characters');
        console.log('MIME type:', mimeType);

        // Validate image
        const validation = geminiService.validateImage(imageBase64, mimeType);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        // Extract book information using Gemini AI
        console.log('Calling Gemini AI for image analysis...');
        let extractedInfo = null;
        
        try {
            const geminiResult = await geminiService.extractBookInfo(imageBase64, mimeType);
            
            if (geminiResult.success) {
                extractedInfo = geminiResult.data;
                console.log('Extracted book info from Gemini:', extractedInfo);
            } else {
                throw new Error('Gemini AI failed to process image');
            }
        } catch (error) {
            console.error('Gemini AI failed:', error.message);
            console.log('Falling back to mock data for demonstration...');
            
            // Fallback to mock data if Gemini fails
            extractedInfo = {
                title: "Book Cover Detected",
                author: "Unknown Author",
                year: new Date().getFullYear(),
                publisher: "Unknown Publisher",
                description: "Book information could not be extracted from the image. Please try again or enter details manually.",
                confidence: 0,
                source: 'fallback'
            };
        }

        // Search for matching books using Google Books API
        let searchResults = [];
        if (extractedInfo.title) {
            try {
                console.log('Searching Google Books for:', extractedInfo.title);
                const googleBooksResults = await googleBooksService.searchBooks(extractedInfo.title);
                searchResults = googleBooksResults.slice(0, 5); // Limit to 5 results
                console.log('Found', searchResults.length, 'Google Books results');
            } catch (error) {
                console.error('Google Books search failed:', error);
                // Continue without search results
            }
        }

        res.json({
            success: true,
            data: {
                extractedInfo: extractedInfo,
                searchResults: searchResults,
                searchCount: searchResults.length
            },
            message: `Extracted book information and found ${searchResults.length} matching books`
        });

    } catch (error) {
        console.error('Scan process error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process scan'
        });
    }
});

module.exports = router;