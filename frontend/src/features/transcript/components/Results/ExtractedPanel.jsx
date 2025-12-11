import React, { useState } from 'react';
import { torApi, requestApi } from '../../../../api';
import { Modal, ModalContent, Button, ConfirmDialog } from '../../../../components/common';
import { useNotification } from '../../../../hooks';
import ComparisonTable from './ComparisonTable';
import SummaryView from './SummaryView';
import { CheckCircle2, FileCheck, Sparkles } from 'lucide-react';

export default function ExtractedPanel({ data, accountId, isOpen, onClose }) {
  const { school_tor = [], ocr_results = [] } = data || {};
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [hideRequestButton, setHideRequestButton] = useState(false);
  const [showConfirmPanel, setShowConfirmPanel] = useState(false);
  const [showSyncCompleted, setShowSyncCompleted] = useState(false);

  const { showSuccess, showError } = useNotification();

  const handleCancel = async () => {
    // If summary is shown, data is finalized. Do NOT delete.
    if (showSummary) {
      onClose();
      return;
    }

    try {
      await torApi.deleteOcr(accountId);
    } catch (err) {
      console.error('Failed to delete OCR entries:', err);
    }
    onClose();
  };

  const handleRequestCreditation = async () => {
    if (isRequesting) return;
    setIsRequesting(true);

    try {
      await requestApi.requestTor(accountId);
      showSuccess('Request Creditation submitted successfully!');
      setHideRequestButton(true);
      setTimeout(() => onClose(), 15000);
    } catch (error) {
      const errorMsg = error.message || 'Failed to request creditation.';
      showError(errorMsg);

      // Hide button if profile is incomplete or request already exists
      if (errorMsg.includes('profile') || errorMsg.includes('pending request')) {
        setHideRequestButton(true);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSeeResult = () => {
    if (isProcessing) return;
    setShowConfirmPanel(true);
  };

  const handleConfirmContinue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Copy TOR entries
      const copyResult = await torApi.copyTor(accountId);
      console.log('copyTor returned:', copyResult);

      if (!copyResult || !copyResult.data) {
        console.error('Invalid response - copyResult:', copyResult);
        throw new Error('Invalid response from server. Please try again.');
      }

      // 🔥 Extract the actual backend payload
      const payload = copyResult.data;       // axios wrapper
      const serverData = payload.data;       // backend "data: [...]"

      let torEntries = [];

      if (Array.isArray(serverData)) {
        torEntries = serverData;
      } else if (serverData && serverData.count === 0) {
        showError('No TOR entries found to process. Please upload your transcript first.');
        setShowConfirmPanel(false);
        setIsProcessing(false);
        return;
      } else {
        console.error('Unexpected data format:', serverData);
        throw new Error('Unexpected data format from server.');
      }

      if (torEntries.length === 0) {
        showError('No TOR entries found to process.');
        setShowConfirmPanel(false);
        setIsProcessing(false);
        return;
      }

      // Process remarks
      const processedData = torEntries.map((row) => {
        const units = parseFloat(row.total_academic_units);
        let remarks = 'Failed / Invalid Units';
        if (units && !isNaN(units) && units > 0 && units <= 15) {
          remarks = 'Passed';
        }
        return { ...row, remarks };
      });

      const passedEntries = processedData.filter(
        (r) => r.remarks === 'Passed'
      );
      const failedEntries = processedData.filter(
        (r) => r.remarks === 'Failed / Invalid Units'
      );

      // Update backend
      await torApi.updateTorResults(
        accountId,
        failedEntries.map((e) => e.subject_code),
        passedEntries.map((e) => ({
          subject_code: e.subject_code,
          remarks: e.remarks,
        }))
      );

      setShowConfirmPanel(false);
      setShowSyncCompleted(true);
      showSuccess('Result processed successfully! Click "Completed" to finalize.');
    } catch (err) {
      console.error('Error processing TOR:', err);
      showError(err.message || 'Error occurred while processing results.');
    } finally {
      setIsProcessing(false);
    }
  };


  const handleCompleted = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const result = await torApi.syncCompleted(accountId);

      console.log("SYNC COMPLETED RAW RESPONSE:", result);

      // FIX: Backend returned an array directly
      const summary = Array.isArray(result) ? result : [];

      console.log("SUMMARY ARRAY:", summary);

      setSummaryData(summary);
      setShowSyncCompleted(false);
      setShowSummary(true);

      showSuccess("Sync completed successfully! Summary is now available.");
    } catch (err) {
      console.error(err);
      showError("Error occurred while completing sync.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCancel} title="Extracted TOR Results" size="full">
        <ModalContent>
          {!showSummary && !showConfirmPanel && !showSyncCompleted && (
            <ComparisonTable schoolTor={school_tor} ocrResults={ocr_results} />
          )}

          {showSummary && <SummaryView data={summaryData} />}

          {showSummary && !hideRequestButton && (
            <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <div className="max-w-2xl mx-auto text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Submit</h3>
                <p className="text-gray-600 mb-6">
                  Your results have been processed successfully. Submit your accreditation request now!
                </p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  <button
                    onClick={handleRequestCreditation}
                    disabled={isRequesting}
                    className="group relative px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      <span>{isRequesting ? 'Submitting...' : 'Request Accreditation'}</span>
                      <FileCheck className="w-5 h-5" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {!showSummary && !showConfirmPanel && !showSyncCompleted && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleSeeResult}
                disabled={isProcessing}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="flex items-center gap-3">
                  <FileCheck className="w-6 h-6" />
                  <span className="text-lg">{isProcessing ? 'Processing...' : 'See Result'}</span>
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </button>
            </div>
          )}
        </ModalContent>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmPanel}
        onClose={() => setShowConfirmPanel(false)}
        onConfirm={handleConfirmContinue}
        title="Heads up"
        message="This will take some time, depending on your Internet Connection."
        confirmText="Continue"
        loading={isProcessing}
      />

      {/* Sync Completed Dialog */}
      <ConfirmDialog
        isOpen={showSyncCompleted}
        onClose={() => { }}
        onConfirm={handleCompleted}
        title="Sync Completed"
        message='Processing is complete. Please click "Completed" to finalize the results.'
        confirmText="Completed"
        cancelText=""
        loading={isProcessing}
      />
    </>
  );
}