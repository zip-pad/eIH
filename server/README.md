# eInformation Hub Server

Backend API server for the eInformation Hub digital library application, providing integration with Google Books and Google Scholar APIs.

## Features

- **Google Books API Integration**: Search for books, get details by ISBN, author, title, and subject
- **Google Scholar Integration**: Search for academic papers and research articles
- **Auto-fill Functionality**: Automatically populate form fields with book/paper data
- **RESTful API**: Clean and well-documented API endpoints
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Helmet.js for security headers, CORS configuration

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Books API key (optional but recommended)

## Installation

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp env.example .env
   ```

4. Edit `.env` file with your configuration:
   ```env
   PORT=3001
   NODE_ENV=development
   GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
   CORS_ORIGIN=http://localhost:3000
   ```

## Running the Server

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3001 by default (or the port specified in your `.env` file).

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Google Books API
- `GET /api/books/search?q={query}&maxResults={number}` - Search books
- `GET /api/books/isbn/{isbn}` - Get book by ISBN
- `GET /api/books/author/{author}` - Search books by author
- `GET /api/books/title/{title}` - Search books by title
- `GET /api/books/subject/{subject}` - Search books by subject
- `GET /api/books/advanced` - Advanced search with multiple parameters

### Google Scholar API
- `GET /api/scholar/search?q={query}&maxResults={number}` - Search academic papers
- `GET /api/scholar/author/{author}` - Search papers by author
- `GET /api/scholar/title/{title}` - Search papers by title
- `GET /api/scholar/year/{year}` - Search papers by year
- `GET /api/scholar/advanced` - Advanced search with multiple parameters
- `GET /api/scholar/details?url={paper_url}` - Get detailed paper information

## Example Usage

### Search for Books
```bash
curl "http://localhost:3001/api/books/search?q=machine+learning&maxResults=5"
```

### Search for Academic Papers
```bash
curl "http://localhost:3001/api/scholar/search?q=artificial+intelligence&maxResults=5"
```

### Get Book by ISBN
```bash
curl "http://localhost:3001/api/books/isbn/9780134685991"
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": [...],
  "count": 5,
  "query": "search term"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Google Books API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Books API
4. Create credentials (API key)
5. Add the API key to your `.env` file

## Google Scholar Integration

Google Scholar integration uses web scraping techniques since there's no official API. The service includes:
- Puppeteer for reliable scraping
- Fallback HTTP requests
- Rate limiting and error handling
- User-agent rotation

## Development

### Project Structure
```
server/
├── middleware/          # Custom middleware
├── routes/             # API route handlers
├── services/           # External API services
├── server.js          # Main server file
├── package.json       # Dependencies
└── README.md         # This file
```

### Adding New Features

1. Create new service files in `services/`
2. Add route handlers in `routes/`
3. Update `server.js` to include new routes
4. Add tests for new functionality

## Error Handling

The server includes comprehensive error handling:
- Global error handler middleware
- API-specific error responses
- Logging for debugging
- Graceful fallbacks for external API failures

## Security

- Helmet.js for security headers
- CORS configuration
- Input validation
- Rate limiting (configurable)
- Environment variable protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

