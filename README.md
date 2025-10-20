# eInformation Hub

A modern digital library application with integrated Google Books and Google Scholar search capabilities for automatic book and paper data population.

## 🌟 Features

### Frontend (UI)
- **Interactive Knowledge Planet**: Visual representation of your library with animated particles
- **Floating Dock Interface**: Modern, macOS-inspired navigation
- **Advanced Search**: Search through your library with real-time results
- **Add New Items**: Comprehensive form with auto-fill from external sources
- **Statistics Dashboard**: View library analytics and insights
- **Theme Customization**: Multiple color themes for personalization
- **Responsive Design**: Works on desktop and mobile devices

### Backend (Server)
- **Google Books API Integration**: Search and retrieve book information
- **Google Scholar Integration**: Search academic papers and research articles
- **Auto-fill Functionality**: Automatically populate form fields with book/paper data
- **RESTful API**: Clean and well-documented endpoints
- **Error Handling**: Comprehensive error handling and logging
- **Security**: Helmet.js for security headers, CORS configuration

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Google Books API key (optional but recommended for full functionality)

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd eInformation-Hub
   ```

2. **Start the backend server**
   ```bash
   # Option 1: Use the startup script (recommended)
   ./start-server.sh
   
   # Option 2: Manual setup
   cd server
   npm install
   cp env.example .env
   # Edit .env file to add your Google Books API key
   npm start
   ```

3. **Open the frontend**
   - Open `UI/index.html` in your web browser
   - Or serve it using a local server (recommended for development)

### Using a Local Server (Recommended)

For the best experience, serve the UI through a local server:

```bash
# Using Python 3
cd UI
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server UI -p 8000

# Using PHP
cd UI
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 📚 How to Use

### Adding New Items with Auto-fill

1. **Click the "Add New" button** in the floating dock
2. **Choose your method**:
   - **Search**: Type in the search bar to find books/papers
   - **Scan**: Click the 📷 camera button to scan a book cover
3. **For Search**: Select from results that appear from:
   - 📚 Google Books (books and publications)
   - 📄 Google Scholar (academic papers and research)
   - 📖 Your existing library (for reference)
4. **For Scan**: 
   - Position the book cover within the camera frame
   - Click "Capture" to take a photo
   - Click "Process Image" to analyze with AI
   - The AI will extract book information and search for matches
5. **Click on any result** to auto-fill the form with:
   - Title, author, and publication year
   - Page count, language, and category
   - Cover image URL and summary
   - Rating (if available from Google Books)
6. **Review and modify** any fields as needed
7. **Click "Add to Library"** to save the item

### Search Your Library

1. **Click the "Search" button** in the floating dock
2. **Type your search term** to find items by:
   - Title
   - Author
   - Category
   - Type (book, paper, article, report)
3. **View results** with detailed information
4. **Click on items** in the knowledge planet for quick details

### View Statistics

1. **Click the "Statistics" button** in the floating dock
2. **View your library analytics**:
   - Total items count
   - Items by type
   - Recent additions

## 🔧 Configuration

### Google Books API Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Books API
4. Create credentials (API key)
5. Add the API key to your `server/.env` file:
   ```env
   GOOGLE_BOOKS_API_KEY=your_api_key_here
   ```

**Note**: Without an API key, Google Books search will not work, but Google Scholar and library search will still function.

### Server Configuration

Edit `server/.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Google Books API
GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here

# CORS Configuration
CORS_ORIGIN=http://localhost:8000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🛠️ Development

### Project Structure
```
eInformation-Hub/
├── UI/                    # Frontend application
│   ├── index.html        # Main HTML file
│   ├── script.js         # JavaScript functionality
│   └── styles.css        # CSS styles
├── server/               # Backend API server
│   ├── routes/           # API route handlers
│   ├── services/         # External API services
│   ├── middleware/       # Custom middleware
│   ├── server.js         # Main server file
│   └── package.json      # Dependencies
├── start-server.sh       # Server startup script
└── README.md            # This file
```

### API Endpoints

#### Health Check
- `GET /health` - Server health status

#### Google Books API
- `GET /api/books/search?q={query}&maxResults={number}` - Search books
- `GET /api/books/isbn/{isbn}` - Get book by ISBN
- `GET /api/books/author/{author}` - Search books by author
- `GET /api/books/title/{title}` - Search books by title
- `GET /api/books/subject/{subject}` - Search books by subject
- `GET /api/books/advanced` - Advanced search with multiple parameters

#### Google Scholar API
- `GET /api/scholar/search?q={query}&maxResults={number}` - Search academic papers
- `GET /api/scholar/author/{author}` - Search papers by author
- `GET /api/scholar/title/{title}` - Search papers by title
- `GET /api/scholar/year/{year}` - Search papers by year
- `GET /api/scholar/advanced` - Advanced search with multiple parameters
- `GET /api/scholar/details?url={paper_url}` - Get detailed paper information

### Scan API (Camera + AI)
- `POST /api/scan/extract` - Extract book information from image using Gemini AI
- `POST /api/scan/search` - Search for books using extracted information
- `POST /api/scan/process` - Complete scan process (extract + search)

### Running in Development Mode

1. **Start the backend server in development mode:**
   ```bash
   cd server
   npm run dev
   ```

2. **Serve the frontend:**
   ```bash
   cd UI
   python -m http.server 8000
   ```

3. **Open your browser** to `http://localhost:8000`

## 🎨 Customization

### Themes
The application supports multiple color themes:
- White (default)
- Blue
- Purple

Access themes through the Settings panel (click the Settings button in the floating dock).

### Adding New Item Types
To add new item types, modify the `item-type` select options in `UI/index.html` and update the corresponding logic in `UI/script.js`.

## 🔒 Security

- **CORS Configuration**: Properly configured for cross-origin requests
- **Input Validation**: All API inputs are validated
- **Error Handling**: Comprehensive error handling prevents information leakage
- **Rate Limiting**: Configurable rate limiting to prevent abuse

## 🐛 Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if Node.js is installed (v16+)
   - Ensure all dependencies are installed (`npm install`)
   - Check if port 3001 is available

2. **Google Books search not working**
   - Verify your API key is correctly set in `.env`
   - Check if the Google Books API is enabled in Google Cloud Console
   - Ensure you have sufficient API quota

3. **Google Scholar search not working**
   - Google Scholar uses web scraping and may be rate-limited
   - Check your internet connection
   - Try again after a few minutes

4. **Frontend not connecting to backend**
   - Ensure the server is running on port 3001
   - Check CORS configuration in server settings
   - Verify the frontend is being served from a web server (not file://)

### Getting Help

1. Check the browser console for JavaScript errors
2. Check the server console for backend errors
3. Verify all dependencies are installed correctly
4. Ensure your environment variables are set properly

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- Google Books API for book data
- Google Scholar for academic paper data
- Modern web technologies and libraries
- Open source community

---

**Happy reading and researching! 📚✨**
