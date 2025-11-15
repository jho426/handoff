# Quick Setup Guide

## What's Been Implemented

Your Nurse Handoff Helper now has two powerful AI-driven features:

### 1. **Image Analysis**
Upload photos of handoff whiteboards or documents and get AI-powered summaries with:
- Patient identifiers (name, room, MRN)
- Chief complaints and vital signs
- Medications and treatments
- Pending tasks and action items
- Safety concerns and alerts

### 2. **Patient Record Summarization**
Browse patient records and generate AI summaries highlighting:
- Patient overview and clinical status
- Key lab/imaging findings and trends
- Active medications and treatments
- Pending orders and tasks
- Safety concerns (allergies, fall risk, code status)

### 3. **Dual AI Provider Support**
Switch between **Claude Sonnet 4** and **GPT-4o** based on your preference or API availability.

---

## Setup Instructions

### 1. Add Your API Keys

Edit the `.env` file and add at least one API key:

```env
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

Get your keys from:
- **Claude**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/api-keys

### 2. Start the Application

```bash
npm start
```

This starts both:
- Backend server on http://localhost:3001
- Frontend on http://localhost:5173

Or run them separately:
```bash
npm run server  # Backend only
npm run dev     # Frontend only
```

### 3. Open the App

Navigate to **http://localhost:5173** in your browser.

---

## Usage

### Dashboard
1. Select your AI provider (Claude or OpenAI) from the top of the dashboard
2. Choose a feature:
   - **Analyze Handoff Document** - Upload image for AI analysis
   - **Patient Records Summary** - Browse and summarize patient data

### Image Analysis Workflow
1. Click "Analyze Handoff Document"
2. Drag & drop an image or click to select
3. Click "Analyze Document"
4. Copy the summary to clipboard

### Patient Records Workflow
1. Click "Patient Records Summary"
2. Click on any patient card to view details
3. Click "Generate AI Summary"
4. Copy the handoff summary to clipboard

---

## Technical Details

**Frontend Stack:**
- React 18 with Vite
- Tailwind CSS v4
- Lucide React icons

**Backend Stack:**
- Express.js server
- Anthropic SDK (Claude)
- OpenAI SDK (GPT-4o)
- Multer for file uploads

**Security:**
- API keys stored in `.env` (never exposed to client)
- All AI requests proxied through backend
- 10MB file upload limit
- `.env` gitignored

---

## Troubleshooting

**"API is not configured" error**
- Make sure you added an API key to `.env`
- Restart the server after editing `.env`

**Port already in use**
- Change `PORT=3001` in `.env` to another port
- Or kill the process using that port

**Build errors**
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall if needed

---

## Next Steps

Consider adding:
- User authentication
- Database for persistent patient records
- Real-time updates with WebSockets
- Voice-to-text for verbal handoffs
- Export summaries to PDF
- Integration with EHR systems
