import { useState, useEffect } from 'react';
import { trackingApi } from '../../../api';

export function useAllSubmissions(userName) {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userName) return;

        const fetchAllSubmissions = async () => {
            setLoading(true);
            try {
                // Helper function to safely fetch and handle 404s
                const safeFetch = async (fetchFn) => {
                    try {
                        const result = await fetchFn();
                        return result;
                    } catch (error) {
                        // 404 means no submission exists - return null
                        if (error.message?.includes('404')) {
                            return { exists: false };
                        }
                        // Other errors should be logged but not break the flow
                        console.warn('Error checking submission:', error);
                        return { exists: false };
                    }
                };

                // Helper function to extract array of submissions
                // Returns an array, empty if not found
                const extractSubmissions = (res) => {
                    if (!res) return [];
                    if (Array.isArray(res)) return res;
                    if (res.data && Array.isArray(res.data)) return res.data;
                    if (res.exists && res.data && Array.isArray(res.data)) return res.data;
                    // If old format { exists: true }, we don't have details, ignore or handle differently
                    return [];
                };

                const [requestRes, pendingRes, finalRes] = await Promise.all([
                    safeFetch(() => trackingApi.getUserProgress(userName)),
                    safeFetch(() => trackingApi.getPendingProgress(userName)),
                    safeFetch(() => trackingApi.getFinalProgress(userName)),
                ]);

                const allSubmissions = [];

                // Process RequestTOR
                const requests = extractSubmissions(requestRes);
                requests.forEach(req => {
                    allSubmissions.push({
                        id: req.id || `request-${req.account_id}`,
                        accountId: req.account_id,
                        status: 'Request',
                        progress: 1,
                        createdAt: req.created_at || new Date().toISOString(),
                        updatedAt: req.updated_at || new Date().toISOString(),
                        torUrl: req.tor_url,
                    });
                });

                // Process PendingRequest
                const pending = extractSubmissions(pendingRes);
                pending.forEach(req => {
                    allSubmissions.push({
                        id: req.id || `pending-${req.account_id}`,
                        accountId: req.account_id,
                        status: 'Pending',
                        progress: 2,
                        createdAt: req.created_at || new Date().toISOString(),
                        updatedAt: req.updated_at || new Date().toISOString(),
                    });
                });

                // Process FinalDocuments
                const finalDocs = extractSubmissions(finalRes);
                finalDocs.forEach(doc => {
                    allSubmissions.push({
                        id: doc.id || `final-${doc.account_id}`,
                        accountId: doc.account_id,
                        status: 'Finalized',
                        progress: 3,
                        createdAt: doc.created_at || new Date().toISOString(),
                        updatedAt: doc.updated_at || new Date().toISOString(),
                    });
                });

                // Sort by date (newest first) and limit to 3
                // Prioritize progress, then date?
                // Actually, typically we want to see the most recent activity.
                // If a user has a finalized one and a new request, show both?
                // Let's sort by createdAt descending.
                const sortedSubmissions = allSubmissions
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                    .slice(0, 3); // Limit to 3

                setSubmissions(sortedSubmissions);
            } catch (err) {
                console.error('Error fetching submissions:', err);
                setSubmissions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchAllSubmissions();
    }, [userName]);

    return { submissions, loading };
}
