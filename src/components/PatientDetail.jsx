import { useState, useRef } from 'react';
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
  Edit3
} from 'lucide-react';
import './PatientDetail.css';

const PatientDetail = ({ patient, aiProvider, onBack, onUpdate }) => {
  const [handoffNotes, setHandoffNotes] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageAnalysisLoading, setImageAnalysisLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageAnalysis, setImageAnalysis] = useState('');

  const fileInputRef = useRef(null);

  // Generate AI handoff notes from patient record
  const generateHandoffNotes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:3001/api/summarize-record/${aiProvider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientData: patient }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate handoff notes');
      }

      const data = await response.json();
      setHandoffNotes(data.summary);
      setIsEditing(true);
      setSuccess('Handoff notes generated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to generate handoff notes');
    } finally {
      setLoading(false);
    }
  };

  // Handle image upload
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file');
    }
  };

  // Analyze uploaded image
  const analyzeImage = async () => {
    if (!selectedImage) return;

    setImageAnalysisLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch(`http://localhost:3001/api/analyze-image/${aiProvider}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      setImageAnalysis(data.summary);

      // Append image analysis to handoff notes
      if (handoffNotes) {
        setHandoffNotes(prev => `${prev}\n\n## Handoff Document Analysis\n\n${data.summary}`);
      } else {
        setHandoffNotes(`## Handoff Document Analysis\n\n${data.summary}`);
      }

      setSuccess('Image analyzed and added to handoff notes!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setImageAnalysisLoading(false);
    }
  };

  // Clear image
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageAnalysis('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save handoff notes
  const saveHandoffNotes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`http://localhost:3001/api/patients/${patient.patientId || patient.patient_id}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handoffNotes,
          imageAnalysis,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save handoff notes');
      }

      setSuccess('Handoff notes saved successfully!');
      setIsEditing(false);

      if (onUpdate) {
        onUpdate({ ...patient, handoffNotes, lastUpdated: new Date().toISOString() });
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save handoff notes');
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

  const patientName = patient.demographics?.name || patient.patient_name;
  const patientAge = patient.demographics?.age || patient.age;
  const patientSex = patient.demographics?.sex || patient.sex;
  const chiefComplaint = patient.chiefComplaint || patient.chief_complaint;
  const codeStatus = patient.demographics?.codeStatus || patient.code_status;
  const medicalHistory = Array.isArray(patient.demographics?.history)
    ? patient.demographics.history.join(', ')
    : patient.medical_history;

  return (
    <div className="patient-detail-container">
      <button
        onClick={onBack}
        className="back-button"
      >
        <ArrowLeft className="action-button-icon" />
        Back to Patient List
      </button>

      <div className="patient-detail-grid">
        {/* Left Column - Patient Info */}
        <div className="patient-info-column">
          {/* Patient Header */}
          <div className="patient-header-card">
            <div className="patient-header-top">
              <h2 className="patient-name">{patientName}</h2>
              <div className="room-badge">
                Room {patient.room}
              </div>
            </div>
            <div className="patient-details-text">
              <p>{patientAge} • {patientSex}</p>
              <p>ID: {patient.patientId || patient.patient_id}</p>
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="chief-complaint-card">
            <h3 className="chief-complaint-header">
              <AlertCircle className="chief-complaint-icon" />
              Chief Complaint
            </h3>
            <p className="chief-complaint-text">{chiefComplaint}</p>
          </div>

          {/* Patient Details */}
          <div className="patient-info-card">
            <h3 className="patient-info-title">Patient Information</h3>

            <div className="info-section">
              <div className="info-item">
                <h4 className="info-label">Code Status</h4>
                <p className="info-value">{codeStatus}</p>
              </div>

              <div className="info-item">
                <h4 className="info-label">Medical History</h4>
                <p className="info-value">{medicalHistory || 'None documented'}</p>
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
                            ? patient.vitals.temp[patient.vitals.temp.length - 1]
                            : patient.vitals.temp}°C
                        </span>
                      </div>
                    )}
                    {patient.vitals.heartRate && (
                      <div className="vital-item">
                        <span className="vital-label">HR:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.heartRate)
                            ? patient.vitals.heartRate[patient.vitals.heartRate.length - 1]
                            : patient.vitals.heartRate}
                        </span>
                      </div>
                    )}
                    {patient.vitals.bloodPressure && (
                      <div className="vital-item">
                        <span className="vital-label">BP:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.bloodPressure)
                            ? patient.vitals.bloodPressure[patient.vitals.bloodPressure.length - 1]
                            : patient.vitals.bloodPressure}
                        </span>
                      </div>
                    )}
                    {patient.vitals.oxygen && (
                      <div className="vital-item">
                        <span className="vital-label">O2:</span>
                        <span className="vital-value">
                          {Array.isArray(patient.vitals.oxygen)
                            ? patient.vitals.oxygen[patient.vitals.oxygen.length - 1]
                            : patient.vitals.oxygen}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Provider Badge */}
          <div className="ai-provider-badge">
            <Sparkles className="ai-provider-icon" />
            <span className="ai-provider-text">
              Using <span className="ai-provider-name">{aiProvider === 'claude' ? 'Claude Sonnet 4' : 'GPT-4o'}</span>
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
                    <Loader2 className="action-button-icon" style={{ animation: 'spin 1s linear infinite' }} />
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
                    <p className="image-preview-text">Handoff document uploaded</p>
                    <button
                      onClick={analyzeImage}
                      disabled={imageAnalysisLoading}
                      className="analyze-button"
                    >
                      {imageAnalysisLoading ? (
                        <>
                          <Loader2 className="notes-action-icon" style={{ animation: 'spin 1s linear infinite' }} />
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
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="notes-action-button"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className="notes-action-button"
                  >
                    <Copy className="notes-action-icon" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  {isEditing && (
                    <button
                      onClick={saveHandoffNotes}
                      disabled={loading}
                      className="notes-action-button primary"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="notes-action-icon" style={{ animation: 'spin 1s linear infinite' }} />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="notes-action-icon" />
                          Save
                        </>
                      )}
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
                <div className="notes-display">
                  <pre className="notes-display-content">{handoffNotes}</pre>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!handoffNotes && (
            <div className="empty-state">
              <Sparkles className="empty-state-icon" />
              <h3 className="empty-state-title">
                No Handoff Notes Yet
              </h3>
              <p className="empty-state-text">
                Generate AI-powered handoff notes from the patient record or upload a handoff document image to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientDetail;
