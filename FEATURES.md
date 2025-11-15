# Nurse Handoff Helper - Feature Documentation

## Overview

This application provides AI-powered tools to streamline nurse-to-nurse patient handoffs by combining patient records, handoff document analysis, and intelligent note generation.

---

## Core Features

### 1. Patient Detail View & Handoff Management

**Location**: Click any patient from the Patient Records list

**Capabilities**:
- View complete patient information (demographics, vitals, medications)
- Generate AI-powered handoff notes from patient records
- Upload handoff whiteboard/document images
- Analyze images and merge with patient data
- Edit generated handoff notes
- Save notes to patient record
- Copy notes to clipboard

**Use Case**:
A nurse at shift change clicks on a patient, generates comprehensive handoff notes combining the EHR data with a photo of the handoff whiteboard, edits for accuracy, and shares with the incoming nurse.

---

### 2. AI Handoff Note Generation

**How it Works**:
1. Click "Generate from Record" on patient detail page
2. AI analyzes the patient's complete record including:
   - Demographics and admission details
   - Chief complaint and diagnosis
   - Vital signs and trends
   - Lab values and imaging findings
   - Active medications and orders
   - Allergies and safety concerns
3. Generates structured handoff summary in seconds

**Output Format**:
- Patient Overview
- Current Clinical Status
- Key Findings & Trends
- Active Treatments
- Pending Tasks
- Safety Alerts

**Supported AI Providers**:
- Claude Sonnet 4 (Anthropic)
- GPT-4o (OpenAI)

---

### 3. Image Upload & Analysis

**Two Methods**:

#### A. Standalone Image Analysis
- Dedicated feature for quick whiteboard analysis
- No patient record required
- Fast turnaround for shift change

#### B. Integrated with Patient Record
- Upload image from patient detail view
- AI extracts information from image:
  - Patient identifiers
  - Vital signs and measurements
  - Medications and treatments
  - Pending tasks and actions
  - Safety concerns
- Automatically merges image analysis with patient record
- Creates comprehensive handoff notes

**Supported Image Formats**:
- JPG, PNG, and other common formats
- Max file size: 10MB
- Drag & drop or click to upload

---

### 4. Editable Handoff Notes

**Features**:
- Generated notes are fully editable
- Real-time editing with textarea interface
- Markdown-style formatting preserved
- Auto-save functionality
- Version tracking with timestamps

**Workflow**:
1. Generate notes (from record and/or image)
2. Click "Edit" to enter edit mode
3. Modify content as needed
4. Click "Save" to store with patient record
5. Notes persist across sessions

---

### 5. Dual AI Provider Support

**Provider Selection**:
- Toggle between Claude and OpenAI from dashboard
- Both providers available for:
  - Patient record summarization
  - Image analysis
  - Handoff note generation

**API Key Management**:
- Secure storage in `.env` file
- Never exposed to client
- Can use one or both providers simultaneously

**Performance**:
- Claude Sonnet 4: Fast, detailed clinical analysis
- GPT-4o: Alternative with strong vision capabilities

---

## User Interface

### Dashboard
- Clean, modern design with Tailwind CSS v4
- Provider selection toggle
- Two main feature cards:
  1. Analyze Handoff Document (standalone)
  2. Patient Records (full workflow)

### Patient List
- Scrollable list of all patients
- Shows: Name, Room, Age, Sex, Chief Complaint
- Click any card to open detail view

### Patient Detail View
- **Left Column**: Patient summary
  - Demographics
  - Chief complaint
  - Code status
  - Medical history
  - Current vitals

- **Right Column**: Handoff generation
  - Generate buttons
  - Image upload area
  - Handoff notes editor
  - Action buttons (Edit, Copy, Save)

### Visual Feedback
- Loading spinners during AI processing
- Success messages (green)
- Error messages (red)
- Copy confirmation
- Real-time status updates

---

## Technical Implementation

### Frontend
- **React 18**: Modern component architecture
- **Vite**: Fast build and development
- **Tailwind CSS v4**: Utility-first styling
- **Lucide React**: Beautiful icon library

### Backend
- **Express.js**: RESTful API server
- **Multer**: File upload handling
- **Anthropic SDK**: Claude integration
- **OpenAI SDK**: GPT-4o integration

### Data Flow
1. User action → Frontend component
2. API request → Express backend
3. Backend validates and processes
4. Calls AI provider (Claude/OpenAI)
5. Returns structured response
6. Frontend displays results
7. Optional: Save to JSON file

### Security
- API keys stored server-side only
- Environment variables for configuration
- File upload size limits
- Input validation on all endpoints
- CORS configured for local development

---

## API Endpoints

### Patient Management
```
GET  /api/patients        - List all patients
GET  /api/patients/:id    - Get single patient
POST /api/patients/:id/handoff - Save handoff notes
```

### AI Analysis
```
POST /api/analyze-image/claude  - Image analysis (Claude)
POST /api/analyze-image/openai  - Image analysis (OpenAI)
POST /api/summarize-record/claude - Record summary (Claude)
POST /api/summarize-record/openai - Record summary (OpenAI)
```

### System
```
GET  /api/health  - Check server and provider status
```

---

## Data Persistence

### Patient Records
- Stored in `src/records.json`
- Includes complete clinical data
- Sample data for 5 patients provided

### Handoff Notes
- Saved to patient record object
- Fields added:
  - `handoffNotes`: The generated/edited notes
  - `imageAnalysis`: Image analysis results
  - `lastHandoffUpdate`: Timestamp

### Format
```json
{
  "patientId": "P301",
  "demographics": { ... },
  "vitals": { ... },
  "handoffNotes": "AI-generated summary...",
  "imageAnalysis": "Image findings...",
  "lastHandoffUpdate": "2025-11-15T16:45:00.000Z"
}
```

---

## Future Enhancements

### Potential Features
- Voice-to-text for verbal handoffs
- Export handoff notes to PDF
- Email/SMS sharing
- Real-time collaboration
- Handoff history tracking
- Integration with EHR systems
- Mobile app version
- Offline mode
- Multi-language support

### Infrastructure
- Database (PostgreSQL/MongoDB)
- User authentication (OAuth)
- Role-based access control
- Audit logging
- HIPAA compliance measures
- Cloud deployment (AWS/Azure)

---

## Best Practices

### For Nurses
1. Always review AI-generated notes for accuracy
2. Add clinical judgment and context
3. Verify critical values before handoff
4. Use images to supplement, not replace, documentation
5. Keep handoff notes concise but complete

### For Administrators
1. Regularly update patient records
2. Monitor API usage and costs
3. Train staff on proper usage
4. Maintain API key security
5. Regular backups of patient data

### For Developers
1. Keep dependencies updated
2. Follow HIPAA guidelines
3. Test with realistic data
4. Monitor error rates
5. Optimize AI prompts for clinical accuracy

---

## Support & Resources

- **README.md**: Setup and installation guide
- **SETUP.md**: Quick start instructions
- **GitHub Issues**: Bug reports and feature requests
- **API Documentation**: Detailed endpoint specs

For questions or support, please refer to the main README.md file.
