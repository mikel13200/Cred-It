import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { Button, Loader } from '../../components/common';
import { profileApi, torApi } from '../../api';
import { useNotification } from '../../hooks';

export default function FinalDocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [citTor, setCitTor] = useState([]);
  const [applicantTor, setApplicantTor] = useState([]);
  const [loading, setLoading] = useState(false);

  const { showError } = useNotification();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileData, citTorData, applicantTorData] = await Promise.all([
        profileApi.getProfile(id),
        torApi.getCitTorContent(),
        torApi.getCompareResultTor(id),
      ]);

      // Extract data from API responses (handle both array and {data: array} formats)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader text="Loading final document..." />
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
        <h1 className="text-2xl font-bold text-gray-800">
          Final Accepted Document
          {profile?.name ? ` — ${profile.name}` : ''}
        </h1>
      </div>

      {/* Applicant Info */}
      {profile ? (
        <div className="bg-white shadow border rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            Applicant Information
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <p>
              <strong>Name:</strong> {profile.name}
            </p>
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
            <p>
              <strong>Phone:</strong> {profile.phone}
            </p>
            <p>
              <strong>School:</strong> {profile.school_name}
            </p>
            <p>
              <strong>User ID:</strong> {profile.user_id}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 mb-6">Loading applicant info...</p>
      )}

      {/* Tables */}
      <div className="grid grid-cols-2 gap-6">
        {/* CIT TOR */}
        <div className="bg-white shadow border rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">
            School's TOR
          </h3>
          <div className="overflow-y-auto max-h-[400px] border-t">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Subject Code</th>
                  <th className="px-3 py-2 font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {citTor.length > 0 ? (
                  citTor.map((subj, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{subj.subject_code}</td>
                      <td className="px-3 py-2">{subj.units}</td>
                      <td className="px-3 py-2">
                        {Array.isArray(subj.description)
                          ? subj.description.join(', ')
                          : subj.description}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-3 py-3 text-center text-gray-500">
                      No school TOR found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Applicant TOR */}
        <div className="bg-white shadow border rounded-lg p-4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">
            Applicant's TOR
          </h3>
          <div className="overflow-y-auto max-h-[400px] border-t">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-3 py-2 font-medium">Subject Code</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Units</th>
                  <th className="px-3 py-2 font-medium">Final Grade</th>
                  <th className="px-3 py-2 font-medium">Remarks</th>
                  <th className="px-3 py-2 font-medium">Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {applicantTor.length > 0 ? (
                  applicantTor.map((entry, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2">{entry.subject_code}</td>
                      <td className="px-3 py-2">{entry.subject_description}</td>
                      <td className="px-3 py-2">{entry.total_academic_units}</td>
                      <td className="px-3 py-2">{entry.final_grade}</td>
                      <td className="px-3 py-2">{entry.remarks}</td>
                      <td className={`px-3 py-2 font-medium ${entry.credit_evaluation === 'Accepted'
                          ? 'text-green-600'
                          : entry.credit_evaluation === 'Denied'
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}>
                        {entry.credit_evaluation || 'Void'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-3 py-3 text-center text-gray-500">
                      No applicant TOR found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <div className="flex justify-end mt-8">
        <Button onClick={() => navigate('/DepartmentHome')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}