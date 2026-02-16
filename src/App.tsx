import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import WardrobePage from './pages/WardrobePage';

/**
 * WARDROBE Module App
 * 
 * 管理者制限を有効にするには、ProtectedRouteの adminOnly を true に設定してください
 */
function App() {
  // 管理者のみアクセス可能（本番環境設定）
  const ADMIN_ONLY = true;

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route 
            path="/*" 
            element={
              ADMIN_ONLY ? (
                <ProtectedRoute adminOnly>
                  <WardrobePage />
                </ProtectedRoute>
              ) : (
                <WardrobePage />
              )
            } 
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

