import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-800">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl tracking-wider mb-4 text-gray-800">アクセス権限がありません</h1>
          <p className="text-gray-600 mb-8">このページは管理者のみアクセスできます。</p>
          <a href="/" className="text-sm tracking-wider border-b border-gray-800 text-gray-800 hover:text-gray-600 transition">
            ホームに戻る
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
