import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Initialize AI clients
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    availableProviders: {
      claude: !!anthropic,
      openai: !!openai,
    },
  });
});

// Analyze handoff image with Claude
app.post(
  "/api/analyze-image/claude",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!anthropic) {
        return res.status(503).json({
          error:
            "Claude API is not configured. Please add ANTHROPIC_API_KEY to .env file.",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const base64Image = req.file.buffer.toString("base64");
      const mediaType = req.file.mimetype;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: "text",
                text: `You are a clinical nursing assistant analyzing a handoff document or whiteboard. Please extract and summarize the following information:

1. Patient identifiers (name, room number, MRN if visible)
2. Chief complaint or reason for admission
3. Key vital signs or measurements
4. Important medications or treatments
5. Pending tasks or actions needed
6. Any safety concerns or alerts

Format the output as a clear, organized summary suitable for nurse handoff. If any information is unclear or not visible, note that. Keep the summary concise and focused on actionable items.`,
              },
            ],
          },
        ],
      });

      const summary = message.content[0].text;
      res.json({ summary, provider: "claude" });
    } catch (error) {
      console.error("Claude API error:", error);
      res.status(500).json({
        error: "Failed to analyze image with Claude",
        details: error.message,
      });
    }
  }
);

// Analyze handoff image with OpenAI
app.post(
  "/api/analyze-image/openai",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!openai) {
        return res.status(503).json({
          error:
            "OpenAI API is not configured. Please add OPENAI_API_KEY to .env file.",
        });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const base64Image = req.file.buffer.toString("base64");
      const mediaType = req.file.mimetype;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are a clinical nursing assistant analyzing a handoff document or whiteboard. Please extract and summarize the following information:

1. Patient identifiers (name, room number, MRN if visible)
2. Chief complaint or reason for admission
3. Key vital signs or measurements
4. Important medications or treatments
5. Pending tasks or actions needed
6. Any safety concerns or alerts

Format the output as a clear, organized summary suitable for nurse handoff. If any information is unclear or not visible, note that. Keep the summary concise and focused on actionable items.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
      });

      const summary = response.choices[0].message.content;
      res.json({ summary, provider: "openai" });
    } catch (error) {
      console.error("OpenAI API error:", error);
      res.status(500).json({
        error: "Failed to analyze image with OpenAI",
        details: error.message,
      });
    }
  }
);

// Summarize patient record with Claude
app.post("/api/summarize-record/claude", async (req, res) => {
  try {
    if (!anthropic) {
      return res.status(503).json({
        error:
          "Claude API is not configured. Please add ANTHROPIC_API_KEY to .env file.",
      });
    }

    const { patientData } = req.body;

    if (!patientData) {
      return res.status(400).json({ error: "No patient data provided" });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `You are a clinical nursing assistant. Please analyze this patient record and create a concise handoff summary for the incoming nurse. Focus on:

1. Patient overview and chief complaint
2. Current clinical status and vital signs
3. Key lab/imaging findings and trends
4. Active medications and treatments
5. Pending orders or tasks
6. Safety concerns (allergies, fall risk, code status, etc.)

Patient Record:
${JSON.stringify(patientData, null, 2)}

Provide a clear, actionable summary suitable for nurse-to-nurse handoff.`,
        },
      ],
    });

    const summary = message.content[0].text;
    res.json({ summary, provider: "claude" });
  } catch (error) {
    console.error("Claude API error:", error);
    res.status(500).json({
      error: "Failed to summarize record with Claude",
      details: error.message,
    });
  }
});

// Summarize patient record with OpenAI
app.post("/api/summarize-record/openai", async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error:
          "OpenAI API is not configured. Please add OPENAI_API_KEY to .env file.",
      });
    }

    const { patientData } = req.body;

    if (!patientData) {
      return res.status(400).json({ error: "No patient data provided" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `You are a clinical nursing assistant. Please analyze this patient record and create a concise handoff summary for the incoming nurse. Focus on:

1. Patient overview and chief complaint
2. Current clinical status and vital signs
3. Key lab/imaging findings and trends
4. Active medications and treatments
5. Pending orders or tasks
6. Safety concerns (allergies, fall risk, code status, etc.)

Patient Record:
${JSON.stringify(patientData, null, 2)}

Provide a clear, actionable summary suitable for nurse-to-nurse handoff.`,
        },
      ],
      max_tokens: 2048,
    });

    const summary = response.choices[0].message.content;
    res.json({ summary, provider: "openai" });
  } catch (error) {
    console.error("OpenAI API error:", error);
    res.status(500).json({
      error: "Failed to summarize record with OpenAI",
      details: error.message,
    });
  }
});

// Get all patient records
app.get("/api/patients", (req, res) => {
  try {
    const recordsPath = path.join(__dirname, "../src/records.json");
    const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
    res.json(records);
  } catch (error) {
    console.error("Error reading patient records:", error);
    res.status(500).json({ error: "Failed to read patient records" });
  }
});

// Get single patient record
app.get("/api/patients/:id", (req, res) => {
  try {
    const recordsPath = path.join(__dirname, "../src/records.json");
    const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
    const patient = records.find((p) => p.patient_id === req.params.id);

    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    res.json(patient);
  } catch (error) {
    console.error("Error reading patient record:", error);
    res.status(500).json({ error: "Failed to read patient record" });
  }
});

// Save handoff notes for a patient
app.post("/api/patients/:id/handoff", (req, res) => {
  try {
    const { handoffNotes, imageAnalysis, timestamp } = req.body;
    const recordsPath = path.join(__dirname, "../src/records.json");

    // Read current records
    const data = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
    const records = data.patients || data;

    // Find patient index
    const patientIndex = records.findIndex(
      (p) => (p.patientId || p.patient_id) === req.params.id
    );

    if (patientIndex === -1) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Update patient with handoff notes
    records[patientIndex].handoffNotes = handoffNotes;
    records[patientIndex].imageAnalysis = imageAnalysis;
    records[patientIndex].lastHandoffUpdate = timestamp;

    // Write back to file
    const updatedData = data.patients ? { patients: records } : records;
    fs.writeFileSync(recordsPath, JSON.stringify(updatedData, null, 2));

    res.json({
      success: true,
      message: "Handoff notes saved successfully",
      patient: records[patientIndex],
    });
  } catch (error) {
    console.error("Error saving handoff notes:", error);
    res.status(500).json({ error: "Failed to save handoff notes" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available AI providers:`);
  console.log(`- Claude: ${anthropic ? "✓" : "✗"}`);
  console.log(`- OpenAI: ${openai ? "✓" : "✗"}`);
});
