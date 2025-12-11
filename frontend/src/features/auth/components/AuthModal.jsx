import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../../context';
import { createPortal } from 'react-dom';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { LogIn, UserPlus } from 'lucide-react';

// Divider Component (Removed)
// Social Login Button Component (Removed)
// Github/Google Icons (Removed)

function AuthModalWrapper({ isOpen, onClose, children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation sequence
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Small delay then expand
      const timer = setTimeout(() => {
        setIsExpanded(true);
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setIsExpanded(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open - prevent layout shift
  useEffect(() => {
    if (isOpen) {
      // Get scrollbar width before hiding
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
      style={{ zIndex: 9999 }}
    >
      {/* Dark Backdrop */}
      <div
        className="absolute inset-0 bg-black"
        style={{
          opacity: isExpanded ? 0.5 : 0,
          transition: 'opacity 400ms ease',
        }}
        onClick={onClose}
      />

      {/* Card Container - iOS App Store style with responsive design */}
      <div
        className="bg-white overflow-hidden flex flex-col w-full"
        style={{
          position: 'relative',
          borderRadius: isExpanded ? (window.innerWidth < 640 ? '20px' : '32px') : '24px',
          maxWidth: isExpanded ? '460px' : '420px',
          maxHeight: isExpanded ? 'calc(100vh - 32px)' : '90vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transition: 'all 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Scrollable Content with responsive padding */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 sm:p-6 md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function LoginModal({ isOpen, onClose }) {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Redirect if logged in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
      if (user.role === 'Student') navigate('/HomePage');
      else if (user.role === 'Faculty') navigate('/DepartmentHome');
    }
  }, [user, isOpen, onClose, navigate]);

  return (
    <AuthModalWrapper isOpen={isOpen} onClose={onClose}>
      {/* Icon & Title - Responsive sizing */}
      <div className="text-center mb-4 sm:mb-6">
        <div className="inline-flex items-center justify-center bg-blue-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
          <LogIn className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Welcome Back</h2>
        <p className="text-sm sm:text-base text-gray-500">Sign in to your account</p>
      </div>

      <LoginForm onClose={onClose} />
    </AuthModalWrapper>
  );
}

export function RegisterModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuthContext();
  const navigate = useNavigate();

  // Redirect if logged in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
      if (user.role === 'Student') navigate('/HomePage');
      else if (user.role === 'Faculty') navigate('/DepartmentHome');
    }
  }, [user, isOpen, onClose, navigate]);

  return (
    <AuthModalWrapper isOpen={isOpen} onClose={onClose}>
      {/* Icon & Title - Responsive sizing */}
      <div className="text-center mb-4 sm:mb-6">
        <div className="inline-flex items-center justify-center bg-green-600 rounded-xl sm:rounded-2xl p-3 sm:p-4 mb-3 sm:mb-4">
          <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">Create Account</h2>
        <p className="text-sm sm:text-base text-gray-500">Join CRED-IT to get started</p>
      </div>

      <RegisterForm onClose={onClose} onSuccess={onSuccess} />
    </AuthModalWrapper>
  );
}