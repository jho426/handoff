import { useState, useEffect } from 'react';
import { ArrowLeft, User, Loader2, ChevronRight } from 'lucide-react';
import PatientDetail from './PatientDetail';

const PatientRecords = ({ aiProvider, onBack }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [error, setError] = useState('');

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

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
  };

  const handlePatientUpdate = (updatedPatient) => {
    setPatients(prevPatients =>
      prevPatients.map(p =>
        (p.patientId || p.patient_id) === (updatedPatient.patientId || updatedPatient.patient_id)
          ? updatedPatient
          : p
      )
    );
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
      <PatientDetail
        patient={selectedPatient}
        aiProvider={aiProvider}
        onBack={handleBackToList}
        onUpdate={handlePatientUpdate}
      />
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
              onClick={() => handleSelectPatient(patient)}
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
