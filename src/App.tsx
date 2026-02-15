import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import WardrobePage from './pages/WardrobePage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<WardrobePage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

