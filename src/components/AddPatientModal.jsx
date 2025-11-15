import { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, AlertCircle, User, MapPin, Activity, Calendar, Pill, AlertTriangle, Heart } from 'lucide-react';
import './AddPatientModal.css';

const AddPatientModal = ({ isOpen, onClose, onPatientAdded, aiProvider = 'claude' }) => {
  const [mode, setMode] = useState('manual'); // 'manual' or 'ai'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Image upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Manual form state
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    sex: '',
    mrn: '',
    room: '',
    diagnosis: '',
    condition: '',
    riskLevel: 'medium',
    codeStatus: 'Full Code',
    medications: [],
    allergies: [],
    admissionDate: new Date().toISOString().split('T')[0],
    lastVitals: {
      temp: '',
      heartRate: '',
      bp: '',
      respRate: '',
      o2Sat: ''
    },
    gridX: '',
    gridY: ''
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setError('Please select a valid image file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setError('Please drop a valid image file');
    }
  };

  const handleAIExtract = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');

    try {
      // First, analyze the image
      const formDataImg = new FormData();
      formDataImg.append('image', selectedFile);

      const response = await fetch(`http://localhost:3001/api/analyze-image/${aiProvider}`, {
        method: 'POST',
        body: formDataImg,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();

      // Now extract structured patient data from the summary
      const extractResponse = await fetch(`http://localhost:3001/api/extract-patient-data/${aiProvider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: data.summary }),
      });

      if (!extractResponse.ok) {
        throw new Error('Failed to extract patient data');
      }

      const extractedData = await extractResponse.json();

      // Pre-fill the form with extracted data
      setFormData(prev => ({
        ...prev,
        ...extractedData.patientData,
        medications: extractedData.patientData.medications || [],
        allergies: extractedData.patientData.allergies || [],
        lastVitals: {
          ...prev.lastVitals,
          ...extractedData.patientData.lastVitals
        }
      }));

      // Switch to manual mode so user can review/edit
      setMode('manual');
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing the image');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    // Validate required fields
    if (!formData.name || !formData.mrn || !formData.room) {
      setError('Please fill in required fields: Name, MRN, and Room');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create patient');
      }

      const data = await response.json();
      onPatientAdded(data.patient);
      handleClose();
    } catch (err) {
      setError(err.message || 'An error occurred while creating the patient');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setMode('manual');
    setSelectedFile(null);
    setPreview(null);
    setError('');
    setFormData({
      name: '',
      age: '',
      sex: '',
      mrn: '',
      room: '',
      diagnosis: '',
      condition: '',
      riskLevel: 'medium',
      codeStatus: 'Full Code',
      medications: [],
      allergies: [],
      admissionDate: new Date().toISOString().split('T')[0],
      lastVitals: { temp: '', heartRate: '', bp: '', respRate: '', o2Sat: '' },
      gridX: '',
      gridY: ''
    });
    onClose();
  };

  const handleInputChange = (field, value) => {
    if (field.startsWith('vitals.')) {
      const vitalField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        lastVitals: { ...prev.lastVitals, [vitalField]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleArrayInput = (field, value) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: items }));
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content add-patient-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Patient</h2>
          <button onClick={handleClose} className="close-button">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mode-selector">
          <button
            className={`mode-button ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            <FileText className="w-5 h-5" />
            Manual Input
          </button>
          <button
            className={`mode-button ${mode === 'ai' ? 'active' : ''}`}
            onClick={() => setMode('ai')}
          >
            <Upload className="w-5 h-5" />
            AI Extract from Image
          </button>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-body">
          {mode === 'ai' ? (
            <div className="ai-mode">
              {!preview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="upload-area"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden-input"
                  />
                  <Upload className="upload-icon" />
                  <p className="upload-text">Drop an image here or click to select</p>
                  <p className="upload-subtext">Upload handoff document or patient information sheet</p>
                </div>
              ) : (
                <div className="preview-section">
                  <img src={preview} alt="Preview" className="preview-image" />
                  <div className="preview-actions">
                    <button onClick={() => { setPreview(null); setSelectedFile(null); }} className="secondary-button">
                      Remove Image
                    </button>
                    <button onClick={handleAIExtract} disabled={loading} className="primary-button">
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Extracting Data...
                        </>
                      ) : (
                        'Extract Patient Data'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="manual-mode">
              <div className="form-grid">
                <div className="form-section">
                  <h3 className="section-title">
                    <User className="w-5 h-5" />
                    Patient Information
                  </h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="form-field">
                      <label>MRN *</label>
                      <input
                        type="text"
                        value={formData.mrn}
                        onChange={(e) => handleInputChange('mrn', e.target.value)}
                        placeholder="12345678"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Age</label>
                      <input
                        type="number"
                        value={formData.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        placeholder="65"
                      />
                    </div>
                    <div className="form-field">
                      <label>Sex</label>
                      <select value={formData.sex} onChange={(e) => handleInputChange('sex', e.target.value)}>
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Admission Date</label>
                      <input
                        type="date"
                        value={formData.admissionDate}
                        onChange={(e) => handleInputChange('admissionDate', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">
                    <MapPin className="w-5 h-5" />
                    Location
                  </h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Room Number *</label>
                      <input
                        type="text"
                        value={formData.room}
                        onChange={(e) => handleInputChange('room', e.target.value)}
                        placeholder="101"
                      />
                    </div>
                    <div className="form-field">
                      <label>Grid X</label>
                      <input
                        type="number"
                        value={formData.gridX}
                        onChange={(e) => handleInputChange('gridX', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="form-field">
                      <label>Grid Y</label>
                      <input
                        type="number"
                        value={formData.gridY}
                        onChange={(e) => handleInputChange('gridY', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">
                    <Activity className="w-5 h-5" />
                    Clinical Information
                  </h3>
                  <div className="form-field">
                    <label>Diagnosis</label>
                    <input
                      type="text"
                      value={formData.diagnosis}
                      onChange={(e) => handleInputChange('diagnosis', e.target.value)}
                      placeholder="Primary diagnosis"
                    />
                  </div>
                  <div className="form-field">
                    <label>Chief Complaint / Condition</label>
                    <input
                      type="text"
                      value={formData.condition}
                      onChange={(e) => handleInputChange('condition', e.target.value)}
                      placeholder="Current condition"
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Risk Level</label>
                      <select value={formData.riskLevel} onChange={(e) => handleInputChange('riskLevel', e.target.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Code Status</label>
                      <select value={formData.codeStatus} onChange={(e) => handleInputChange('codeStatus', e.target.value)}>
                        <option value="Full Code">Full Code</option>
                        <option value="DNR">DNR</option>
                        <option value="DNI">DNI</option>
                        <option value="DNR/DNI">DNR/DNI</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">
                    <Heart className="w-5 h-5" />
                    Vital Signs
                  </h3>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Temp (°F)</label>
                      <input
                        type="text"
                        value={formData.lastVitals.temp}
                        onChange={(e) => handleInputChange('vitals.temp', e.target.value)}
                        placeholder="98.6"
                      />
                    </div>
                    <div className="form-field">
                      <label>HR (bpm)</label>
                      <input
                        type="text"
                        value={formData.lastVitals.heartRate}
                        onChange={(e) => handleInputChange('vitals.heartRate', e.target.value)}
                        placeholder="72"
                      />
                    </div>
                    <div className="form-field">
                      <label>BP (mmHg)</label>
                      <input
                        type="text"
                        value={formData.lastVitals.bp}
                        onChange={(e) => handleInputChange('vitals.bp', e.target.value)}
                        placeholder="120/80"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>RR (breaths/min)</label>
                      <input
                        type="text"
                        value={formData.lastVitals.respRate}
                        onChange={(e) => handleInputChange('vitals.respRate', e.target.value)}
                        placeholder="16"
                      />
                    </div>
                    <div className="form-field">
                      <label>O2 Sat (%)</label>
                      <input
                        type="text"
                        value={formData.lastVitals.o2Sat}
                        onChange={(e) => handleInputChange('vitals.o2Sat', e.target.value)}
                        placeholder="98"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="section-title">
                    <Pill className="w-5 h-5" />
                    Medications & Allergies
                  </h3>
                  <div className="form-field">
                    <label>Medications (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.medications.join(', ')}
                      onChange={(e) => handleArrayInput('medications', e.target.value)}
                      placeholder="Aspirin 81mg, Lisinopril 10mg"
                    />
                  </div>
                  <div className="form-field">
                    <label>Allergies (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.allergies.join(', ')}
                      onChange={(e) => handleArrayInput('allergies', e.target.value)}
                      placeholder="Penicillin, Latex"
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button onClick={handleClose} className="secondary-button" disabled={loading}>
                  Cancel
                </button>
                <button onClick={handleManualSubmit} className="primary-button" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating Patient...
                    </>
                  ) : (
                    'Create Patient'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPatientModal;
