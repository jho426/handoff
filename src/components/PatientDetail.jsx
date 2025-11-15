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
} from "lucide-react";
import FormattedHandoffNotes from "./FormattedHandoffNotes";

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

  const fileInputRef = useRef(null);

  useEffect(() => {
    setHandoffNotes(patient.handoffNotes || patient.handoff_notes || "");
  }, [patient]);

  // Generate AI handoff notes from patient record
  const generateHandoffNotes = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `http://localhost:3001/api/summarize-record/${aiProvider}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientData: patient }),
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

    try {
      const response = await fetch(
        `http://localhost:3001/api/patients/${
          patient.patientId || patient.patient_id
        }/handoff`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            handoffNotes,
            imageAnalysis,
            timestamp: new Date().toISOString(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save handoff notes");
      }

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
      setError(err.message || "Failed to save handoff notes");
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
    ? patient.demographics.history.join(", ")
    : patient.medical_history;

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Patient List
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Patient Info */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">
                {patientName}
              </h2>
              <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                Room {patient.room}
              </div>
            </div>
            <div className="text-gray-600 space-y-2">
              <p>
                {patientAge} • {patientSex}
              </p>
              <p className="text-sm">
                ID: {patient.patientId || patient.patient_id}
              </p>
            </div>
          </div>

          {/* Chief Complaint */}
          <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-100">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Chief Complaint
            </h3>
            <p className="text-gray-700">{chiefComplaint}</p>
          </div>

          {/* Patient Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              Patient Information
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-1">
                  Code Status
                </h4>
                <p className="text-gray-800 font-medium">{codeStatus}</p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-1">
                  Medical History
                </h4>
                <p className="text-gray-800">
                  {medicalHistory || "None documented"}
                </p>
              </div>

              {/* Vital Signs */}
              {patient.vitals && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-600 mb-2">
                    Latest Vitals
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {patient.vitals.temp && (
                      <div className="bg-blue-50 p-2 rounded">
                        <span className="text-gray-600">Temp:</span>
                        <span className="font-semibold ml-1">
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
                      <div className="bg-red-50 p-2 rounded">
                        <span className="text-gray-600">HR:</span>
                        <span className="font-semibold ml-1">
                          {Array.isArray(patient.vitals.heartRate)
                            ? patient.vitals.heartRate[
                                patient.vitals.heartRate.length - 1
                              ]
                            : patient.vitals.heartRate}
                        </span>
                      </div>
                    )}
                    {patient.vitals.bloodPressure && (
                      <div className="bg-purple-50 p-2 rounded">
                        <span className="text-gray-600">BP:</span>
                        <span className="font-semibold ml-1">
                          {Array.isArray(patient.vitals.bloodPressure)
                            ? patient.vitals.bloodPressure[
                                patient.vitals.bloodPressure.length - 1
                              ]
                            : patient.vitals.bloodPressure}
                        </span>
                      </div>
                    )}
                    {patient.vitals.oxygen && (
                      <div className="bg-green-50 p-2 rounded">
                        <span className="text-gray-600">O2:</span>
                        <span className="font-semibold ml-1">
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

          {/* AI Provider Badge */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-gray-700">
                Using{" "}
                <span className="font-semibold">
                  {aiProvider === "claude" ? "Claude Sonnet 4" : "GPT-4o"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Handoff Notes & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Generate Handoff Notes
            </h3>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={generateHandoffNotes}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate from Record
                  </>
                )}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                <Camera className="w-5 h-5" />
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
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-dashed border-gray-300">
                <div className="flex items-start gap-4">
                  <div className="relative flex-shrink-0">
                    <img
                      src={imagePreview}
                      alt="Handoff document"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-gray-600 mb-2">
                      Handoff document uploaded
                    </p>
                    <button
                      onClick={analyzeImage}
                      disabled={imageAnalysisLoading}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      {imageAnalysisLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium">Error</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-green-700 font-medium">{success}</p>
              </div>
            )}
          </div>

          {/* Handoff Notes Editor */}
          {handoffNotes && (
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Handoff Notes
                </h3>
                <div className="flex gap-2">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Save changes
                    </button>
                  )}
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {isEditing && (
                    <button
                      onClick={saveHandoffNotes}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="bg-white rounded-xl p-6 border-2 border-blue-400 shadow-lg">
                  <textarea
                    value={handoffNotes}
                    onChange={(e) => setHandoffNotes(e.target.value)}
                    className="w-full h-96 p-4 bg-gray-50 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm resize-none font-mono"
                    placeholder="Edit your handoff notes here..."
                  />
                </div>
              ) : (
                <FormattedHandoffNotes content={handoffNotes} />
              )}
            </div>
          )}

          {/* Empty State */}
          {!handoffNotes && (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-12 text-center border-2 border-dashed border-gray-300">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Handoff Notes Yet
              </h3>
              <p className="text-gray-600">
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
