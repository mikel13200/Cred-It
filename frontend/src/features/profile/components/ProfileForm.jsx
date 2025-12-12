import React from 'react';
import { User, School, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import { Input } from '../../../components/common';

export default function ProfileForm({ profile, onUpdate, showWarning }) {
  return (
    <div className="space-y-4">
      {showWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="p-1 bg-amber-100 rounded-full">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">Profile Required</h4>
            <p className="text-sm text-amber-700 mt-0.5">
              Please Create Profile First Before Proceeding
            </p>
          </div>
        </div>
      )}

      <Input
        type="text"
        label="Full Name"
        placeholder="Enter your full name"
        value={profile.name}
        onChange={(e) => onUpdate('name', e.target.value)}
        icon={User}
      />

      <Input
        type="text"
        label="School Name"
        placeholder="Enter your school name"
        value={profile.school_name}
        onChange={(e) => onUpdate('school_name', e.target.value)}
        icon={School}
      />

      <Input
        type="email"
        label="Email"
        placeholder="Enter your email"
        value={profile.email}
        onChange={(e) => onUpdate('email', e.target.value)}
        icon={Mail}
      />

      <Input
        type="tel"
        label="Phone Number"
        placeholder="Enter your phone number"
        value={profile.phone}
        onChange={(e) => onUpdate('phone', e.target.value)}
        icon={Phone}
      />

      <Input
        type="text"
        label="Address"
        placeholder="Enter your address"
        value={profile.address}
        onChange={(e) => onUpdate('address', e.target.value)}
        icon={MapPin}
      />

      <Input
        type="date"
        label="Date of Birth"
        placeholder="YYYY-MM-DD"
        value={profile.date_of_birth || ''}
        onChange={(e) => onUpdate('date_of_birth', e.target.value)}
        icon={Calendar}
      />
    </div>
  );
}