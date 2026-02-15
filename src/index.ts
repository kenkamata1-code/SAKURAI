/**
 * WARDROBE Module - Public API
 * 
 * THE LONG GAMEへの統合時はこのファイルからエクスポートされるものを使用してください
 */

// Components
export { default as WardrobePage } from './pages/WardrobePage';
export { default as ItemCard } from './components/ItemCard';
export { default as ImageUpload } from './components/ImageUpload';
export { default as AddItemModal } from './components/AddItemModal';
export { default as ProtectedRoute } from './components/ProtectedRoute';

// Dashboard Components
export { KPICard, BarChart, PieChart, TimeRangeSelector, AIInsightCard } from './components/dashboard';

// Contexts
export { AuthProvider, useAuth } from './contexts/AuthContext';

// Stores
export { 
  useWardrobeStore, 
  useStylingStore, 
  useMeasurementStore, 
  useUIStore 
} from './lib/store';

// API Client
export { apiClient, MockApiClient } from './lib/api-client';
export type { IWardrobeApiClient } from './lib/api-client';

// Types
export * from './types';

// Utils
export { exportToExcel } from './utils/excel';
export { removeBgFromImage, blobToFile } from './utils/backgroundRemoval';
export { addLogoToFace, previewImageWithLogo } from './utils/faceBlur';
export { 
  isGeminiConfigured, 
  scrapeProductWithGemini, 
  extractTagInfoWithGemini, 
  getSizeRecommendationWithGemini 
} from './utils/gemini';

/**
 * 統合ガイド
 * 
 * THE LONG GAMEへの統合手順:
 * 
 * 1. パッケージのインストール
 *    npm install wardrobe-module
 * 
 * 2. WardrobePageコンポーネントを使用
 *    ```tsx
 *    import { WardrobePage, AuthProvider } from 'wardrobe-module';
 *    
 *    function App() {
 *      const { user, profile } = useYourAuth(); // 親アプリの認証
 *      
 *      return (
 *        <AuthProvider externalUser={user} externalProfile={profile}>
 *          <WardrobePage />
 *        </AuthProvider>
 *      );
 *    }
 *    ```
 * 
 * 3. APIクライアントのカスタマイズ（オプション）
 *    ```tsx
 *    import { IWardrobeApiClient } from 'wardrobe-module';
 *    
 *    class CustomApiClient implements IWardrobeApiClient {
 *      // 実装...
 *    }
 *    ```
 * 
 * 4. 環境変数の設定
 *    VITE_GEMINI_API_KEY=your_key  # Gemini API用（オプション）
 */

