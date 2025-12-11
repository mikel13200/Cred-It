import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuthContext } from '../../../context';
import { useNotification } from '../../../hooks';
import { createPortal } from 'react-dom';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { LogIn, UserPlus } from 'lucide-react';

// GitHub Icon Component
const GitHubIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

// Google Icon Component
const GoogleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// Social Login Button Component
const SocialButton = ({ icon: Icon, provider, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 sm:gap-3 w-full py-2.5 sm:py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group ${className}`}
  >
    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
    <span className="text-sm sm:text-base text-gray-700 font-medium group-hover:text-gray-900">
      Continue with {provider}
    </span>
  </button>
);

// Divider Component
const OrDivider = () => (
  <div className="flex items-center gap-3 sm:gap-4 my-4 sm:my-6">
    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-gray-300"></div>
    <span className="text-xs sm:text-sm text-gray-400 font-medium uppercase tracking-wider">or</span>
    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-gray-300 to-gray-300"></div>
  </div>
);

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
  const { googleLogin, user } = useAuthContext();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  // Redirect if logged in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
      if (user.role === 'Student') navigate('/HomePage');
      else if (user.role === 'Faculty') navigate('/DepartmentHome');
    }
  }, [user, isOpen, onClose, navigate]);

  const handleGitHubLogin = () => {
    const CLIENT_ID = "Ov23liODb2T8BFwNHulw"; // Replace this
    const REDIRECT_URI = window.location.origin + "/auth/callback";
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user:email`;
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const { success, error } = await googleLogin(tokenResponse.access_token);
      if (success) {
        showSuccess('Logged in via Google!');
      } else {
        showError(error);
      }
    },
    onError: () => showError('Google Login Failed'),
  });

  const handleGoogleLogin = () => loginWithGoogle();

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

      {/* Social Login Buttons */}
      <div className="space-y-2 sm:space-y-3">
        <SocialButton
          icon={GoogleIcon}
          provider="Google"
          onClick={handleGoogleLogin}
        />
        <SocialButton
          icon={GitHubIcon}
          provider="GitHub"
          onClick={handleGitHubLogin}
        />
      </div>

      <OrDivider />

      <LoginForm onClose={onClose} />
    </AuthModalWrapper>
  );
}

export function RegisterModal({ isOpen, onClose, onSuccess }) {
  const { googleLogin, user } = useAuthContext();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();

  // Redirect if logged in
  useEffect(() => {
    if (user && isOpen) {
      onClose();
      if (user.role === 'Student') navigate('/HomePage');
      else if (user.role === 'Faculty') navigate('/DepartmentHome');
    }
  }, [user, isOpen, onClose, navigate]);

  const handleGitHubSignup = () => {
    const CLIENT_ID = "Ov23liODb2T8BFwNHulw"; // Replace this
    const REDIRECT_URI = window.location.origin + "/auth/callback";
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=user:email`;
  };

  const signupWithGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const { success, error } = await googleLogin(tokenResponse.access_token);
      if (success) {
        showSuccess('Account created via Google!');
        onSuccess && onSuccess();
      } else {
        showError(error);
      }
    },
    onError: () => showError('Google Signup Failed'),
  });

  const handleGoogleSignup = () => signupWithGoogle();

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

      {/* Social Login Buttons */}
      <div className="space-y-2 sm:space-y-3">
        <SocialButton
          icon={GoogleIcon}
          provider="Google"
          onClick={handleGoogleSignup}
        />
        <SocialButton
          icon={GitHubIcon}
          provider="GitHub"
          onClick={handleGitHubSignup}
        />
      </div>

      <OrDivider />

      <RegisterForm onClose={onClose} onSuccess={onSuccess} />
    </AuthModalWrapper>
  );
}