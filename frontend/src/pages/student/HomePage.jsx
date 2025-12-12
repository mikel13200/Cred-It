import React, { useState, useEffect } from 'react';
import {
  Header,
  SidebarStudent,
  BackgroundLayout,
} from '../../components/layout';

import {
  MultiImageUploader,
  ImagePreviewPanel,
  ImageEditorWrapper,
  ExtractedPanel,
  TorInfo,
  useTorUpload,
} from '../../features/transcript';
import { ProfilePanel, useProfile } from '../../features/profile';
import { SubmissionsList } from '../../features/tracking';
import { useModal, useNotification } from '../../hooks';
import { useAuthContext } from '../../context';
import { Upload, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [editingImage, setEditingImage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);

  // Get user from auth context instead of localStorage
  const { user } = useAuthContext();
  const userName = user?.username || '';

  const profileModal = useModal();
  const previewModal = useModal();
  const editorModal = useModal();
  const resultsModal = useModal();

  const { uploadOcr, loading, ocrResults } = useTorUpload();

  // Profile check
  const { profileExists, loading: profileLoading, checkExists, checkComplete } = useProfile(userName);
  const { showError } = useNotification();

  // Auto-open profile for new users
  useEffect(() => {
    if (checkComplete && !profileExists && !profileLoading) {
      profileModal.open();
    }
  }, [checkComplete, profileExists, profileLoading]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const handleContinue = (images) => {
    setUploadedImages(images);
    setShowUploadModal(false);
    previewModal.open();
  };

  const handleEditImage = (image) => {
    setEditingImage(image);
    editorModal.open();
  };

  const handleSaveEdit = (updatedImage) => {
    const newImages = uploadedImages.map((img) =>
      img.id === updatedImage.id ? updatedImage : img
    );
    setUploadedImages(newImages);
  };

  const handleProcess = async () => {
    // Close preview modal and show processing modal
    previewModal.close();
    setShowProcessingModal(true);

    try {
      const result = await uploadOcr(uploadedImages, userName);

      setShowProcessingModal(false);

      // Validate response
      if (result && result.ocr_results && result.school_tor) {
        setTimeout(() => {
          resultsModal.open();
        }, 100);
      } else {
        showError('Invalid OCR response format');
      }
    } catch (error) {
      setShowProcessingModal(false);
      showError(error.message || 'OCR processing failed');
    }
  };

  const handleCloseResults = () => {
    resultsModal.close();
    setUploadedImages([]);
  };

  return (
    <BackgroundLayout>
      <div className="min-h-screen relative overflow-hidden">
        {/* Enhanced Animated Background */}
        <div className="fixed inset-0 -z-10">
          {/* Base gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/60"></div>

          {/* Animated mesh gradient overlay */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 -left-40 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
            <div className="absolute top-0 -right-40 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-40 left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            <div className="absolute bottom-0 right-20 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-6000"></div>
          </div>

          {/* Grid pattern overlay */}
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

          {/* Floating particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(15)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-500/20 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                  animationDelay: `${Math.random() * 2}s`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Header toggleSidebar={toggleSidebar} userName={userName} />
          <SidebarStudent
            sidebarOpen={sidebarOpen}
            onOpenProfile={profileModal.open}
          />

          {sidebarOpen && (
            <div
              className="fixed top-[80px] left-0 right-0 bottom-0 bg-black bg-opacity-50 z-10"
              onClick={toggleSidebar}
            />
          )}

          <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-12">
            <div className="mt-4 sm:mt-6">
              <TorInfo />
            </div>

            <SubmissionsList userName={userName} />

            <div className="mt-8 sm:mt-12 flex justify-center">
              <button
                onClick={() => {
                  if (!profileExists) {
                    showError("Please Fill the Profile located upper left corner");
                    return;
                  }
                  setShowUploadModal(true);
                }}
                className="group relative px-8 py-4 sm:px-12 sm:py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-2xl hover:shadow-blue-500/50 transform hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-30 blur-xl transition-opacity duration-300"></div>

                <div className="relative flex items-center gap-3">
                  <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse" />
                  <span className="text-lg sm:text-xl md:text-2xl">
                    Upload Transcript Images
                  </span>
                  <Upload className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
              </button>
            </div>
          </main>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto scrollbar-thin">
              <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-white" />
                    <h2 className="text-2xl font-bold text-white">
                      Upload Your Transcript
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
                <p className="text-white/90 mt-2">
                  Upload images of your transcript for processing
                </p>
              </div>

              <div className="p-6">
                <MultiImageUploader onContinue={handleContinue} />
              </div>
            </div>
          </div>
        )}

        <ImagePreviewPanel
          isOpen={previewModal.isOpen}
          images={uploadedImages}
          onClose={previewModal.close}
          onProcess={handleProcess}
          onEditImage={handleEditImage}
          loading={loading}
        />

        <ImageEditorWrapper
          image={editingImage}
          isOpen={editorModal.isOpen}
          onClose={editorModal.close}
          onSave={handleSaveEdit}
        />

        <ExtractedPanel
          data={ocrResults}
          accountId={userName}
          isOpen={resultsModal.isOpen}
          onClose={handleCloseResults}
        />

        <ProfilePanel
          userId={userName}
          isOpen={profileModal.isOpen}
          onClose={profileModal.close}
          onSaveSuccess={checkExists}
        />

        {showProcessingModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="relative py-16 px-6 max-w-md w-full">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-90 rounded-2xl"></div>

              <div className="relative">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-200 p-8">
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
                        <svg
                          className="w-12 h-12 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>

                      <div className="absolute inset-0 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Processing OCR...
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Extracting text from your images
                    </p>

                    <div className="flex justify-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
                      <div
                        className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className="w-3 h-3 bg-purple-600 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                </div>

                <p className="text-center text-sm text-gray-600 mt-6 font-medium">
                  Please wait... This may take a few moments
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </BackgroundLayout>
  );
}
