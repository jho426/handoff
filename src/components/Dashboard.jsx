import { useState } from 'react';
import { Camera, FileText, Users, Settings } from 'lucide-react';
import ImageAnalyzer from './ImageAnalyzer';
import PatientRecords from './PatientRecords';

const Dashboard = () => {
  const [activeView, setActiveView] = useState('home');
  const [aiProvider, setAiProvider] = useState('claude');

  const renderView = () => {
    switch (activeView) {
      case 'image':
        return <ImageAnalyzer aiProvider={aiProvider} onBack={() => setActiveView('home')} />;
      case 'records':
        return <PatientRecords aiProvider={aiProvider} onBack={() => setActiveView('home')} />;
      case 'home':
      default:
        return (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-gray-800 mb-4">
                Nurse Handoff Helper
              </h1>
              <p className="text-xl text-gray-600">
                AI-powered tools to streamline patient handoff and care coordination
              </p>
            </div>

            {/* AI Provider Selection */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="w-6 h-6 text-gray-600" />
                  <h2 className="text-xl font-semibold text-gray-800">AI Provider</h2>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setAiProvider('claude')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      aiProvider === 'claude'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Claude
                  </button>
                  <button
                    onClick={() => setAiProvider('openai')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${
                      aiProvider === 'openai'
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    OpenAI
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Current provider: <span className="font-semibold">{aiProvider === 'claude' ? 'Claude Sonnet 4' : 'GPT-4o'}</span>
              </p>
            </div>

            {/* Feature Cards */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Image Analysis Card */}
              <div
                onClick={() => setActiveView('image')}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl border border-blue-100"
              >
                <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <Camera className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Analyze Handoff Document
                </h2>
                <p className="text-gray-600 mb-4">
                  Upload a photo of a handoff whiteboard or sheet to get an AI-powered summary
                  with key patient information, vital signs, and action items.
                </p>
                <div className="flex items-center text-blue-600 font-semibold">
                  Get Started
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Patient Records Card */}
              <div
                onClick={() => setActiveView('records')}
                className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 cursor-pointer transform transition-all hover:scale-105 hover:shadow-2xl border border-emerald-100"
              >
                <div className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-3">
                  Patient Records Summary
                </h2>
                <p className="text-gray-600 mb-4">
                  View and analyze patient records with AI-generated summaries highlighting
                  critical information, trends, and pending tasks.
                </p>
                <div className="flex items-center text-emerald-600 font-semibold">
                  View Records
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="mt-12 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
              <div className="flex items-start gap-4">
                <div className="bg-purple-500 rounded-full p-2">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    About This Tool
                  </h3>
                  <p className="text-gray-600">
                    This application helps healthcare professionals streamline patient handoffs
                    by leveraging AI to extract, summarize, and organize critical patient information.
                    Choose your preferred AI provider and select a feature above to get started.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      {renderView()}
    </div>
  );
};

export default Dashboard;
