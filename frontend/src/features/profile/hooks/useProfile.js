// frontend/src/features/profile/hooks/useProfile.js
import { useState, useEffect } from 'react';
import { profileApi } from '../../../api';
import { useNotification } from '../../../hooks';

/**
 * Profile hook - Updated for new backend
 * Backend now uses snake_case and standardized APIResponse format
 * All data is pre-extracted via extractData() helper in API layer
 */
export function useProfile(userId) {
  const [profile, setProfile] = useState({
    user_id: userId || '',
    name: '',
    school_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
  });
  const [loading, setLoading] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [checkComplete, setCheckComplete] = useState(false);
  const { showSuccess, showError } = useNotification();

  /**
   * Fetch profile on mount or when userId changes
   */
  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        // API returns unwrapped data: { user_id, name, school_name, ... }
        const data = await profileApi.getProfile(userId);

        if (data) {
          // Map backend response to state
          setProfile({
            user_id: data.user_id || userId,
            name: data.name || '',
            school_name: data.school_name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            date_of_birth: data.date_of_birth || '',
          });
          setProfileExists(true);
        }
      } catch (error) {
        // Profile doesn't exist yet (404 error)
        setProfileExists(false);
        setProfile({
          user_id: userId,
          name: '',
          school_name: '',
          email: '',
          phone: '',
          address: '',
          date_of_birth: '',
        });
      } finally {
        setLoading(false);
        setCheckComplete(true);
      }
    };

    fetchProfile();
  }, [userId]);

  /**
   * Update a single profile field
   */
  const updateProfile = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  /**
   * Save profile to backend
   * Backend auto-creates if doesn't exist, updates if exists
   */
  const saveProfile = async () => {
    // Validate required fields
    if (!profile.name || !profile.school_name) {
      showError('Name and School Name are required');
      return false;
    }

    setLoading(true);
    try {
      // Backend returns saved profile data
      const data = await profileApi.saveProfile(profile);

      // Update local state with saved data (in case backend modified anything)
      if (data) {
        setProfile({
          user_id: data.user_id || profile.user_id,
          name: data.name || profile.name,
          school_name: data.school_name || profile.school_name,
          email: data.email || profile.email,
          phone: data.phone || profile.phone,
          address: data.address || profile.address,
          date_of_birth: data.date_of_birth || profile.date_of_birth,
        });
      }

      showSuccess('Profile saved successfully!');
      setProfileExists(true);
      return true;
    } catch (error) {
      showError(error.message || 'Failed to save profile');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if profile exists for user
   * Uses try-catch on getProfile (404 = doesn't exist)
   */
  const checkExists = async () => {
    try {
      await profileApi.getProfile(userId);
      setProfileExists(true);
      return true;
    } catch (error) {
      // 404 means profile doesn't exist
      if (error.message?.includes('404')) {
        setProfileExists(false);
        return false;
      }
      // Other errors should be logged
      console.error('Error checking profile existence:', error);
      return false;
    }
  };

  return {
    // State
    profile,
    loading,
    profileExists,
    checkComplete,

    // Methods
    updateProfile,
    saveProfile,
    checkExists,
  };
}