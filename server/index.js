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

// Initialize Supabase admin client (requires service role key for admin operations)
const supabaseAdmin = process.env.SUPABASE_SERVICE_KEY
  ? createClient(
      process.env.SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  : null;

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

1. Patient overview and Shift-Level Forecast
2. Current clinical status and vital signs
3. Key lab/imaging findings and trends
4. Active medications and treatments
5. TASK STATUS - Completed and outstanding tasks (VERY IMPORTANT)
6. Safety concerns (allergies, fall risk, code status, etc.)

WE CARE A LOT ABOUT TRENDS - If there are trends in vitals, labs, or condition changes, highlight them clearly.

note:
Shift-Level Forecast ("Tonight's Workload Prediction") is
A “weather forecast” for the shift:
⛈️ High workload spike predicted at 2AM
— meds cluster
— labs returning
— vitals rechecks
— imaging scheduled
☀️ Stable period from 4–6AM
Visually:
Line chart of predicted “task load intensity”
Color-coded timeline
Alerts like: “Expect 4 high-acuity events within next 3 hours.”
This makes the app feel like mission control.

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

    const { patientData, previousNotes, imageAnalysis } = req.body;

    if (!patientData) {
      return res.status(400).json({ error: "No patient data provided" });
    }

    // Extract task information
    const tasks = patientData.tasks || [];
    const completedTasks = tasks.filter((t) => t.completed);
    const pendingTasks = tasks.filter((t) => !t.completed);

    console.log("=== TASK SUMMARY ===");
    console.log("Total tasks:", tasks.length);
    console.log("Completed:", completedTasks.length);
    console.log("Pending:", pendingTasks.length);
    console.log("Image analysis provided:", !!imageAnalysis);

    let promptContent = `You are a clinical nursing assistant. Please analyze this patient record and create a concise handoff summary for the incoming nurse. Focus on:

1. Patient overview and Shift-Level Forecast
2. Current clinical status and vital signs
3. Key lab/imaging findings and trends
4. Active medications and treatments
5. TASK STATUS - Completed and outstanding tasks (VERY IMPORTANT)
6. Safety concerns (allergies, fall risk, code status, etc.)

WE CARE A LOT ABOUT TRENDS - If there are trends in vitals, labs, or condition changes, highlight them clearly.

note:
Shift-Level Forecast ("Tonight's Workload Prediction") is
A “weather forecast” for the shift:
⛈️ High workload spike predicted at 2AM
— meds cluster
— labs returning
— vitals rechecks
— imaging scheduled
☀️ Stable period from 4–6AM
Visually:
Line chart of predicted “task load intensity”
Color-coded timeline
Alerts like: “Expect 4 high-acuity events within next 3 hours.”
This makes the app feel like mission control.

Patient Record:
${JSON.stringify(patientData, null, 2)}

TASK COMPLETION STATUS:
- Total Tasks: ${tasks.length}
- Completed Tasks: ${completedTasks.length}
- Outstanding Tasks: ${pendingTasks.length}

${
  completedTasks.length > 0
    ? `COMPLETED TASKS (${completedTasks.length}):
${completedTasks
  .map(
    (t) => `✓ ${t.time} - ${t.description} (${t.priority} priority, ${t.type})`
  )
  .join("\n")}
`
    : ""
}
${
  pendingTasks.length > 0
    ? `OUTSTANDING TASKS (${pendingTasks.length}) - REQUIRES ATTENTION:
${pendingTasks
  .map(
    (t) => `⚠ ${t.time} - ${t.description} (${t.priority} priority, ${t.type})`
  )
  .join("\n")}
`
    : ""
}

IMPORTANT: In your handoff summary, include a dedicated section for "Task Status" that clearly shows:
- What tasks have been completed during this shift
- What outstanding tasks remain and their priority
- Any time-sensitive tasks that need immediate attention
- Organize outstanding tasks by priority (critical → high → medium → low)`;

    if (imageAnalysis) {
      promptContent += `

HANDOFF DOCUMENT IMAGE ANALYSIS:
The following information was extracted from an uploaded handoff whiteboard/document image:

${imageAnalysis}

IMPORTANT: Integrate this image information throughout your handoff summary:
- Merge any vitals from the image with the patient record (prioritize most recent)
- Incorporate medications, orders, or tasks mentioned in the image into appropriate sections
- Cross-reference information between the image and patient record
- If the image contains newer or conflicting information, note this clearly with **IMAGE UPDATE:** prefix
- Do NOT create a separate "Image Analysis" section - instead weave this information naturally into the appropriate sections
- The image may contain handwritten notes or whiteboard information that supplements the electronic record`;
    }

    if (previousNotes) {
      promptContent += `

PREVIOUS HANDOFF NOTES:
${previousNotes}

IMPORTANT: Compare the current patient data with the previous handoff notes. In your summary:
- Start with "## Changes Since Last Handoff" section highlighting what has changed (vitals, medications, status, new orders, tasks completed, etc.)
- Use **CHANGED:** prefix for items that differ from previous notes
- Use **NEW:** prefix for items not mentioned in previous notes
- Use **RESOLVED:** prefix for issues that were in previous notes but are now resolved
- Use **COMPLETED:** prefix for tasks that were pending in previous notes but are now done
- Then provide the complete current handoff summary including task status

This helps the incoming nurse quickly identify what's different and what requires immediate attention.`;
    }

    promptContent += `

Provide a clear, actionable summary suitable for nurse-to-nurse handoff. Make task status prominent and easy to scan.${
      imageAnalysis
        ? " Ensure all information from the handoff image is naturally integrated into the appropriate sections, not listed separately."
        : ""
    }`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: promptContent,
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
      .select(
        `
        *,
        rooms (
          id,
          grid_x,
          grid_y
        )
      `
      )
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
      .select(
        `
        *,
        rooms (
          id,
          grid_x,
          grid_y
        ),
        tasks (*)
      `
      )
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

// Update patient information
app.patch("/api/patients/:id", async (req, res) => {
  try {
    const {
      name,
      age,
      sex,
      codeStatus,
      chiefComplaint,
      medications,
      allergies,
    } = req.body;

    console.log("=== PATIENT UPDATE REQUEST ===");
    console.log("Patient ID (from URL):", req.params.id);
    console.log("Update data:", req.body);

    // Find patient by mrn
    const { data: patient, error: findError } = await supabase
      .from("patients")
      .select("id, mrn, patient_id")
      .eq("mrn", req.params.id)
      .single();

    console.log("Patient found:", patient);
    console.log("Find error:", findError);

    if (findError || !patient) {
      console.error("Patient not found");
      return res.status(404).json({
        error: "Patient not found",
        searchedMRN: req.params.id,
      });
    }

    // Update patient
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (age !== undefined) updateData.age = age;
    if (sex !== undefined) updateData.sex = sex;
    if (codeStatus !== undefined) updateData.code_status = codeStatus;
    if (chiefComplaint !== undefined) updateData.condition = chiefComplaint;
    if (medications !== undefined) updateData.medications = medications;
    if (allergies !== undefined) updateData.allergies = allergies;
    updateData.updated_at = new Date().toISOString();

    console.log("Update payload:", updateData);

    const { data: updatedPatient, error: updateError } = await supabase
      .from("patients")
      .update(updateData)
      .eq("id", patient.id)
      .select()
      .single();

    console.log("Update result:", updatedPatient);
    console.log("Update error:", updateError);

    if (updateError) {
      console.error("Update failed:", updateError);
      throw updateError;
    }

    console.log("✓ Patient updated successfully");
    console.log("=== END PATIENT UPDATE ===");

    res.json({
      success: true,
      message: "Patient information updated successfully",
      patient: updatedPatient,
    });
  } catch (error) {
    console.error("=== PATIENT UPDATE ERROR ===");
    console.error("Error:", error);
    res.status(500).json({
      error: "Failed to update patient information",
      details: error.message,
    });
  }
});

// Save handoff notes for a patient
app.post("/api/patients/:id/handoff", async (req, res) => {
  try {
    const { handoffNotes, imageAnalysis, timestamp } = req.body;

    console.log("=== HANDOFF SAVE REQUEST ===");
    console.log("Patient ID (from URL):", req.params.id);
    console.log("Handoff notes length:", handoffNotes?.length || 0);
    console.log("Image analysis length:", imageAnalysis?.length || 0);
    console.log("Timestamp:", timestamp);

    // Find patient by mrn (which is passed as :id)
    console.log("Searching for patient with mrn:", req.params.id);
    const { data: patient, error: findError } = await supabase
      .from("patients")
      .select("id, mrn, patient_id")
      .eq("mrn", req.params.id)
      .single();

    console.log("Patient search result:", patient);
    console.log("Patient search error:", findError);

    if (findError || !patient) {
      console.error("Patient not found. Error:", findError);
      return res.status(404).json({
        error: "Patient not found",
        searchedMRN: req.params.id,
        supabaseError: findError,
      });
    }

    console.log("Found patient:", {
      id: patient.id,
      mrn: patient.mrn,
      patient_id: patient.patient_id,
    });

    // Update patient with handoff notes using the database id
    console.log("Updating patient with id:", patient.id);
    const updatePayload = {
      handoff_notes: handoffNotes,
      image_analysis: imageAnalysis,
      last_handoff_update: timestamp || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: updatedPatient, error: updateError } = await supabase
      .from("patients")
      .update(updatePayload)
      .eq("id", patient.id)
      .select("handoff_notes, image_analysis, last_handoff_update")
      .single();

    console.log("Update result:", updatedPatient);
    console.log("Update error:", updateError);

    if (updateError) {
      console.error("Update failed:", updateError);
      throw updateError;
    }

    console.log(
      "✓ Handoff notes saved successfully for patient:",
      patient.patient_id
    );
    console.log("=== END HANDOFF SAVE ===");

    res.json({
      success: true,
      message: "Handoff notes saved successfully",
      handoffData: {
        handoffNotes: updatedPatient.handoff_notes,
        imageAnalysis: updatedPatient.image_analysis,
        lastHandoffUpdate: updatedPatient.last_handoff_update,
      },
    });
  } catch (error) {
    console.error("=== HANDOFF SAVE ERROR ===");
    console.error("Error saving handoff notes:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
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

// Create auth accounts for nurses in the database
// This endpoint helps set up accounts for nurses that exist in the nurses table
// but don't have Supabase Auth accounts yet
// NOTE: Requires SUPABASE_SERVICE_KEY in environment variables
app.post("/api/nurses/create-accounts", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({
        error:
          "Admin operations require SUPABASE_SERVICE_KEY to be set in environment variables",
      });
    }

    // Get all nurses from the database
    const { data: nurses, error: fetchError } = await supabase
      .from("nurses")
      .select("*");

    if (fetchError) throw fetchError;

    const results = [];

    for (const nurse of nurses) {
      // Skip if nurse already has an auth_user_id
      if (nurse.auth_user_id) {
        results.push({
          nurse_id: nurse.id,
          email: nurse.email,
          status: "skipped",
          message: "Already has auth account",
        });
        continue;
      }

      // Check if auth user already exists with this email
      const { data: existingUsers, error: listError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        results.push({
          nurse_id: nurse.id,
          email: nurse.email,
          status: "error",
          message: `Failed to list users: ${listError.message}`,
        });
        continue;
      }

      const existingUser = existingUsers?.users?.find(
        (u) => u.email === nurse.email
      );

      if (existingUser) {
        // Link existing auth user to nurse record
        const { error: updateError } = await supabase
          .from("nurses")
          .update({ auth_user_id: existingUser.id })
          .eq("id", nurse.id);

        if (updateError) {
          results.push({
            nurse_id: nurse.id,
            email: nurse.email,
            status: "error",
            message: `Failed to link: ${updateError.message}`,
          });
          continue;
        }

        results.push({
          nurse_id: nurse.id,
          email: nurse.email,
          status: "linked",
          message: "Linked to existing auth account",
        });
        continue;
      }

      // Create new auth account for nurse
      // Generate a temporary password (nurse should change it on first login)
      const tempPassword = `Temp${nurse.id}${Date.now()}`;

      const { data: authUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: nurse.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm email
          user_metadata: {
            name: nurse.name,
            nurse_id: nurse.id,
          },
        });

      if (createError) {
        results.push({
          nurse_id: nurse.id,
          email: nurse.email,
          status: "error",
          message: createError.message,
        });
        continue;
      }

      // Link auth user ID to nurse record
      const { error: linkError } = await supabase
        .from("nurses")
        .update({ auth_user_id: authUser.user.id })
        .eq("id", nurse.id);

      if (linkError) {
        results.push({
          nurse_id: nurse.id,
          email: nurse.email,
          status: "error",
          message: `Account created but failed to link: ${linkError.message}`,
          tempPassword: tempPassword,
        });
        continue;
      }

      results.push({
        nurse_id: nurse.id,
        email: nurse.email,
        status: "created",
        message: `Account created. Temporary password: ${tempPassword}`,
        tempPassword: tempPassword,
      });
    }

    res.json({
      success: true,
      message: `Processed ${nurses.length} nurses`,
      results,
    });
  } catch (error) {
    console.error("Error creating nurse accounts:", error);
    res.status(500).json({
      error: "Failed to create nurse accounts",
      details: error.message,
    });
  }
});

// Get all rooms with patient and nurse info
app.get("/api/rooms", async (req, res) => {
  try {
    const { data: rooms, error } = await supabase
      .from("rooms")
      .select(
        `
        *,
        patients (*),
        room_assignments (
          nurses (*)
        )
      `
      )
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
      .select(
        `
        *,
        patients (name, patient_id),
        rooms (id)
      `
      )
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

// Create a new patient
app.post("/api/patients", async (req, res) => {
  try {
    const {
      name,
      age,
      sex,
      mrn,
      room,
      diagnosis,
      condition,
      riskLevel,
      codeStatus,
      medications,
      allergies,
      admissionDate,
      lastVitals,
      gridX,
      gridY,
    } = req.body;

    console.log("=== CREATING NEW PATIENT ===");
    console.log("Request body:", req.body);

    // Validate required fields
    if (!name || !mrn || !room) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, mrn, and room are required",
      });
    }

    // Check if MRN already exists
    const { data: existingPatient } = await supabase
      .from("patients")
      .select("mrn")
      .eq("mrn", mrn)
      .single();

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        error: "A patient with this MRN already exists",
      });
    }

    // Create the patient
    const patientData = {
      name,
      mrn,
      age: age || null,
      sex: sex || null,
      diagnosis: diagnosis || null,
      condition: condition || null,
      risk_level: riskLevel || "medium",
      code_status: codeStatus || "Full Code",
      medications: medications || [],
      allergies: allergies || [],
      admission_date: admissionDate || new Date().toISOString(),
      last_vitals: lastVitals || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert([patientData])
      .select()
      .single();

    if (patientError) throw patientError;

    console.log("Patient created:", newPatient);

    // Create or update the room
    const { data: existingRoom } = await supabase
      .from("rooms")
      .select("id")
      .eq("id", room)
      .single();

    if (existingRoom) {
      // Update existing room
      const { error: roomUpdateError } = await supabase
        .from("rooms")
        .update({
          patient_id: newPatient.id,
          grid_x: gridX || 0,
          grid_y: gridY || 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", room);

      if (roomUpdateError) throw roomUpdateError;
    } else {
      // Create new room
      const { error: roomCreateError } = await supabase.from("rooms").insert([
        {
          id: room,
          patient_id: newPatient.id,
          grid_x: gridX || 0,
          grid_y: gridY || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (roomCreateError) throw roomCreateError;
    }

    console.log("Room created/updated for patient");

    res.json({
      success: true,
      message: "Patient created successfully",
      patient: newPatient,
    });
  } catch (error) {
    console.error("Error creating patient:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create patient",
    });
  }
});

// Extract structured patient data from AI summary
app.post("/api/extract-patient-data/:provider", async (req, res) => {
  try {
    const { provider } = req.params;
    const { summary } = req.body;

    console.log("=== EXTRACTING PATIENT DATA ===");
    console.log("Provider:", provider);
    console.log("Summary length:", summary?.length);

    if (!summary) {
      return res.status(400).json({
        success: false,
        error: "Summary text is required",
      });
    }

    const prompt = `You are a healthcare data extraction assistant. Extract structured patient information from the following medical summary/notes.

Return a JSON object with these fields (use null for missing information):
- name: Patient's full name
- mrn: Medical Record Number (if mentioned)
- age: Patient age as a number
- sex: "M", "F", or "Other"
- room: Room number (if mentioned)
- diagnosis: Primary diagnosis
- condition: Current condition or chief complaint
- riskLevel: "low", "medium", "high", or "critical" (assess based on the summary)
- codeStatus: "Full Code", "DNR", "DNI", or "DNR/DNI"
- medications: Array of medication names
- allergies: Array of allergies
- lastVitals: Object with temp, heartRate, bp, respRate, o2Sat (extract if present)
- gridX: null (user will set this)
- gridY: null (user will set this)

Medical Summary:
${summary}

Return ONLY the JSON object, no additional text.`;

    let extractedData;

    if (provider === "claude") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const responseText = message.content[0].text;
      console.log("Claude response:", responseText);

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to extract JSON from AI response");
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Unsupported AI provider",
      });
    }

    console.log("Extracted patient data:", extractedData);

    res.json({
      success: true,
      patientData: extractedData,
    });
  } catch (error) {
    console.error("Error extracting patient data:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to extract patient data",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Available services:`);
  console.log(`- Claude: ${anthropic ? "✓" : "✗"}`);
  console.log(`- Supabase: ${process.env.SUPABASE_URL ? "✓" : "✗"}`);
});
