// Vercel API function for processing scanned book covers
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

        // Validate image
        if (!mimeType || !mimeType.startsWith('image/')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid image format' 
            });
        }

        // Check if Gemini API key is available
        if (!process.env.GEMINI_API_KEY) {
            console.error('GEMINI_API_KEY not found in environment variables');
            return res.status(500).json({
                success: false,
                error: 'Gemini API key not configured'
            });
        }

        // Simple Gemini AI integration
        const geminiApiKey = process.env.GEMINI_API_KEY;
        const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

        console.log('Calling Gemini API...');
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': geminiApiKey
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API error:', errorText);
            throw new Error(`Gemini API error: ${response.status} ${errorText}`);
        }

        const result = await response.json();
        console.log('Gemini API response received');

        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
            throw new Error('Invalid response from Gemini API');
        }

        const generatedText = result.candidates[0].content.parts[0].text;
        console.log('Generated text from Gemini:', generatedText);
        console.log('Generated text length:', generatedText.length);

        // Parse the JSON response
        let extractedInfo;
        try {
            const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const jsonStr = jsonMatch[0];
                extractedInfo = JSON.parse(jsonStr);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            console.error('Raw response that failed to parse:', generatedText);
            
            // Try to extract basic info even if JSON parsing fails
            const titleMatch = generatedText.match(/title[:\s]*["']?([^"',\n]+)["']?/i);
            const authorMatch = generatedText.match(/author[:\s]*["']?([^"',\n]+)["']?/i);
            
            extractedInfo = {
                title: titleMatch ? titleMatch[1].trim() : "Unknown Book",
                author: authorMatch ? authorMatch[1].trim() : "Unknown Author",
                category: "General",
                confidence: 0.2,
                source: 'gemini_ai_parsed_fallback',
                rawResponse: generatedText.substring(0, 200) + '...'
            };
        }

        console.log('Extracted book info:', extractedInfo);

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
