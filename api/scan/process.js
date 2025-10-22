// Vercel API function for processing scanned book covers

// Initialize Gemini AI service
class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    async extractBookInfo(imageBase64, mimeType) {
        try {
            console.log('Processing image with Gemini AI...');
            
            const requestBody = {
                contents: [{
                    parts: [{
                        text: `Analyze this book cover image and extract the following information in JSON format:
                        {
                            "title": "Book Title",
                            "author": "Author Name",
                            "isbn": "ISBN if visible",
                            "publisher": "Publisher if visible",
                            "year": "Publication year if visible",
                            "category": "Genre/Category",
                            "confidence": 0.95
                        }
                        
                        If you cannot clearly identify any field, use null. Be as accurate as possible.`
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

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Gemini API error:', errorText);
                throw new Error(`Gemini API error: ${response.status} ${errorText}`);
            }

            const result = await response.json();
            console.log('Gemini API response:', result);

            if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
                throw new Error('Invalid response from Gemini API');
            }

            const generatedText = result.candidates[0].content.parts[0].text;
            console.log('Gemini AI response:', generatedText);

            // Parse the JSON response
            const bookInfo = this.parseGeminiResponse(generatedText);
            console.log('Parsed book info:', bookInfo);

            return {
                success: true,
                data: bookInfo
            };

        } catch (error) {
            console.error('Gemini AI Error:', error.message);
            
            // Try to extract error message from response
            let errorMessage = 'Unknown error occurred';
            if (error.message.includes('API key')) {
                errorMessage = 'Invalid API key';
            } else if (error.message.includes('quota')) {
                errorMessage = 'API quota exceeded';
            } else if (error.message.includes('network')) {
                errorMessage = 'Network error';
            } else {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: `Gemini API error: ${errorMessage}`
            };
        }
    }

    parseGeminiResponse(responseText) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                
                return {
                    title: parsed.title || null,
                    author: parsed.author || null,
                    isbn: parsed.isbn || null,
                    publisher: parsed.publisher || null,
                    year: parsed.year ? parseInt(parsed.year) : null,
                    category: parsed.category || 'General',
                    confidence: parsed.confidence || 0.5,
                    source: 'gemini_ai'
                };
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            
            // Fallback parsing
            return {
                title: this.extractField(responseText, 'title'),
                author: this.extractField(responseText, 'author'),
                isbn: this.extractField(responseText, 'isbn'),
                publisher: this.extractField(responseText, 'publisher'),
                year: this.extractField(responseText, 'year'),
                category: this.extractField(responseText, 'category') || 'General',
                confidence: 0.3,
                source: 'gemini_ai'
            };
        }
    }

    extractField(text, field) {
        const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`, 'i');
        const match = text.match(regex);
        return match ? match[1] : null;
    }
}

const geminiService = new GeminiService();

export default async function handler(req, res) {
    console.log('API function called:', req.method, req.url);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Processing scan request...');
        console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
        const { imageBase64, mimeType } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ 
                success: false, 
                error: 'No image data provided' 
            });
        }

        console.log('Processing scan request...');

        // Validate image
        if (!mimeType || !mimeType.startsWith('image/')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid image format' 
            });
        }

        // Extract book information using Gemini AI
        console.log('Calling Gemini AI for image analysis...');
        let extractedInfo;

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
            
            // Fallback to mock data if Gemini fails
            extractedInfo = {
                title: "Sample Book Title",
                author: "Sample Author",
                category: "General",
                confidence: 0.1,
                source: 'fallback'
            };
        }

        // Return the extracted information
        res.status(200).json({
            success: true,
            data: extractedInfo
        });

    } catch (error) {
        console.error('Scan process error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to process scan',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
