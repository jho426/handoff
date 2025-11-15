import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

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

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ""
);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    availableProviders: {
      claude: !!anthropic,
      supabase: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
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


// Get all patient records with room and task info
app.get("/api/patients", async (req, res) => {
  try {
    const { data: patients, error } = await supabase
      .from("patients")
      .select(`
        *,
        rooms (
          id,
          grid_x,
          grid_y
        )
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Get tasks for each patient
    const patientsWithTasks = await Promise.all(
      patients.map(async (patient) => {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("patient_id", patient.id)
          .order("time", { ascending: true });

        return {
          ...patient,
          tasks: tasks || [],
        };
      })
    );

    res.json(patientsWithTasks);
  } catch (error) {
    console.error("Error reading patient records:", error);
    res.status(500).json({
      error: "Failed to read patient records",
      details: error.message,
    });
  }
});

// Get single patient record
app.get("/api/patients/:id", async (req, res) => {
  try {
    const { data: patient, error } = await supabase
      .from("patients")
      .select(`
        *,
        rooms (
          id,
          grid_x,
          grid_y
        ),
        tasks (*)
      `)
      .eq("patient_id", req.params.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Patient not found" });
      }
      throw error;
    }

    res.json(patient);
  } catch (error) {
    console.error("Error reading patient record:", error);
    res.status(500).json({
      error: "Failed to read patient record",
      details: error.message,
    });
  }
});

// Save handoff notes for a patient
app.post("/api/patients/:id/handoff", async (req, res) => {
  try {
    const { handoffNotes, imageAnalysis, timestamp } = req.body;

    // Find patient by patient_id
    const { data: patient, error: findError } = await supabase
      .from("patients")
      .select("id")
      .eq("patient_id", req.params.id)
      .single();

    if (findError || !patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // Update patient with handoff notes
    const { data: updatedPatient, error: updateError } = await supabase
      .from("patients")
      .update({
        handoff_notes: handoffNotes,
        image_analysis: imageAnalysis,
        last_handoff_update: timestamp || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", patient.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({
      success: true,
      message: "Handoff notes saved successfully",
      patient: updatedPatient,
    });
  } catch (error) {
    console.error("Error saving handoff notes:", error);
    res.status(500).json({
      error: "Failed to save handoff notes",
      details: error.message,
    });
  }
});

// Get all nurses
app.get("/api/nurses", async (req, res) => {
  try {
    const { data: nurses, error } = await supabase
      .from("nurses")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    res.json(nurses);
  } catch (error) {
    console.error("Error reading nurses:", error);
    res.status(500).json({
      error: "Failed to read nurses",
      details: error.message,
    });
  }
});

// Get all rooms with patient and nurse info
app.get("/api/rooms", async (req, res) => {
  try {
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select(`
        *,
        patients (*),
        room_assignments (
          nurses (*)
        )
      `)
      .order("id", { ascending: true });

    if (error) throw error;

    res.json(rooms);
  } catch (error) {
    console.error("Error reading rooms:", error);
    res.status(500).json({
      error: "Failed to read rooms",
      details: error.message,
    });
  }
});

// Get all tasks
app.get("/api/tasks", async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        *,
        patients (name, patient_id),
        rooms (id)
      `)
      .order("time", { ascending: true });

    if (error) throw error;

    res.json(tasks);
  } catch (error) {
    console.error("Error reading tasks:", error);
    res.status(500).json({
      error: "Failed to read tasks",
      details: error.message,
    });
  }
});

// Create a new task
app.post("/api/tasks", async (req, res) => {
  try {
    const { patient_id, room_id, time, type, description, priority } = req.body;

    const { data: task, error } = await supabase
      .from("tasks")
      .insert([
        {
          patient_id,
          room_id,
          time,
          type,
          description,
          priority,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({
      error: "Failed to create task",
      details: error.message,
    });
  }
});

// Update task completion status
app.patch("/api/tasks/:id", async (req, res) => {
  try {
    const { completed } = req.body;

    const { data: task, error } = await supabase
      .from("tasks")
      .update({ completed })
      .eq("id", req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      error: "Failed to update task",
      details: error.message,
    });
  }
});

// Get all logs
app.get("/api/logs", async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from("logs")
      .select("*")
      .order("time", { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(logs);
  } catch (error) {
    console.error("Error reading logs:", error);
    res.status(500).json({
      error: "Failed to read logs",
      details: error.message,
    });
  }
});

// Create a new log entry
app.post("/api/logs", async (req, res) => {
  try {
    const { nurse, room, action, details } = req.body;

    const { data: log, error } = await supabase
      .from("logs")
      .insert([
        {
          nurse,
          room,
          action,
          details,
          time: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.json(log);
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({
      error: "Failed to create log",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available services:`);
  console.log(`- Claude: ${anthropic ? "✓" : "✗"}`);
  console.log(
    `- Supabase: ${process.env.SUPABASE_URL ? "✓" : "✗"}`
  );
});
