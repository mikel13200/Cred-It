import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthContext } from '../../../context';
import { useNotification } from '../../../hooks';
// Basic spinner
const Spinner = () => (
    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
);

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { githubLogin } = useAuthContext();
    const { showSuccess, showError } = useNotification();
    const effectRun = useRef(false);

    useEffect(() => {
        const code = searchParams.get('code');

        if (effectRun.current) return; // Prevent double execution in Strict Mode
        effectRun.current = true;

        if (!code) {
            navigate('/');
            return;
        }

        const processLogin = async () => {
            try {
                const { success, error, user } = await githubLogin(code);

                if (success) {
                    showSuccess('Logged in via GitHub!');
                    if (user.role === 'Student') navigate('/HomePage');
                    else if (user.role === 'Faculty') navigate('/DepartmentHome');
                    else navigate('/');
                } else {
                    showError(error || 'GitHub Login Failed');
                    navigate('/');
                }
            } catch (err) {
                showError('Authentication Error');
                navigate('/');
            }
        };

        processLogin();
    }, [searchParams, githubLogin, navigate, showSuccess, showError]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Spinner />
            <p className="mt-4 text-gray-600 font-medium">Authenticating with GitHub...</p>
        </div>
    );
}
