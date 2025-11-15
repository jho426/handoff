import { useState, useEffect } from 'react';
import { ArrowLeft, User, Loader2, FileText, CheckCircle2, AlertCircle, Copy, ChevronRight } from 'lucide-react';

const PatientRecords = ({ aiProvider, onBack }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      const response = await fetch('http://localhost:3001/api/patients');
      if (!response.ok) throw new Error('Failed to fetch patients');
      const data = await response.json();
      setPatients(data.patients || data);
    } catch (err) {
      setError('Failed to load patient records');
    } finally {
      setLoadingPatients(false);
    }
  };

  const handleSummarize = async (patient) => {
    setLoading(true);
    setError('');
    setSummary('');
    setSelectedPatient(patient);

    try {
      const response = await fetch(`http://localhost:3001/api/summarize-record/${aiProvider}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ patientData: patient }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to summarize record');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err.message || 'An error occurred while summarizing the record');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = () => {
    setSelectedPatient(null);
    setSummary('');
    setError('');
  };

  if (loadingPatients) {
    return (
      <div className="max-w-6xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </button>
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading patient records...</p>
        </div>
      </div>
    );
  }

  if (selectedPatient) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Patient List
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">
                {selectedPatient.demographics?.name || selectedPatient.patient_name}
              </h2>
              <p className="text-gray-600 mt-1">
                Room {selectedPatient.room} • {selectedPatient.demographics?.age || selectedPatient.age} • {selectedPatient.demographics?.sex || selectedPatient.sex}
              </p>
            </div>
            <div className="px-4 py-2 bg-emerald-50 rounded-lg">
              <span className="text-sm text-emerald-600 font-medium">
                Using: {aiProvider === 'claude' ? 'Claude Sonnet 4' : 'GPT-4o'}
              </span>
            </div>
          </div>

          {/* Patient Details */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Chief Complaint</h3>
            <p className="text-gray-700 mb-4">{selectedPatient.chiefComplaint || selectedPatient.chief_complaint}</p>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="font-semibold text-gray-700 text-sm mb-2">Code Status</h4>
                <p className="text-gray-600">{selectedPatient.demographics?.codeStatus || selectedPatient.code_status}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 text-sm mb-2">Medical History</h4>
                <p className="text-gray-600">
                  {Array.isArray(selectedPatient.demographics?.history)
                    ? selectedPatient.demographics.history.join(', ')
                    : selectedPatient.medical_history}
                </p>
              </div>
            </div>
          </div>

          {/* Vital Signs */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Vital Signs</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {selectedPatient.vitals?.temp && (
                <div>
                  <p className="text-xs text-gray-600">Temp</p>
                  <p className="font-semibold text-gray-800">
                    {Array.isArray(selectedPatient.vitals.temp)
                      ? selectedPatient.vitals.temp[selectedPatient.vitals.temp.length - 1]
                      : selectedPatient.vitals.temp}°C
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-600">HR</p>
                <p className="font-semibold text-gray-800">
                  {Array.isArray(selectedPatient.vitals?.heartRate)
                    ? selectedPatient.vitals.heartRate[selectedPatient.vitals.heartRate.length - 1]
                    : selectedPatient.vital_signs?.heart_rate || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">BP</p>
                <p className="font-semibold text-gray-800">
                  {Array.isArray(selectedPatient.vitals?.bloodPressure)
                    ? selectedPatient.vitals.bloodPressure[selectedPatient.vitals.bloodPressure.length - 1]
                    : selectedPatient.vital_signs?.blood_pressure || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">RR</p>
                <p className="font-semibold text-gray-800">
                  {Array.isArray(selectedPatient.vitals?.respRate)
                    ? selectedPatient.vitals.respRate[selectedPatient.vitals.respRate.length - 1]
                    : selectedPatient.vital_signs?.respiratory_rate || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">O2 Sat</p>
                <p className="font-semibold text-gray-800">
                  {Array.isArray(selectedPatient.vitals?.oxygen)
                    ? selectedPatient.vitals.oxygen[selectedPatient.vitals.oxygen.length - 1]
                    : selectedPatient.vital_signs?.oxygen_saturation || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Generate Summary Button */}
          {!summary && !loading && (
            <button
              onClick={() => handleSummarize(selectedPatient)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              <FileText className="w-5 h-5" />
              Generate AI Summary
            </button>
          )}

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <p className="text-blue-600 font-medium">
                Analyzing patient record with {aiProvider === 'claude' ? 'Claude' : 'OpenAI'}...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {summary && (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-semibold text-gray-800">Handoff Summary</h3>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-100">
                <pre className="whitespace-pre-wrap text-gray-700 font-sans">{summary}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Patient Records</h2>
          <div className="px-4 py-2 bg-emerald-50 rounded-lg">
            <span className="text-sm text-emerald-600 font-medium">
              {patients.length} Patient{patients.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {patients.map((patient) => (
            <div
              key={patient.patientId || patient.patient_id}
              onClick={() => handleSummarize(patient)}
              className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-6 cursor-pointer hover:shadow-lg transition-all border border-gray-200 hover:border-blue-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500 w-12 h-12 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">
                      {patient.demographics?.name || patient.patient_name}
                    </h3>
                    <p className="text-gray-600">
                      Room {patient.room} • {patient.demographics?.age || patient.age} • {patient.demographics?.sex || patient.sex}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {patient.chiefComplaint || patient.chief_complaint}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientRecords;
