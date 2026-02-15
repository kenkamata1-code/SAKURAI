/**
 * 認証コンテキスト - WARDROBE モジュール
 * 
 * THE LONG GAMEへ統合時の接続ポイント:
 * - AuthProviderを親アプリケーションの認証システムに置き換えてください
 * - useAuth フックは同じインターフェースを維持してください
 * - 現在はモックユーザーを使用したデモ実装です
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, Profile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 管理者メールアドレスリスト（THE LONG GAME統合時に設定変更可能）
const ADMIN_EMAILS = [
  'stepnext.leathershoes@gmail.com',
  'ken.kamata1@gmail.com',
];

// モックユーザーデータ
const MOCK_USER: User = {
  id: 'demo-user',
  email: 'demo@wardrobe.app',
};

const MOCK_PROFILE: Profile = {
  id: 'demo-user',
  email: 'demo@wardrobe.app',
  is_admin: true, // デモ用に管理者として設定
  first_name: 'Demo',
  last_name: 'User',
  display_initial: 'D.U.',
  height_cm: 170,
  weight_kg: 65,
  gender: 'other',
  is_wardrobe_public: true,
  is_styling_public: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

interface AuthProviderProps {
  children: ReactNode;
  // 外部から認証情報を注入する場合に使用
  externalUser?: User | null;
  externalProfile?: Profile | null;
}

export function AuthProvider({ 
  children, 
  externalUser, 
  externalProfile 
}: AuthProviderProps) {
  // 外部から注入された場合はそれを使用、なければモックを使用
  const [user, setUser] = useState<User | null>(externalUser ?? MOCK_USER);
  const [profile, setProfile] = useState<Profile | null>(externalProfile ?? MOCK_PROFILE);
  const [loading, setLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      // モック実装 - 実際の認証は外部から注入
      console.log('Mock sign in:', email);
      setUser(MOCK_USER);
      setProfile(MOCK_PROFILE);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      // モック実装
      console.log('Mock sign out');
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile) return;
    
    const updatedProfile = {
      ...profile,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setProfile(updatedProfile);
  }, [profile]);

  const isAdmin = profile?.is_admin ?? false;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      isAdmin, 
      loading, 
      signIn, 
      signOut,
      updateProfile,
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

/**
 * 統合ガイド:
 * 
 * THE LONG GAMEへの統合時は、以下のようにAuthProviderを設定してください:
 * 
 * ```tsx
 * // THE LONG GAME側のコード
 * import { AuthProvider as WardrobeAuthProvider } from 'wardrobe-module';
 * import { useAuth as useLongGameAuth } from './your-auth';
 * 
 * function App() {
 *   const { user, profile } = useLongGameAuth();
 *   
 *   return (
 *     <WardrobeAuthProvider externalUser={user} externalProfile={profile}>
 *       <WardrobeModule />
 *     </WardrobeAuthProvider>
 *   );
 * }
 * ```
 */

