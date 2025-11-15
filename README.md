# Nurse Handoff Helper

An AI-powered web application designed to streamline nurse-to-nurse patient handoffs. This tool uses advanced AI (Claude and OpenAI) to analyze handoff documents and summarize patient records, making critical information easily accessible.

## Features

- **Image Analysis**: Upload photos of handoff whiteboards or documents to get AI-powered summaries
- **Patient Records**: View and generate AI summaries of patient records with key clinical information
- **Dual AI Support**: Choose between Claude Sonnet 4 or GPT-4o for analysis
- **Copy-to-Clipboard**: Easily copy summaries for quick reference
- **Modern UI**: Clean, intuitive interface built with React and Tailwind CSS

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn
- An API key from either:
  - [Anthropic](https://console.anthropic.com/) for Claude
  - [OpenAI](https://platform.openai.com/api-keys) for GPT-4o
  - Or both!

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` and add your API key(s):
```env
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

**Note**: You need at least one API key configured for the app to work.

### Running the Application

Start both the backend server and frontend development server:
```bash
npm start
```

Or run them separately:

**Backend server** (runs on port 3001):
```bash
npm run server
```

**Frontend development server** (runs on port 5173):
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Usage

### Analyzing Handoff Documents

1. Select your preferred AI provider (Claude or OpenAI) from the dashboard
2. Click "Analyze Handoff Document"
3. Upload an image of a handoff whiteboard or sheet
4. Click "Analyze Document" to get an AI-generated summary
5. Copy the summary to share with your team

### Viewing Patient Records

1. Select your preferred AI provider from the dashboard
2. Click "Patient Records Summary"
3. Click on any patient to view their details
4. Click "Generate AI Summary" to get a handoff-ready summary
5. Copy the summary for your handoff notes

## API Endpoints

The backend server provides the following endpoints:

- `GET /api/health` - Check server status and available AI providers
- `POST /api/analyze-image/claude` - Analyze image with Claude
- `POST /api/analyze-image/openai` - Analyze image with OpenAI
- `POST /api/summarize-record/claude` - Summarize patient record with Claude
- `POST /api/summarize-record/openai` - Summarize patient record with OpenAI
- `GET /api/patients` - Get all patient records
- `GET /api/patients/:id` - Get specific patient record

## Project Structure

```
handoff/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard component
│   │   ├── ImageAnalyzer.jsx   # Image upload and analysis
│   │   └── PatientRecords.jsx  # Patient records viewer
│   ├── pages/
│   │   └── handoffUploadImage.jsx  # Legacy component (not used)
│   ├── App.jsx           # Root component
│   ├── main.jsx          # Application entry point
│   ├── index.css         # Global styles with Tailwind
│   └── records.json      # Sample patient data
├── server/
│   └── index.js          # Express backend server
├── .env.example          # Environment variables template
├── tailwind.config.js    # Tailwind CSS configuration
├── vite.config.js        # Vite configuration
└── package.json          # Project dependencies
```

## Technologies Used

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (icons)
- **Backend**: Express, Node.js
- **AI Integration**: Anthropic SDK (Claude), OpenAI SDK
- **File Upload**: Multer
- **Environment**: dotenv

## Security Notes

- API keys are stored in `.env` file and never exposed to the client
- The `.env` file is gitignored to prevent accidental commits
- All AI requests are proxied through the backend server
- File uploads are limited to 10MB

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Troubleshooting

### "API is not configured" error

Make sure you have added at least one API key to your `.env` file and restarted the server.

### Server not starting

Check that port 3001 is not already in use. You can change the port in `.env`:
```env
PORT=3002
```

### Images not analyzing

Ensure your image file is under 10MB and in a supported format (JPG, PNG, etc.)

## Contributing

This is a healthcare application. When contributing, please ensure:
- Patient data remains confidential and secure
- HIPAA compliance considerations are followed
- Code changes don't introduce security vulnerabilities

## License

This project is for educational and healthcare improvement purposes.