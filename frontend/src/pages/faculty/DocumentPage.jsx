import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronDown } from 'lucide-react';
import {
  Button,
  Loader,
  Modal,
  ModalContent,
  ModalFooter,
  Input,
  TabNavigation,
  ConfirmDialog,
} from '../../components/common';
import { profileApi, torApi, requestApi } from '../../api';
import { useNotification, useModal } from '../../hooks';

export default function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Basic state
  const [profile, setProfile] = useState(null);
  const [citTor, setCitTor] = useState([]);
  const [applicantTor, setApplicantTor] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('compare');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // Modals
  const noteModal = useModal();
  const editModal = useModal();
  // const statusModal = useModal(); // Removed
  const finalizeModal = useModal();

  // Edit/Note state
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editData, setEditData] = useState({
    id: '',
    subject_code: '',
    units: '',
    description: '',
  });
  // const [selectedStatus, setSelectedStatus] = useState(null); // Removed

  const { showSuccess, showError } = useNotification();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, citTorData, applicantTorData] = await Promise.all([
        profileApi.getProfile(id),
        torApi.getCitTorContent(),
        torApi.getCompareResultTor(id),
      ]);

      // Extract data from API responses
      console.log('📦 Raw API responses:', { profileData, citTorData, applicantTorData });

      // Extract data from API responses
      console.log('📦 Raw API responses:', { profileData, citTorData, applicantTorData });

      let profileObj = null;
      if (Array.isArray(profileData)) {
        profileObj = profileData.length > 0 ? profileData[0] : null;
      } else if (profileData && typeof profileData === 'object') {
        if (Array.isArray(profileData.data)) {
          profileObj = profileData.data.length > 0 ? profileData.data[0] : null;
        } else if (profileData.user_id || profileData.name) {
          profileObj = profileData;
        }
      }

      const citTorList = Array.isArray(citTorData) ? citTorData : (citTorData?.data || []);
      const applicantTorList = Array.isArray(applicantTorData) ? applicantTorData : (applicantTorData?.data || []);

      console.log('✅ Extracted arrays:', { profileObj, citTorList, applicantTorList });

      setProfile(profileObj);
      setCitTor(citTorList);
      setApplicantTor(applicantTorList);
    } catch (error) {
      showError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshApplicantTor = async () => {
    try {
      const data = await torApi.getCompareResultTor(id);
      const applicantTorList = Array.isArray(data) ? data : (data?.data || []);
      setApplicantTor(applicantTorList);
    } catch (error) {
      showError('Failed to refresh data');
    }
  };

  // Update Credit Evaluation
  const updateEvaluation = async (entryId, status) => {
    try {
      await torApi.updateCreditEvaluation(entryId, status);
      await refreshApplicantTor();
      showSuccess(`Credit evaluation updated to ${status}`);
    } catch (error) {
      showError(error.message || 'Failed to update evaluation');
    }
  };

  // Save Note
  const handleSaveNote = async () => {
    if (!selectedEntry) return;

    try {
      await torApi.updateNote(selectedEntry.id, noteText);
      await refreshApplicantTor();
      showSuccess('Note saved successfully');
      noteModal.close();
      setSelectedEntry(null);
      setNoteText('');
    } catch (error) {
      showError(error.message || 'Failed to save note');
    }
  };

  // Edit School TOR Entry
  const handleEditClick = (entry) => {
    setEditData({
      id: entry.id,
      subject_code: entry.subject_code,
      units: entry.units,
      description: Array.isArray(entry.description)
        ? entry.description.join(', ')
        : entry.description,
    });
    editModal.open();
  };

  const handleEditSave = async () => {
    try {
      const updated = await torApi.updateCitTorEntry(editData);
      setCitTor((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      showSuccess('Entry updated successfully');
      editModal.close();
    } catch (error) {
      showError(error.message || 'Failed to update entry');
    }
  };

  // Save Status - Automatically sets to Pending
  const handleSaveStatus = async () => {
    setProcessing(true);
    try {
      // Default to 'Pending' automatically
      const status = 'Pending';
      await requestApi.updateRequestStatus(id, status);
      showSuccess(`Status updated to "${status}" successfully.`);
      setTimeout(() => navigate('/DepartmentHome'), 1000);
    } catch (error) {
      showError(error.message || 'Failed to update status');
    } finally {
      setProcessing(false);
    }
  };

  // Finalize
  const handleFinalize = async () => {
    setProcessing(true);
    try {
      await requestApi.finalizeRequest(id);
      showSuccess('Request finalized successfully.');
      setTimeout(() => navigate('/DepartmentHome'), 1000);
    } catch (error) {
      console.error('Finalize error:', error);

      // Check if it's the multiple submissions error
      if (error.message && error.message.includes('returned more than one')) {
        showError(
          `Cannot finalize: Student "${id}" has multiple pending requests. ` +
          `Please contact the system administrator to resolve this issue. ` +
          `(Backend needs to be updated to handle individual requests)`
        );
      } else {
        showError(error.message || 'Failed to finalize request');
      }
    } finally {
      setProcessing(false);
      finalizeModal.close();
    }
  };

  // Filter applicant TOR
  const filteredApplicantTor = applicantTor.filter((entry) => {
    if (filterStatus === 'All') return true;
    if (filterStatus === 'Void')
      return !entry.credit_evaluation || entry.credit_evaluation === 'Void';
    return entry.credit_evaluation === filterStatus;
  });

  const tabs = [
    { id: 'compare', label: 'Compare View' },
    { id: 'school', label: "School's TOR", count: citTor.length },
    { id: 'applicant', label: "Applicant's TOR", count: applicantTor.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader text="Loading document..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg">
          <GraduationCap className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Applicant Document</h1>
      </div>

      {/* Applicant Info */}
      {profile && (
        <div className="bg-white shadow border rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Applicant Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <p><strong>Name:</strong> {profile.name}</p>
            <p><strong>Email:</strong> {profile.email}</p>
            <p><strong>Phone:</strong> {profile.phone}</p>
            <p><strong>School:</strong> {profile.school_name}</p>
            <p><strong>User ID:</strong> {profile.user_id}</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6">
        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Compare View */}
      {activeTab === 'compare' && (
        <div className="grid grid-cols-2 gap-4">
          {/* School's TOR */}
          <div className="bg-white shadow border rounded-lg p-4">
            <h3 className="text-md font-semibold text-center bg-blue-50 py-2 rounded mb-3">
              School's TOR
            </h3>
            <div className="overflow-y-auto max-h-[600px] border-t">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-gray-100 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 font-medium">Subject Code</th>
                    <th className="px-3 py-2 font-medium">Units</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {citTor.map((subj, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{subj.subject_code}</td>
                      <td className="px-3 py-2">{subj.units}</td>
                      <td className="px-3 py-2">
                        {Array.isArray(subj.description)
                          ? subj.description.join(', ')
                          : subj.description}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleEditClick(subj)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Applicant's TOR */}
          <div className="bg-white shadow border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-semibold text-center bg-green-50 py-2 rounded flex-1">
                Applicant's TOR
              </h3>
            </div>

            {/* Filter Dropdown */}
            <div className="flex justify-between items-center mb-3">
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  Filter: {filterStatus}
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showFilterDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-20">
                    {['All', 'Void', 'Accepted', 'Denied'].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilterStatus(status);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === status
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700'
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[600px] border-t">
              <table className="w-full text-sm text-left table-auto">
                <thead className="bg-gray-100 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-medium">Subject Code</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Units</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Summary</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                    <th className="px-4 py-3 font-medium">Remarks</th>
                    <th className="px-4 py-3 font-medium">Evaluation</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplicantTor.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{entry.subject_code}</td>
                      <td className="px-4 py-3 break-words">{entry.subject_description}</td>
                      <td className="px-4 py-3 text-center">{entry.total_academic_units}</td>
                      <td className="px-4 py-3 text-center">{entry.final_grade}</td>
                      <td className="px-4 py-3 break-words">{entry.summary || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="break-words flex-1">{entry.notes || '—'}</span>
                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              setNoteText(entry.notes || '');
                              noteModal.open();
                            }}
                            className="text-blue-600 font-bold text-lg hover:text-blue-800"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">{entry.remarks || '—'}</td>
                      <td
                        className={`px-4 py-3 font-medium text-center ${entry.credit_evaluation === 'Accepted'
                          ? 'text-green-600'
                          : entry.credit_evaluation === 'Denied'
                            ? 'text-red-600'
                            : 'text-gray-500'
                          }`}
                      >
                        {entry.credit_evaluation || 'Void'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {entry.credit_evaluation !== 'Accepted' && (
                            <button
                              onClick={() => updateEvaluation(entry.id, 'Accepted')}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Accept
                            </button>
                          )}
                          {entry.credit_evaluation !== 'Denied' && (
                            <button
                              onClick={() => updateEvaluation(entry.id, 'Denied')}
                              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              Deny
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <Button onClick={handleSaveStatus}>Save</Button>
              <Button variant="success" onClick={finalizeModal.open}>
                Finalize
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* School's TOR Tab */}
      {activeTab === 'school' && (
        <div className="bg-white shadow border rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">School's TOR</h3>
          <div className="overflow-y-auto max-h-[600px] border-t">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 font-medium">Subject Code</th>
                  <th className="px-3 py-2 font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {citTor.map((subj, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">{subj.subject_code}</td>
                    <td className="px-3 py-2">{subj.units}</td>
                    <td className="px-3 py-2">
                      {Array.isArray(subj.description)
                        ? subj.description.join(', ')
                        : subj.description}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleEditClick(subj)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Applicant's TOR Tab */}
      {activeTab === 'applicant' && (
        <div className="bg-white shadow border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Applicant's TOR</h3>

            <div className="relative">
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                Filter: {filterStatus}
                <ChevronDown className="h-4 w-4" />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white border rounded-lg shadow-lg z-20">
                  {['All', 'Void', 'Accepted', 'Denied'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setFilterStatus(status);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${filterStatus === status
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto overflow-y-auto max-h-[600px] border-t">
            <table className="w-full text-sm text-left table-auto">
              <thead className="bg-gray-100 border-b sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium">Subject Code</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Units</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Summary</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Remarks</th>
                  <th className="px-4 py-3 font-medium">Evaluation</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplicantTor.map((entry, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{entry.subject_code}</td>
                    <td className="px-4 py-3 break-words">{entry.subject_description}</td>
                    <td className="px-4 py-3 text-center">{entry.total_academic_units}</td>
                    <td className="px-4 py-3 text-center">{entry.final_grade}</td>
                    <td className="px-4 py-3 break-words">{entry.summary || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-700 break-words flex-1">
                          {entry.notes || '—'}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedEntry(entry);
                            setNoteText(entry.notes || '');
                            noteModal.open();
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold text-lg"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{entry.remarks || '—'}</td>
                    <td
                      className={`px-4 py-3 font-medium text-center ${entry.credit_evaluation === 'Accepted'
                        ? 'text-green-600'
                        : entry.credit_evaluation === 'Denied'
                          ? 'text-red-600'
                          : 'text-gray-500'
                        }`}
                    >
                      {entry.credit_evaluation || 'Void'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {entry.credit_evaluation !== 'Accepted' && (
                          <button
                            onClick={() => updateEvaluation(entry.id, 'Accepted')}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Accept
                          </button>
                        )}
                        {entry.credit_evaluation !== 'Denied' && (
                          <button
                            onClick={() => updateEvaluation(entry.id, 'Denied')}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Deny
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button onClick={handleSaveStatus}>Save</Button>
            <Button variant="success" onClick={finalizeModal.open}>
              Finalize
            </Button>
          </div>
        </div>
      )}

      {/* Note Modal */}
      <Modal isOpen={noteModal.isOpen} onClose={noteModal.close} title="Add Note" size="sm">
        <ModalContent>
          <textarea
            className="w-full border rounded-md p-2 text-sm text-gray-700"
            rows="5"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Type your note here..."
          />
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={noteModal.close}>
            Cancel
          </Button>
          <Button onClick={handleSaveNote}>Save</Button>
        </ModalFooter>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModal.isOpen} onClose={editModal.close} title="Edit School TOR Entry" size="sm">
        <ModalContent>
          <div className="space-y-4">
            <Input
              label="Subject Code"
              value={editData.subject_code}
              onChange={(e) =>
                setEditData({ ...editData, subject_code: e.target.value })
              }
            />
            <Input
              label="Units"
              type="number"
              value={editData.units}
              onChange={(e) => setEditData({ ...editData, units: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={editData.description}
                onChange={(e) =>
                  setEditData({ ...editData, description: e.target.value })
                }
                className="w-full border rounded-lg px-4 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={editModal.close}>
            Cancel
          </Button>
          <Button onClick={handleEditSave}>Save</Button>
        </ModalFooter>
      </Modal>

      {/* Status Selection Modal - REMOVED */}

      {/* Finalize Confirmation */}
      <ConfirmDialog
        isOpen={finalizeModal.isOpen}
        onClose={finalizeModal.close}
        onConfirm={handleFinalize}
        title="Finalize Request"
        message="Are you sure you want to proceed with this decision? This will be a final action."
        confirmText="Yes, Finalize"
        type="primary"
        loading={processing}
      />
    </div>
  );
}