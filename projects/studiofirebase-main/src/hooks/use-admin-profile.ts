import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

export interface AdminProfile {
  username: string | null;
  profilePictureUrl: string | null;
  name: string | null;
}

/**
 * Hook to fetch current admin's profile data (username and profile picture)
 * from Firestore
 */
export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminProfile>({
    username: null,
    profilePictureUrl: null,
    name: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchAdminProfile = async (uid: string) => {
      try {
        setLoading(true);
        setError(null);

        // Fetch both documents in parallel for better performance
        const [adminDoc, profileSettingsDoc] = await Promise.all([
          getDoc(doc(db, 'admins', uid)),
          getDoc(doc(db, 'admins', uid, 'profile', 'settings'))
        ]);

        if (!isMounted) return;

        if (!adminDoc.exists()) {
          setProfile({
            username: null,
            profilePictureUrl: null,
            name: null,
          });
          setLoading(false);
          return;
        }

        const adminData = adminDoc.data();
        const username = adminData?.username || null;
        const name = adminData?.name || null;

        let profilePictureUrl = null;
        if (profileSettingsDoc.exists()) {
          const settings = profileSettingsDoc.data();
          profilePictureUrl = settings?.profilePictureUrl || null;
        }

        setProfile({
          username,
          profilePictureUrl,
          name,
        });
        setLoading(false);
      } catch (err) {
        console.error('[useAdminProfile] Failed to load admin profile. Please check your Firestore permissions and network connection.', err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch admin profile');
          setLoading(false);
        }
      }
    };

    // Listen to auth state changes to react to login/logout
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.uid) {
        void fetchAdminProfile(user.uid);
      } else {
        if (isMounted) {
          setProfile({
            username: null,
            profilePictureUrl: null,
            name: null,
          });
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []); // Empty dependency array - auth state changes handled by onAuthStateChanged

  return { profile, loading, error };
}
