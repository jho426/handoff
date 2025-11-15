import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Loader2,
  Copy,
  Save,
  Camera,
  FileText,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Clock,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import FormattedHandoffNotes from "./FormattedHandoffNotes";
import "./PatientDetail.css";

const PatientDetail = ({ patient, aiProvider, onBack, onUpdate }) => {
  const [handoffNotes, setHandoffNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState("");
  const [isEditingPatient, setIsEditingPatient] = useState(false);
  const [editedPatient, setEditedPatient] = useState({});
  const [tasks, setTasks] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(patient);

  const fileInputRef = useRef(null);
  const isGeneratingRef = useRef(false); // Track if we're generating/saving notes
  const isUpdatingTasksRef = useRef(false); // Track if we're updating tasks
  const justSavedRef = useRef(false); // Track if we just saved patient info

  useEffect(() => {
    // Update current patient when prop changes (but not during local edits or right after saving)
    if (!isEditingPatient && !justSavedRef.current) {
      setCurrentPatient(patient);
    }
    // Reset the flag after a delay to prevent prop sync from overwriting
    if (justSavedRef.current) {
      const timer = setTimeout(() => {
        justSavedRef.current = false;
        console.log("✓ justSavedRef reset - prop sync can resume");
      }, 1000); // Increased delay to 1 second
      return () => clearTimeout(timer);
    }
  }, [patient, isEditingPatient]);

  useEffect(() => {
    const notes = currentPatient.handoffNotes || currentPatient.handoff_notes || "";
    const analysis = currentPatient.imageAnalysis || currentPatient.image_analysis || "";

    // Don't overwrite notes if we're in the middle of generating/saving
    if (!isGeneratingRef.current) {
      setHandoffNotes(notes);
      setImageAnalysis(analysis);
    } else {
      console.log("⚠ Skipping notes update - generation in progress");
    }

    // Don't overwrite tasks if we're in the middle of updating them
    if (!isUpdatingTasksRef.current) {
      setTasks(currentPatient.tasks || []);
    } else {
      console.log("⚠ Skipping tasks update - task update in progress");
    }
    setEditedPatient({
      name: currentPatient.demographics?.name || currentPatient.patient_name || "",
      age: currentPatient.demographics?.age || currentPatient.age || "",
      sex: currentPatient.demographics?.sex || currentPatient.sex || "",
      codeStatus: currentPatient.demographics?.codeStatus || currentPatient.code_status || "",
      chiefComplaint: currentPatient.chiefComplaint || currentPatient.chief_complaint || "",
      medications: currentPatient.medications || [],
      allergies: currentPatient.allergies || [],
    });

    console.log("✓ Notes loaded into state");
    console.log("=== END LOADING ===");
  }, [currentPatient]);

  // Generate AI handoff notes from patient record
  const generateHandoffNotes = async () => {
    setLoading(true);
    setError("");
    isGeneratingRef.current = true; // Mark as generating

    // Get the previous handoff notes for comparison
    const previousNotes = handoffNotes;

    console.log("=== GENERATING NEW HANDOFF NOTES ===");
    console.log("Previous notes available:", !!previousNotes);
    console.log("Using current task state with", tasks.length, "tasks");

    // Use current task state instead of stale patient prop
    const patientDataWithCurrentTasks = {
      ...patient,
      tasks: tasks, // Use current state, not stale prop
    };

    try {
      const response = await fetch(
        `http://localhost:3001/api/summarize-record/${aiProvider}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientData: patientDataWithCurrentTasks,
            previousNotes: previousNotes,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate handoff notes");
      }

      const data = await response.json();
      const newHandoffNotes = data.summary;
      setHandoffNotes(newHandoffNotes);
      setIsEditing(false);

      console.log("✓ Handoff notes generated successfully");
      console.log("→ Auto-saving to database...");

      // Auto-save the generated notes immediately
      await saveHandoffNotesToDB(newHandoffNotes);

      console.log("✓ Auto-save completed!");
      setSuccess("Handoff notes generated and saved successfully!");

      // Reset generating flag after a delay to allow database propagation
      setTimeout(() => {
        isGeneratingRef.current = false;
        console.log("✓ Generation complete - UI can update from database");
      }, 1000);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to generate handoff notes");
      isGeneratingRef.current = false; // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // Regenerate handoff notes with image analysis integrated
  const regenerateHandoffWithImage = async (imageAnalysisText) => {
    setLoading(true);
    setError("");
    isGeneratingRef.current = true; // Mark as generating

    console.log("Regenerating with current task state:", tasks.length, "tasks");

    // Use current task state instead of stale patient prop
    const patientDataWithCurrentTasks = {
      ...patient,
      tasks: tasks, // Use current state, not stale prop
    };

    try {
      const response = await fetch(
        `http://localhost:3001/api/summarize-record/${aiProvider}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientData: patientDataWithCurrentTasks,
            previousNotes: handoffNotes,
            imageAnalysis: imageAnalysisText,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to regenerate handoff notes"
        );
      }

      const data = await response.json();
      const newHandoffNotes = data.summary;
      setHandoffNotes(newHandoffNotes);

      console.log("✓ Handoff notes regenerated with image analysis");
      console.log("→ Auto-saving to database with image analysis...");

      // Auto-save the regenerated notes with the image analysis
      await saveHandoffNotesToDB(newHandoffNotes, imageAnalysisText);

      console.log("✓ Auto-save with image analysis completed!");

      // Reset generating flag after a delay to allow database propagation
      setTimeout(() => {
        isGeneratingRef.current = false;
        console.log("✓ Regeneration complete - UI can update from database");
      }, 1000);
    } catch (err) {
      setError(
        err.message || "Failed to regenerate handoff notes with image analysis"
      );
      isGeneratingRef.current = false; // Reset on error
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      setError("");

      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setError("Please select a valid image file");
    }
  };

  // Analyze uploaded image
  const analyzeImage = async () => {
    if (!selectedImage) return;

    setImageAnalysisLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("image", selectedImage);

      const response = await fetch(
        `http://localhost:3001/api/analyze-image/${aiProvider}`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze image");
      }

      const data = await response.json();
      setImageAnalysis(data.summary);

      // Regenerate handoff notes with image analysis integrated
      setSuccess("Image analyzed! Regenerating integrated handoff notes...");

      // Trigger regeneration of handoff notes with image analysis
      await regenerateHandoffWithImage(data.summary);

      setSuccess("Image analyzed and integrated into handoff notes!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to analyze image");
    } finally {
      setImageAnalysisLoading(false);
    }
  };

  // Clear image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageAnalysis("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Save handoff notes to database (helper function)
  const saveHandoffNotesToDB = async (
    notesToSave,
    imageAnalysisToSave = null
  ) => {
    const patientId = patient.patientId || patient.patient_id;

    const requestData = {
      handoffNotes: notesToSave,
      imageAnalysis:
        imageAnalysisToSave !== null ? imageAnalysisToSave : imageAnalysis,
      timestamp: new Date().toISOString(),
    };

    console.log("=== FRONTEND: SAVING HANDOFF NOTES ===");
    console.log("Patient ID being sent:", patientId);
    console.log("Handoff notes length:", notesToSave?.length || 0);
    console.log(
      "Image analysis length:",
      (imageAnalysisToSave !== null ? imageAnalysisToSave : imageAnalysis)
        ?.length || 0
    );

    const response = await fetch(
      `http://localhost:3001/api/patients/${patientId}/handoff`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      }
    );

    console.log("Response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Response error data:", errorData);
      throw new Error(errorData.error || "Failed to save handoff notes");
    }

    await response.json(); // Parse response
    console.log("✓ Handoff notes saved successfully!");
    console.log("=== END FRONTEND SAVE ===");

    if (onUpdate) {
      onUpdate({
        ...patient,
        handoffNotes: notesToSave,
        lastUpdated: new Date().toISOString(),
      });
    }
  };

  // Save handoff notes (manual save button)
  const saveHandoffNotes = async () => {
    setLoading(true);
    setError("");
    isGeneratingRef.current = true; // Protect from stale data overwrites

    console.log("→ Manual save triggered");

    try {
      await saveHandoffNotesToDB(handoffNotes);
      console.log("✓ Manual save completed!");
      setSuccess("Handoff notes saved successfully!");
      setIsEditing(false);

      // Reset generating flag after a delay to allow database propagation
      setTimeout(() => {
        isGeneratingRef.current = false;
        console.log("✓ Save complete - UI can update from database");
      }, 1000);

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save handoff notes");
      isGeneratingRef.current = false; // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // Save patient information updates
  const savePatientInfo = async () => {
    setLoading(true);
    setError("");

    const patientId = currentPatient.patientId || currentPatient.patient_id || patient.patientId || patient.patient_id;

    try {
      const response = await fetch(
        `http://localhost:3001/api/patients/${patientId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedPatient),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Response error:", errorData);
        throw new Error(errorData.error || "Failed to update patient info");
      }

      const responseData = await response.json();

      // Update local state immediately to reflect changes
      // Use the server response data to ensure we have the actual saved values
      const serverPatient = responseData.patient || {};
      const updatedPatient = {
        ...currentPatient,
        patientId: currentPatient.patientId || patient.patientId,
        patient_id: currentPatient.patient_id || patient.patient_id || serverPatient.id,
        room: currentPatient.room || patient.room,
        demographics: {
          ...(currentPatient.demographics || {}),
          name: serverPatient.name || editedPatient.name,
          age: serverPatient.age || editedPatient.age,
          sex: serverPatient.sex || editedPatient.sex,
          codeStatus: serverPatient.code_status || editedPatient.codeStatus,
        },
        chiefComplaint: serverPatient.condition || editedPatient.chiefComplaint,
        medications: serverPatient.medications || editedPatient.medications || [],
        allergies: serverPatient.allergies || editedPatient.allergies || [],
        // Also update top-level fields for compatibility
        name: serverPatient.name || editedPatient.name,
        age: serverPatient.age || editedPatient.age,
        sex: serverPatient.sex || editedPatient.sex,
        code_status: serverPatient.code_status || editedPatient.codeStatus,
        condition: serverPatient.condition || editedPatient.chiefComplaint,
      };
      
      // Prevent prop sync from overwriting our changes
      justSavedRef.current = true;
      
      // Update state immediately
      setCurrentPatient(updatedPatient);
      setIsEditingPatient(false);
      setSuccess("Patient information updated successfully!");
      
      // Call onUpdate with the updated patient
      if (onUpdate) {
        // Use setTimeout to ensure state update completes first
        setTimeout(() => {
          onUpdate(updatedPatient);
        }, 0);
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("=== FRONTEND: PATIENT UPDATE ERROR ===");
      console.error("Error:", err);
      setError(err.message || "Failed to update patient information");
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(handoffNotes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle task completion
  const toggleTask = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const previousCompleted = task.completed;
    const newCompleted = !task.completed;

    // Optimistic update - update UI immediately for instant feedback
    isUpdatingTasksRef.current = true;
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.id === taskId ? { ...t, completed: newCompleted } : t
      )
    );

    console.log(
      `→ Task ${taskId} ${
        newCompleted ? "completed" : "uncompleted"
      } (optimistic)`
    );

    try {
      const response = await fetch(
        `http://localhost:3001/api/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: newCompleted }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      console.log(`✓ Task ${taskId} synced to database`);

      // Reset updating flag after a delay to allow database propagation
      setTimeout(() => {
        isUpdatingTasksRef.current = false;
        console.log("✓ Task update complete - UI can update from database");
      }, 500);
    } catch (err) {
      console.error("Error toggling task:", err);

      // Rollback optimistic update on error
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === taskId ? { ...t, completed: previousCompleted } : t
        )
      );

      isUpdatingTasksRef.current = false;
      setError("Failed to update task status");
      setTimeout(() => setError(""), 3000);
    }
  };

  // Use useMemo to ensure these values recalculate when currentPatient changes
  // Depend on currentPatient itself so any change triggers recalculation
  const patientName = useMemo(() => 
    currentPatient.demographics?.name || currentPatient.patient_name || "",
    [currentPatient]
  );
  const patientAge = useMemo(() => 
    currentPatient.demographics?.age || currentPatient.age || "",
    [currentPatient]
  );
  const patientSex = useMemo(() => 
    currentPatient.demographics?.sex || currentPatient.sex || "",
    [currentPatient]
  );
  const chiefComplaint = useMemo(() => 
    currentPatient.chiefComplaint || currentPatient.chief_complaint || "",
    [currentPatient]
  );
  const codeStatus = useMemo(() => 
    currentPatient.demographics?.codeStatus || currentPatient.code_status || "",
    [currentPatient]
  );
  const medicalHistory = useMemo(() => 
    Array.isArray(currentPatient.demographics?.history)
      ? currentPatient.demographics.history.join(", ")
      : currentPatient.medical_history || "",
    [currentPatient]
  );

  return (
    <div className="patient-detail-container">
      <button onClick={onBack} className="back-button">
        <ArrowLeft className="action-button-icon" />
        Back to Patient List
      </button>

      <div className="patient-detail-grid">
        {/* Left Column - Patient Info */}
        <div className="patient-info-column">
          {/* Patient Header */}
          <div className="patient-header-card">
            <div className="patient-header-top">
              {isEditingPatient ? (
                <input
                  type="text"
                  value={editedPatient.name}
                  onChange={(e) =>
                    setEditedPatient({ ...editedPatient, name: e.target.value })
                  }
                  className="patient-name-input"
                />
              ) : (
                <h2 className="patient-name">{patientName}</h2>
              )}
              <div className="patient-header-actions">
                <div className="room-badge">Room {currentPatient.room || patient.room}</div>
                {!isEditingPatient ? (
                  <button
                    onClick={() => setIsEditingPatient(true)}
                    className="patient-action-btn secondary"
                  >
                    <Edit3 className="patient-action-icon" />
                    Edit Patient Info
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditingPatient(false)}
                      className="patient-action-btn secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePatientInfo}
                      disabled={loading}
                      className="patient-action-btn primary"
                    >
                      <Save className="patient-action-icon" />
                      {loading ? "Saving..." : "Save Patient Info"}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="patient-details-text">
              <p>
                {isEditingPatient ? (
                  <>
                    <input
                      type="number"
                      value={editedPatient.age}
                      onChange={(e) =>
                        setEditedPatient({
                          ...editedPatient,
                          age: e.target.value,
                        })
                      }
                      className="patient-detail-input"
                      style={{
                        width: "60px",
                        marginRight: "var(--spacing-sm)",
                      }}
                    />
                    •
                    <input
                      type="text"
                      value={editedPatient.sex}
                      onChange={(e) =>
                        setEditedPatient({
                          ...editedPatient,
                          sex: e.target.value,
                        })
                      }
                      className="patient-detail-input"
                      style={{ width: "80px", marginLeft: "var(--spacing-sm)" }}
                    />
                  </>
                ) : (
                  <>
                    {patientAge} • {patientSex}
                  </>
                )}
              </p>
              <p>ID: {currentPatient.patientId || currentPatient.patient_id || patient.patientId || patient.patient_id}</p>
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="chief-complaint-card">
            <h3 className="chief-complaint-header">
              <AlertCircle className="chief-complaint-icon" />
              Chief Complaint
            </h3>
            {isEditingPatient ? (
              <textarea
                value={editedPatient.chiefComplaint}
                onChange={(e) =>
                  setEditedPatient({
                    ...editedPatient,
                    chiefComplaint: e.target.value,
                  })
                }
                className="chief-complaint-input"
                rows="2"
              />
            ) : (
              <p className="chief-complaint-text">{chiefComplaint}</p>
            )}
          </div>

          {/* Patient Details */}
          <div className="patient-info-card">
            <h3 className="patient-info-title">Patient Information</h3>

            <div className="info-section">
              <div className="info-item">
                <h4 className="info-label">Code Status</h4>
                {isEditingPatient ? (
                  <input
                    type="text"
                    value={editedPatient.codeStatus}
                    onChange={(e) =>
                      setEditedPatient({
                        ...editedPatient,
                        codeStatus: e.target.value,
                      })
                    }
                    className="info-value-input"
                  />
                ) : (
                  <p className="info-value">{codeStatus}</p>
                )}
              </div>

              <div className="info-item">
                <h4 className="info-label">Medical History</h4>
                <p className="info-value">
                  {medicalHistory || "None documented"}
                </p>
              </div>

              {/* Vital Signs */}
              {(currentPatient.vitals || patient.vitals) && (
                <div className="info-item">
                  <h4 className="info-label">Latest Vitals</h4>
                  <div className="vitals-grid">
                    {(currentPatient.vitals?.temp || patient.vitals?.temp) && (
                      <div className="vital-item">
                        <span className="vital-label">Temp:</span>
                        <span className="vital-value">
                          {Array.isArray(currentPatient.vitals?.temp || patient.vitals?.temp)
                            ? (currentPatient.vitals?.temp || patient.vitals?.temp)[
                                (currentPatient.vitals?.temp || patient.vitals?.temp).length - 1
                              ]
                            : currentPatient.vitals?.temp || patient.vitals?.temp}
                          °C
                        </span>
                      </div>
                    )}
                    {(currentPatient.vitals?.heartRate || patient.vitals?.heartRate) && (
                      <div className="vital-item">
                        <span className="vital-label">HR:</span>
                        <span className="vital-value">
                          {Array.isArray(currentPatient.vitals?.heartRate || patient.vitals?.heartRate)
                            ? (currentPatient.vitals?.heartRate || patient.vitals?.heartRate)[
                                (currentPatient.vitals?.heartRate || patient.vitals?.heartRate).length - 1
                              ]
                            : currentPatient.vitals?.heartRate || patient.vitals?.heartRate}
                        </span>
                      </div>
                    )}
                    {(currentPatient.vitals?.bloodPressure || patient.vitals?.bloodPressure) && (
                      <div className="vital-item">
                        <span className="vital-label">BP:</span>
                        <span className="vital-value">
                          {Array.isArray(currentPatient.vitals?.bloodPressure || patient.vitals?.bloodPressure)
                            ? (currentPatient.vitals?.bloodPressure || patient.vitals?.bloodPressure)[
                                (currentPatient.vitals?.bloodPressure || patient.vitals?.bloodPressure).length - 1
                              ]
                            : currentPatient.vitals?.bloodPressure || patient.vitals?.bloodPressure}
                        </span>
                      </div>
                    )}
                    {(currentPatient.vitals?.oxygen || patient.vitals?.oxygen) && (
                      <div className="vital-item">
                        <span className="vital-label">O2:</span>
                        <span className="vital-value">
                          {Array.isArray(currentPatient.vitals?.oxygen || patient.vitals?.oxygen)
                            ? (currentPatient.vitals?.oxygen || patient.vitals?.oxygen)[
                                (currentPatient.vitals?.oxygen || patient.vitals?.oxygen).length - 1
                              ]
                            : currentPatient.vitals?.oxygen || patient.vitals?.oxygen}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Task Status Section */}
          {tasks && tasks.length > 0 && (
            <div className="tasks-card">
              <h3 className="tasks-title">
                <Clock className="tasks-title-icon" />
                Task Status
              </h3>

              {(() => {
                const completedTasks = tasks.filter((t) => t.completed);
                const pendingTasks = tasks.filter((t) => !t.completed);
                const sortedPending = pendingTasks.sort((a, b) => {
                  const priorityOrder = {
                    critical: 0,
                    high: 1,
                    medium: 2,
                    low: 3,
                  };
                  return (
                    (priorityOrder[a.priority] || 99) -
                    (priorityOrder[b.priority] || 99)
                  );
                });

                return (
                  <>
                    {/* Task Summary */}
                    <div className="task-summary">
                      <div className="task-summary-item">
                        <span className="task-summary-value">
                          {tasks.length}
                        </span>
                        <span className="task-summary-label">Total</span>
                      </div>
                      <div className="task-summary-item completed">
                        <span className="task-summary-value">
                          {completedTasks.length}
                        </span>
                        <span className="task-summary-label">Completed</span>
                      </div>
                      <div className="task-summary-item pending">
                        <span className="task-summary-value">
                          {pendingTasks.length}
                        </span>
                        <span className="task-summary-label">Pending</span>
                      </div>
                    </div>

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                      <div className="task-section">
                        <h4 className="task-section-title">
                          <CheckSquare className="task-section-icon completed-icon" />
                          Completed This Shift ({completedTasks.length})
                        </h4>
                        <div className="task-list">
                          {completedTasks.map((task) => (
                            <div
                              key={task.id}
                              className="task-item completed"
                              onClick={() => toggleTask(task.id)}
                            >
                              <CheckSquare className="task-checkbox checked" />
                              <div className="task-content">
                                <div className="task-header">
                                  <span className="task-time">{task.time}</span>
                                  <span
                                    className={`task-priority ${task.priority}`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="task-description">
                                  {task.description}
                                </p>
                                <span className="task-type">{task.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Outstanding Tasks */}
                    {pendingTasks.length > 0 && (
                      <div className="task-section">
                        <h4 className="task-section-title">
                          <AlertTriangle className="task-section-icon pending-icon" />
                          Outstanding Tasks ({pendingTasks.length})
                        </h4>
                        <div className="task-list">
                          {sortedPending.map((task) => (
                            <div
                              key={task.id}
                              className={`task-item pending priority-${task.priority}`}
                              onClick={() => toggleTask(task.id)}
                            >
                              <Square className="task-checkbox" />
                              <div className="task-content">
                                <div className="task-header">
                                  <span className="task-time">{task.time}</span>
                                  <span
                                    className={`task-priority ${task.priority}`}
                                  >
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="task-description">
                                  {task.description}
                                </p>
                                <span className="task-type">{task.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Column - Handoff Notes & Actions */}
        <div className="handoff-column">
          {/* Action Buttons */}
          <div className="action-card">
            <h3 className="action-title">Generate Handoff Notes</h3>

            <div className="action-buttons-grid">
              <button
                onClick={generateHandoffNotes}
                disabled={loading}
                className="action-button"
              >
                {loading ? (
                  <>
                    <Loader2
                      className="action-button-icon"
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="action-button-icon" />
                    Generate from Record
                  </>
                )}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="action-button"
              >
                <Camera className="action-button-icon" />
                Upload Handoff Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* Image Preview & Analysis */}
            {imagePreview && (
              <div className="image-preview-container">
                <div className="image-preview-content">
                  <div className="image-preview-wrapper">
                    <img
                      src={imagePreview}
                      alt="Handoff document"
                      className="image-preview-img"
                    />
                    <button
                      onClick={clearImage}
                      className="image-remove-button"
                    >
                      <X className="image-remove-icon" />
                    </button>
                  </div>

                  <div className="image-preview-info">
                    <p className="image-preview-text">
                      Handoff document uploaded
                    </p>
                    <button
                      onClick={analyzeImage}
                      disabled={imageAnalysisLoading}
                      className="analyze-button"
                    >
                      {imageAnalysisLoading ? (
                        <>
                          <Loader2
                            className="notes-action-icon"
                            style={{ animation: "spin 1s linear infinite" }}
                          />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FileText className="notes-action-icon" />
                          Analyze & Add to Notes
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <div className="status-message error">
                <AlertCircle className="status-icon" />
                <div>
                  <p className="status-title">Error</p>
                  <p className="status-text">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="status-message success">
                <CheckCircle2 className="status-icon" />
                <p className="status-title">{success}</p>
              </div>
            )}
          </div>

          {/* Handoff Notes Editor */}
          {handoffNotes && (
            <div className="handoff-notes-card">
              <div className="handoff-notes-header">
                <h3 className="handoff-notes-title">
                  <FileText className="handoff-notes-icon" />
                  Handoff Notes
                </h3>
                <div className="handoff-notes-actions">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="notes-action-button"
                    >
                      <Edit3 className="notes-action-icon" />
                      Edit Notes
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="notes-action-button"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveHandoffNotes}
                        disabled={loading}
                        className="notes-action-button primary"
                      >
                        {loading ? (
                          <>
                            <Loader2
                              className="notes-action-icon"
                              style={{ animation: "spin 1s linear infinite" }}
                            />
                            Saving...
                          </>
                        ) : (
                          <>Save Changes</>
                        )}
                      </button>
                    </>
                  )}
                  <button onClick={handleCopy} className="notes-action-button">
                    <Copy className="notes-action-icon" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              {isEditing ? (
                <textarea
                  value={handoffNotes}
                  onChange={(e) => setHandoffNotes(e.target.value)}
                  className="notes-textarea"
                  placeholder="Edit your handoff notes here..."
                />
              ) : (
                <FormattedHandoffNotes content={handoffNotes} />
              )}
            </div>
          )}

          {/* Empty State */}
          {!handoffNotes && (
            <div className="empty-state">
              <Sparkles className="empty-state-icon" />
              <h3 className="empty-state-title">No Handoff Notes Yet</h3>
              <p className="empty-state-text">
                Generate AI-powered handoff notes from the patient record or
                upload a handoff document image to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
