import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  /** 管理者のみアクセス可能にする場合は true */
  adminOnly?: boolean;
  /** アクセス拒否時に表示するカスタムコンポーネント */
  fallback?: ReactNode;
  /** 未ログイン時のリダイレクト先（指定しない場合はメッセージ表示） */
  redirectTo?: string;
}

/**
 * 認証・認可を制御するラッパーコンポーネント
 * 
 * 使用例:
 * ```tsx
 * // 管理者のみアクセス可能
 * <ProtectedRoute adminOnly>
 *   <WardrobePage />
 * </ProtectedRoute>
 * 
 * // ログインユーザーのみ
 * <ProtectedRoute>
 *   <WardrobePage />
 * </ProtectedRoute>
 * ```
 */
export default function ProtectedRoute({ 
  children, 
  adminOnly = false,
  fallback,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();

  // 読み込み中
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未ログイン
  if (!user) {
    if (redirectTo && typeof window !== 'undefined') {
      window.location.href = redirectTo;
      return null;
    }
    
    return fallback || (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-light tracking-wider mb-4">ログインが必要です</h2>
          <p className="text-gray-600 mb-6">
            このページにアクセスするにはログインしてください。
          </p>
          <p className="text-sm text-gray-400">
            Login required to access this page.
          </p>
        </div>
      </div>
    );
  }

  // 管理者権限が必要だが、管理者ではない
  if (adminOnly && !isAdmin) {
    return fallback || (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">⛔</div>
          <h2 className="text-2xl font-light tracking-wider mb-4">アクセス権限がありません</h2>
          <p className="text-gray-600 mb-6">
            このページは管理者のみアクセス可能です。
          </p>
          <p className="text-sm text-gray-400">
            This page is restricted to administrators only.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

