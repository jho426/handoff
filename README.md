# Nurse Handoff Helper

An AI-powered web application designed to streamline nurse-to-nurse patient handoffs. This tool uses advanced AI (Claude and OpenAI) to analyze handoff documents and summarize patient records, making critical information easily accessible.

## Features

- **Comprehensive Patient Detail View**: Click any patient to access their full record with:
  - Complete medical history and vital signs
  - AI-powered handoff note generation
  - Image upload and analysis capabilities
  - Editable handoff notes with auto-save

- **AI Handoff Note Generation**: Generate structured handoff notes from patient records with:
  - Patient overview and clinical status
  - Key lab findings and trends
  - Active medications and pending orders
  - Safety concerns and alerts

- **Image Upload & Integration**: Upload handoff whiteboard photos or documents and:
  - Get AI analysis of handoff images
  - Automatically merge image analysis with patient records
  - Create comprehensive handoff notes combining multiple sources

- **Dual AI Support**: Choose between Claude Sonnet 4 or GPT-4o for analysis
- **Edit & Save**: Edit generated notes and save to patient record
- **Copy-to-Clipboard**: Easily copy summaries for quick reference
- **Modern UI**: Clean, intuitive interface built with React and Tailwind CSS v4

## Getting Started

### Prerequisites

- Node.js (version 18 or higher recommended)
- npm or yarn
- A Supabase project with:
  - Supabase URL and anon key
  - Service role key (for creating nurse accounts)
  - A `nurses` table with at least `id`, `email`, `name` columns
  - Optional: `auth_user_id` column to link auth users to nurse records
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

3. Edit `.env` and add your configuration:
```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# AI API Keys (at least one required)
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here
```

**Note**: 
- Supabase credentials are required for authentication
- You need at least one AI API key configured for the app to work
- The service role key is needed for the account creation endpoint

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

### Setting Up Nurse Accounts

The app uses Supabase Auth for authentication. To create accounts for nurses in your database:

1. **Ensure your `nurses` table has the required columns:**
   - `id` (primary key)
   - `email` (unique, required)
   - `name` (required)
   - `auth_user_id` (optional, will be populated automatically)

2. **Create auth accounts for existing nurses:**
   ```bash
   # Make a POST request to the account creation endpoint
   curl -X POST http://localhost:3001/api/nurses/create-accounts
   ```
   
   This will:
   - Create Supabase Auth accounts for all nurses in your database
   - Link auth users to nurse records
   - Return temporary passwords for each created account
   - Skip nurses that already have accounts

3. **Nurses can now log in** using their email and the temporary password (they should change it on first login)

**Note**: The account creation endpoint requires `SUPABASE_SERVICE_KEY` to be set in your `.env` file.

## Usage

### Patient Handoff Workflow

1. **Select AI Provider**: Choose Claude or OpenAI from the dashboard
2. **Browse Patients**: Click "Patient Records Summary" to see all patients
3. **Select Patient**: Click on any patient card to open their detailed view
4. **Generate Handoff Notes**: Click "Generate from Record" to create AI-powered notes
5. **Add Images (Optional)**: Click "Upload Handoff Image" to add whiteboard photos
   - The AI will analyze the image and merge it with the patient record
6. **Edit Notes**: Click "Edit" to modify the generated handoff notes
7. **Save**: Click "Save" to store notes with the patient record
8. **Copy & Share**: Use "Copy" button to quickly share notes with your team

### Standalone Image Analysis

1. Select your AI provider from the dashboard
2. Click "Analyze Handoff Document"
3. Upload an image of a handoff whiteboard or sheet
4. Click "Analyze Document" to get an AI-generated summary
5. Copy the summary to share with your team

## API Endpoints

The backend server provides the following endpoints:

- `GET /api/health` - Check server status and available AI providers
- `POST /api/analyze-image/claude` - Analyze image with Claude
- `POST /api/analyze-image/openai` - Analyze image with OpenAI
- `POST /api/summarize-record/claude` - Summarize patient record with Claude
- `POST /api/summarize-record/openai` - Summarize patient record with OpenAI
- `GET /api/patients` - Get all patient records
- `GET /api/patients/:id` - Get specific patient record
- `POST /api/patients/:id/handoff` - Save handoff notes for a patient
- `GET /api/nurses` - Get all nurses
- `POST /api/nurses/create-accounts` - Create Supabase Auth accounts for nurses in database

## Project Structure

```
handoff/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx       # Main dashboard component
│   │   ├── ImageAnalyzer.jsx   # Standalone image analysis
│   │   ├── PatientRecords.jsx  # Patient list viewer
│   │   └── PatientDetail.jsx   # Detailed patient view with handoff generation
│   ├── pages/
│   │   └── handoffUploadImage.jsx  # Legacy component (not used)
│   ├── App.jsx           # Root component
│   ├── main.jsx          # Application entry point
│   ├── index.css         # Global styles with Tailwind v4
│   └── records.json      # Sample patient data
├── server/
│   └── index.js          # Express backend server
├── .env                  # Environment variables (your API keys)
├── .env.example          # Environment variables template
├── postcss.config.js     # PostCSS configuration for Tailwind v4
├── vite.config.js        # Vite configuration
└── package.json          # Project dependencies
```

## Technologies Used

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React (icons)
- **Backend**: Express, Node.js
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
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