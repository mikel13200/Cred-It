import React from 'react';
import { Modal, ModalContent, ModalFooter, Button } from '../../../components/common';
import { useProfile } from '../hooks/useProfile';
import ProfileForm from './ProfileForm';

export default function ProfilePanel({ userId, isOpen, onClose, onSaveSuccess }) {
  const { profile, updateProfile, saveProfile, loading, profileExists } = useProfile(userId);

  const handleSave = async () => {
    const success = await saveProfile();
    if (success) {
      if (onSaveSuccess) onSaveSuccess();
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Profile"
      size="md"
    >
      <ModalContent>
        <ProfileForm
          profile={profile}
          onUpdate={updateProfile}
          showWarning={!loading && !profileExists}
        />
      </ModalContent>

      <ModalFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} loading={loading}>
          {profileExists ? 'Update Profile' : 'Save Profile'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}