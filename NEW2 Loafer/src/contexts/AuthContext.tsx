import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Amplify } from 'aws-amplify';
import { 
  signIn as amplifySignIn, 
  signUp as amplifySignUp, 
  signOut as amplifySignOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignUp,
  type SignUpOutput,
} from 'aws-amplify/auth';
import { awsConfig } from '../lib/aws-config';
import { api, type Profile } from '../lib/api-client';

// Amplify初期化
Amplify.configure(awsConfig);

export interface SignUpData {
  firstName: string;
  lastName: string;
  phone: string;
  postalCode: string;
  address: string;
  gender: string;
  birthDate: string;
}

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userInfo: SignUpData) => Promise<SignUpOutput>;
  confirmSignUpCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const profileData = await api.profile.get();
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  }, []);

  const updatePendingProfileCallback = useCallback(async () => {
    const pendingProfileStr = localStorage.getItem('pendingProfile');
    if (pendingProfileStr) {
      const pendingProfile = JSON.parse(pendingProfileStr);
      
      try {
        await api.profile.update({
          first_name: pendingProfile.firstName,
          last_name: pendingProfile.lastName,
          phone: pendingProfile.phone,
          postal_code: pendingProfile.postalCode,
          address: pendingProfile.address,
          gender: pendingProfile.gender,
          birth_date: pendingProfile.birthDate,
        });
        localStorage.removeItem('pendingProfile');
        return true;
      } catch (error) {
        console.error('Error updating profile after signup:', error);
        return false;
      }
    }
    return false;
  }, []);

  const checkAuthState = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      if (currentUser && session.tokens) {
        setUser({
          id: currentUser.userId,
          email: currentUser.signInDetails?.loginId || '',
        });
        // ペンディングプロフィールがあれば先に更新
        await updatePendingProfileCallback();
        await fetchProfile();
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, updatePendingProfileCallback]);

  useEffect(() => {
    checkAuthState();
  }, [checkAuthState]);

  const signIn = async (email: string, password: string) => {
    // 既存セッションが残っている場合は先にサインアウトする
    try {
      await amplifySignOut();
    } catch {
      // サインアウト失敗は無視（セッションなしの場合も含む）
    }
    const result = await amplifySignIn({ username: email, password });
    
    if (result.isSignedIn) {
      const currentUser = await getCurrentUser();
      setUser({
        id: currentUser.userId,
        email: email,
      });
      await fetchProfile();
      // ペンディングプロフィールがあれば更新
      await updatePendingProfileCallback();
      await fetchProfile();
    } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_UP') {
      throw new Error('CONFIRM_SIGN_UP_REQUIRED');
    }
  };

  const signUp = async (email: string, password: string, userInfo: SignUpData): Promise<SignUpOutput> => {
    const result = await amplifySignUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          name: `${userInfo.lastName} ${userInfo.firstName}`,
        },
        autoSignIn: true,
      },
    });

    // プロフィール情報は確認後に保存するため、ローカルストレージに一時保存
    localStorage.setItem('pendingProfile', JSON.stringify({
      email,
      ...userInfo,
    }));

    return result;
  };

  const confirmSignUpCode = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
    
    // 確認後、プロフィール情報をローカルに保持（サインイン後に更新）
    // autoSignInが動作するまで待つ
  };


  const signOut = async () => {
    await amplifySignOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const allowedAdminEmails = ['stepnext.leathershoes@gmail.com', 'ken.kamata1@gmail.com', 'test@example.com'];
  const isAdmin = profile?.is_admin === true && allowedAdminEmails.includes(profile?.email || '');

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin, 
      loading, 
      signIn, 
      signUp, 
      confirmSignUpCode,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
