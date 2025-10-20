const axios = require('axios');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY || 'AIzaSyDtK2U7YjujP0haZR1POkdOCtyvu3PWG68';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    /**
     * Extract book information from an image using Gemini AI
     * @param {string} imageBase64 - Base64 encoded image
     * @param {string} mimeType - MIME type of the image
     * @returns {Promise<Object>} Extracted book information
     */
    async extractBookInfo(imageBase64, mimeType = 'image/jpeg') {
        try {
            console.log('Processing image with Gemini AI...');
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: `Analyze this book cover image and extract the following information in JSON format:
                        {
                            "title": "Book title",
                            "author": "Author name(s)",
                            "isbn": "ISBN if visible",
                            "publisher": "Publisher name",
                            "year": "Publication year",
                            "description": "Brief description of the book",
                            "category": "Book category/genre",
                            "confidence": "Confidence level (0-100) for the extraction"
                        }
                        
                        Please be as accurate as possible. If any information is not clearly visible or readable, use null for that field. Focus on extracting the title and author as these are most important for book identification.`
                    }, {
                        inline_data: {
                            mime_type: mimeType,
                            data: imageBase64
                        }
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    topK: 32,
                    topP: 1,
                    maxOutputTokens: 1024,
                }
            };

            const response = await axios.post(
                `${this.baseUrl}?key=${this.apiKey}`,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000 // 30 second timeout
                }
            );

            if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
                throw new Error('Invalid response from Gemini API');
            }

            const generatedText = response.data.candidates[0].content.parts[0].text;
            console.log('Gemini AI response:', generatedText);

            // Parse the JSON response
            const bookInfo = this.parseGeminiResponse(generatedText);
            
            return {
                success: true,
                data: bookInfo,
                rawResponse: generatedText
            };

        } catch (error) {
            console.error('Gemini AI Error:', error.message);
            
            // Handle specific error cases
            if (error.response) {
                const errorMessage = error.response.data?.error?.message || 'Unknown API error';
                throw new Error(`Gemini API error: ${errorMessage}`);
            } else if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout - please try again');
            } else {
                throw new Error(`Failed to process image: ${error.message}`);
            }
        }
    }

    /**
     * Parse Gemini AI response and extract JSON
     * @param {string} responseText - Raw response text from Gemini
     * @returns {Object} Parsed book information
     */
    parseGeminiResponse(responseText) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                
                // Validate and clean the response
                return {
                    title: parsed.title || null,
                    author: parsed.author || null,
                    isbn: parsed.isbn || null,
                    publisher: parsed.publisher || null,
                    year: parsed.year ? parseInt(parsed.year) : null,
                    description: parsed.description || null,
                    category: parsed.category || null,
                    confidence: parsed.confidence ? parseInt(parsed.confidence) : null,
                    source: 'gemini_ai'
                };
            } else {
                // Fallback: try to extract basic info using text parsing
                return this.fallbackTextParsing(responseText);
            }
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            return this.fallbackTextParsing(responseText);
        }
    }

    /**
     * Fallback method to extract book info using text parsing
     * @param {string} responseText - Raw response text
     * @returns {Object} Basic book information
     */
    fallbackTextParsing(responseText) {
        const lines = responseText.split('\n');
        const bookInfo = {
            title: null,
            author: null,
            isbn: null,
            publisher: null,
            year: null,
            description: null,
            category: null,
            confidence: 50, // Low confidence for fallback
            source: 'gemini_ai'
        };

        // Simple text extraction patterns
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            if (lowerLine.includes('title:') && !bookInfo.title) {
                bookInfo.title = line.split(':')[1]?.trim() || null;
            } else if (lowerLine.includes('author:') && !bookInfo.author) {
                bookInfo.author = line.split(':')[1]?.trim() || null;
            } else if (lowerLine.includes('isbn:') && !bookInfo.isbn) {
                bookInfo.isbn = line.split(':')[1]?.trim() || null;
            } else if (lowerLine.includes('publisher:') && !bookInfo.publisher) {
                bookInfo.publisher = line.split(':')[1]?.trim() || null;
            } else if (lowerLine.includes('year:') && !bookInfo.year) {
                const yearMatch = line.match(/\d{4}/);
                bookInfo.year = yearMatch ? parseInt(yearMatch[0]) : null;
            } else if (lowerLine.includes('category:') && !bookInfo.category) {
                bookInfo.category = line.split(':')[1]?.trim() || null;
            }
        }

        return bookInfo;
    }

    /**
     * Validate image format and size
     * @param {string} imageBase64 - Base64 encoded image
     * @param {string} mimeType - MIME type
     * @returns {Object} Validation result
     */
    validateImage(imageBase64, mimeType) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        
        if (!allowedTypes.includes(mimeType)) {
            return {
                valid: false,
                error: 'Unsupported image format. Please use JPEG, PNG, or WebP.'
            };
        }

        // Calculate image size from base64
        const sizeInBytes = (imageBase64.length * 3) / 4;
        const maxSize = 10 * 1024 * 1024; // 10MB limit

        if (sizeInBytes > maxSize) {
            return {
                valid: false,
                error: 'Image too large. Please use an image smaller than 10MB.'
            };
        }

        return { valid: true };
    }
}

module.exports = new GeminiService();
