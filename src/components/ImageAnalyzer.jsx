import { useState, useRef } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle, X, ArrowLeft, Copy } from 'lucide-react';

const ImageAnalyzer = ({ aiProvider, onBack }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      setError('');
      setSummary('');

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
      setSummary('');

      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setError('Please drop a valid image file');
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError('');
    setSummary('');

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`http://localhost:3001/api/analyze-image/${aiProvider}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing the image');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setSummary('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Analyze Handoff Document</h2>
          <div className="px-4 py-2 bg-blue-50 rounded-lg">
            <span className="text-sm text-blue-600 font-medium">
              Using: {aiProvider === 'claude' ? 'Claude Sonnet 4' : 'GPT-4o'}
            </span>
          </div>
        </div>

        {!preview ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            className="border-3 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg text-gray-600 mb-2">
              Drop an image here or click to select
            </p>
            <p className="text-sm text-gray-400">
              Supports JPG, PNG, and other image formats
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-full rounded-lg border-2 border-gray-200"
              />
              <button
                onClick={handleClear}
                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-lg transition-colors flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Analyzing with {aiProvider === 'claude' ? 'Claude' : 'OpenAI'}...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Analyze Document
                </>
              )}
            </button>
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {summary && (
          <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-800">Analysis Complete</h3>
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
};

export default ImageAnalyzer;
