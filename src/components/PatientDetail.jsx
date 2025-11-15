import { useState, useRef, useEffect } from "react";
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
  const [handoffNotesHistory, setHandoffNotesHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [tasks, setTasks] = useState([]);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const notes = patient.handoffNotes || patient.handoff_notes || "";
    const analysis = patient.imageAnalysis || patient.image_analysis || "";

    console.log("=== LOADING PATIENT DATA ===");
    console.log("Patient:", patient);
    console.log("Handoff notes from patient:", notes);
    console.log("Handoff notes length:", notes.length);
    console.log("Image analysis from patient:", analysis);
    console.log("Image analysis length:", analysis.length);

    setHandoffNotes(notes);
    setImageAnalysis(analysis);
    setHandoffNotesHistory(patient.handoffNotesHistory || patient.handoff_notes_history || []);
    setTasks(patient.tasks || []);
    setEditedPatient({
      name: patient.demographics?.name || patient.patient_name || "",
      age: patient.demographics?.age || patient.age || "",
      sex: patient.demographics?.sex || patient.sex || "",
      codeStatus: patient.demographics?.codeStatus || patient.code_status || "",
      chiefComplaint: patient.chiefComplaint || patient.chief_complaint || "",
      medications: patient.medications || [],
      allergies: patient.allergies || [],
    });

    console.log("✓ Notes loaded into state");
    console.log("History loaded:", patient.handoffNotesHistory?.length || 0, "versions");
    console.log("=== END LOADING ===");
  }, [patient]);

  // Generate AI handoff notes from patient record
  const generateHandoffNotes = async () => {
    setLoading(true);
    setError("");

    // Get the most recent previous handoff notes for comparison
    const previousNotes = handoffNotes || (handoffNotesHistory.length > 0 ? handoffNotesHistory[0].notes : null);

    console.log("=== GENERATING NEW HANDOFF NOTES ===");
    console.log("Previous notes available:", !!previousNotes);
    console.log("History count:", handoffNotesHistory.length);

    try {
      const response = await fetch(
        `http://localhost:3001/api/summarize-record/${aiProvider}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientData: patient,
            previousNotes: previousNotes
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate handoff notes");
      }

      const data = await response.json();
      setHandoffNotes(data.summary);
      setIsEditing(false);
      setSuccess("Handoff notes generated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to generate handoff notes");
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

      // Append image analysis to handoff notes
      if (handoffNotes) {
        setHandoffNotes(
          (prev) => `${prev}\n\n## Image Analysis\n\n${data.summary}`
        );
      } else {
        setHandoffNotes(`## Handoff Document Analysis\n\n${data.summary}`);
      }

      setSuccess("Image analyzed and added to handoff notes!");
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

  // Save handoff notes
  const saveHandoffNotes = async () => {
    setLoading(true);
    setError("");

    const patientId = patient.patientId || patient.patient_id;
    const requestData = {
      handoffNotes,
      imageAnalysis,
      timestamp: new Date().toISOString(),
    };

    console.log("=== FRONTEND: SAVING HANDOFF NOTES ===");
    console.log("Patient ID being sent:", patientId);
    console.log("Patient object:", patient);
    console.log(
      "Request URL:",
      `http://localhost:3001/api/patients/${patientId}/handoff`
    );
    console.log("Request data:", {
      handoffNotesLength: handoffNotes?.length || 0,
      imageAnalysisLength: imageAnalysis?.length || 0,
      timestamp: requestData.timestamp,
    });

    try {
      const response = await fetch(
        `http://localhost:3001/api/patients/${patientId}/handoff`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestData),
        }
      );

      console.log("Response status:", response.status);
      console.log("Response OK:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Response error data:", errorData);
        throw new Error(errorData.error || "Failed to save handoff notes");
      }

      const responseData = await response.json();
      console.log("Response data:", responseData);
      console.log("✓ Handoff notes saved successfully!");
      console.log("=== END FRONTEND SAVE ===");

      setSuccess("Handoff notes saved successfully!");
      setIsEditing(false);

      if (onUpdate) {
        onUpdate({
          ...patient,
          handoffNotes,
          lastUpdated: new Date().toISOString(),
        });
      }

      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("=== FRONTEND: SAVE ERROR ===");
      console.error("Error:", err);
      console.error("Error message:", err.message);
      setError(err.message || "Failed to save handoff notes");
    } finally {
      setLoading(false);
    }
  };

  // Save patient information updates
  const savePatientInfo = async () => {
    setLoading(true);
    setError("");

    const patientId = patient.patientId || patient.patient_id;

    console.log("=== FRONTEND: SAVING PATIENT INFO ===");
    console.log("Patient ID:", patientId);
    console.log("Updated data:", editedPatient);

    try {
      const response = await fetch(
        `http://localhost:3001/api/patients/${patientId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editedPatient),
        }
      );

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Response error:", errorData);
        throw new Error(errorData.error || "Failed to update patient info");
      }

      const responseData = await response.json();
      console.log("Response data:", responseData);
      console.log("✓ Patient info saved successfully!");

      setSuccess("Patient information updated successfully!");
      setIsEditingPatient(false);

      if (onUpdate) {
        onUpdate({ ...patient, ...editedPatient });
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
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      const response = await fetch(`http://localhost:3001/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed })
      });

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        )
      );
    } catch (err) {
      console.error('Error toggling task:', err);
      setError('Failed to update task status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const patientName = patient.demographics?.name || patient.patient_name;
  const patientAge = patient.demographics?.age || patient.age;
  const patientSex = patient.demographics?.sex || patient.sex;
  const chiefComplaint = patient.chiefComplaint || patient.chief_complaint;
  const codeStatus = patient.demographics?.codeStatus || patient.code_status;
  const medicalHistory = Array.isArray(patient.demographics?.history)
    ? patient.demographics.history.join(", ")
    : patient.medical_history;

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
                  className="text-2xl font-bold text-gray-800 border-b-2 border-blue-500 outline-none bg-transparent"
                />
              ) : (
                <h2 className="patient-name">{patientName}</h2>
              )}
              <div className="room-badge">
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Room {patient.room}
                </div>
                {!isEditingPatient ? (
                  <button
                    onClick={() => setIsEditingPatient(true)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
                  >
                    <Edit3 className="w-4 h-4 inline mr-1" />
                    Edit Patient Info
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setIsEditingPatient(false)}
                      className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={savePatientInfo}
                      disabled={loading}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-full text-sm font-medium transition-colors"
                    >
                      <Save className="w-4 h-4 inline mr-1" />
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
                      className="w-16 border-b border-gray-300 outline-none mr-2"
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
                      className="w-20 border-b border-gray-300 outline-none ml-2"
                    />
                  </>
                ) : (
                  <>
                    {patientAge} • {patientSex}
                  </>
                )}
              </p>
              <p>ID: {patient.patientId || patient.patient_id}</p>
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
                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500"
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
                    className="info-value border-b border-gray-300 outline-none"
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
              {patient.vitals && (
                <div className="info-item">
                  <h4 className="info-label">Latest Vitals</h4>
                  <div className="vitals-grid">
                    {patient.vitals.temp && (
                      <div className="vital-item">
                        <span className="vital-label">Temp:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.temp)
                            ? patient.vitals.temp[
                                patient.vitals.temp.length - 1
                              ]
                            : patient.vitals.temp}
                          °C
                        </span>
                      </div>
                    )}
                    {patient.vitals.heartRate && (
                      <div className="vital-item">
                        <span className="vital-label">HR:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.heartRate)
                            ? patient.vitals.heartRate[
                                patient.vitals.heartRate.length - 1
                              ]
                            : patient.vitals.heartRate}
                        </span>
                      </div>
                    )}
                    {patient.vitals.bloodPressure && (
                      <div className="vital-item">
                        <span className="vital-label">BP:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.bloodPressure)
                            ? patient.vitals.bloodPressure[
                                patient.vitals.bloodPressure.length - 1
                              ]
                            : patient.vitals.bloodPressure}
                        </span>
                      </div>
                    )}
                    {patient.vitals.oxygen && (
                      <div className="vital-item">
                        <span className="vital-label">O2:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.oxygen)
                            ? patient.vitals.oxygen[
                                patient.vitals.oxygen.length - 1
                              ]
                            : patient.vitals.oxygen}
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
                <Clock className="w-5 h-5 inline mr-2" />
                Task Status
              </h3>

              {(() => {
                const completedTasks = tasks.filter(t => t.completed);
                const pendingTasks = tasks.filter(t => !t.completed);
                const sortedPending = pendingTasks.sort((a, b) => {
                  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
                });

                return (
                  <>
                    {/* Task Summary */}
                    <div className="task-summary">
                      <div className="task-summary-item">
                        <span className="task-summary-value">{tasks.length}</span>
                        <span className="task-summary-label">Total</span>
                      </div>
                      <div className="task-summary-item completed">
                        <span className="task-summary-value">{completedTasks.length}</span>
                        <span className="task-summary-label">Completed</span>
                      </div>
                      <div className="task-summary-item pending">
                        <span className="task-summary-value">{pendingTasks.length}</span>
                        <span className="task-summary-label">Pending</span>
                      </div>
                    </div>

                    {/* Completed Tasks */}
                    {completedTasks.length > 0 && (
                      <div className="task-section">
                        <h4 className="task-section-title">
                          <CheckSquare className="w-4 h-4 inline text-green-600" />
                          Completed This Shift ({completedTasks.length})
                        </h4>
                        <div className="task-list">
                          {completedTasks.map(task => (
                            <div
                              key={task.id}
                              className="task-item completed"
                              onClick={() => toggleTask(task.id)}
                            >
                              <CheckSquare className="task-checkbox checked" />
                              <div className="task-content">
                                <div className="task-header">
                                  <span className="task-time">{task.time}</span>
                                  <span className={`task-priority ${task.priority}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="task-description">{task.description}</p>
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
                          <AlertTriangle className="w-4 h-4 inline text-amber-600" />
                          Outstanding Tasks ({pendingTasks.length})
                        </h4>
                        <div className="task-list">
                          {sortedPending.map(task => (
                            <div
                              key={task.id}
                              className={`task-item pending priority-${task.priority}`}
                              onClick={() => toggleTask(task.id)}
                            >
                              <Square className="task-checkbox" />
                              <div className="task-content">
                                <div className="task-header">
                                  <span className="task-time">{task.time}</span>
                                  <span className={`task-priority ${task.priority}`}>
                                    {task.priority}
                                  </span>
                                </div>
                                <p className="task-description">{task.description}</p>
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

          {/* AI Provider Badge */}
          <div className="ai-provider-badge">
            <Sparkles className="ai-provider-icon" />
            <span className="ai-provider-text">
              Using{" "}
              <span className="ai-provider-name">
                {aiProvider === "claude" ? "Claude Sonnet 4" : "GPT-4o"}
              </span>
            </span>
          </div>
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
                          <>
                            <Save className="notes-action-icon" />
                            Save Handoff Notes
                          </>
                        )}
                      </button>
                    </>
                  )}
                  <button onClick={handleCopy} className="notes-action-button">
                    <Copy className="notes-action-icon" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {handoffNotesHistory.length > 0 && (
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="notes-action-button"
                    >
                      <FileText className="notes-action-icon" />
                      {showHistory ? "Hide" : "View"} History ({handoffNotesHistory.length})
                    </button>
                  )}
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

              {/* Handoff Notes History */}
              {showHistory && handoffNotesHistory.length > 0 && (
                <div className="mt-6 border-t-2 border-gray-300 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Previous Versions
                  </h4>
                  <div className="space-y-4">
                    {handoffNotesHistory.map((version, index) => (
                      <div key={index} className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-600">
                            Version {handoffNotesHistory.length - index}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(version.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                          <FormattedHandoffNotes content={version.notes} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
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
