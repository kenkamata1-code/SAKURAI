# WARDROBE Module

独立したワードローブ管理モジュール。THE LONG GAMEへの統合を前提に設計されています。

## 機能

- 👕 **アイテム管理**: ワードローブアイテムの登録・編集・削除
- 📸 **スタイリング写真**: コーディネート写真の管理
- 📊 **ダッシュボード**: 出費分析・カテゴリー/ブランド別統計
- 🤖 **AI Assistant**: 自然言語でのアイテム登録（Gemini API使用時）
- 👟 **サイズ推奨**: 足の測定データを基にしたAIサイズ推奨
- 🖼️ **背景削除**: 商品画像の背景自動削除
- 📱 **顔ぼかし**: スタイリング写真の自動顔隠し

## 起動手順

### 1. 依存関係のインストール

```bash
cd wardrobe-module
npm install
```

### 2. 環境変数の設定（オプション）

```bash
cp env.sample .env
```

必要に応じて `.env` ファイルを編集してください。
ローカル開発時は空の状態でも動作します（モックデータ使用）。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3001 を開いてください。

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `VITE_GEMINI_API_KEY` | Gemini APIキー。スクレイピング・サイズ推奨機能に使用 | いいえ |
| `VITE_API_BASE_URL` | APIのベースURL（統合時に設定） | いいえ |
| `VITE_STORAGE_URL` | ストレージURL（統合時に設定） | いいえ |

## プロジェクト構造

```
wardrobe-module/
├── src/
│   ├── components/        # UIコンポーネント
│   │   ├── dashboard/     # ダッシュボードコンポーネント
│   │   ├── AddItemModal.tsx
│   │   ├── ImageUpload.tsx
│   │   └── ItemCard.tsx
│   ├── contexts/          # React Context
│   │   └── AuthContext.tsx
│   ├── lib/               # ライブラリ・ユーティリティ
│   │   ├── api-client.ts  # APIクライアント（統合ポイント）
│   │   └── store.ts       # Zustand状態管理
│   ├── pages/             # ページコンポーネント
│   │   └── WardrobePage.tsx
│   ├── types/             # TypeScript型定義
│   │   └── index.ts
│   ├── utils/             # ユーティリティ関数
│   │   ├── backgroundRemoval.ts
│   │   ├── excel.ts
│   │   ├── faceBlur.ts
│   │   └── gemini.ts      # Gemini API（拡張ポイント）
│   ├── App.tsx
│   ├── index.ts           # パブリックAPI
│   └── main.tsx
├── package.json
└── README.md
```

## THE LONG GAMEへの統合方針

### 1. 認証の統合

```tsx
import { WardrobePage, AuthProvider } from 'wardrobe-module';
import { useAuth as useLongGameAuth } from './your-auth';

function App() {
  const { user, profile } = useLongGameAuth();
  
  return (
    <AuthProvider externalUser={user} externalProfile={profile}>
      <WardrobePage />
    </AuthProvider>
  );
}
```

### 2. APIクライアントの差し替え

`src/lib/api-client.ts` の `IWardrobeApiClient` インターフェースを実装することで、
Supabase等の実際のバックエンドに接続できます。

```tsx
import { IWardrobeApiClient } from 'wardrobe-module';

class SupabaseApiClient implements IWardrobeApiClient {
  // Supabaseを使用した実装
}
```

### 3. ルーティングの統合

```tsx
import { Routes, Route } from 'react-router-dom';
import { WardrobePage } from 'wardrobe-module';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/wardrobe/*" element={<WardrobePage />} />
      {/* 他のルート */}
    </Routes>
  );
}
```

### 4. 状態管理の統合

Zustandを使用しているため、親アプリの状態管理と独立して動作します。
必要に応じてストアを親アプリから参照できます：

```tsx
import { useWardrobeStore } from 'wardrobe-module';

function SomeComponent() {
  const { items } = useWardrobeStore();
  // ...
}
```

## Gemini API の設定

スクレイピングとAIサイズ推奨機能を有効にするには：

1. [Google AI Studio](https://aistudio.google.com/) でAPIキーを取得
2. `.env` ファイルに設定：
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

### 拡張ポイント

`src/utils/gemini.ts` に以下の関数が用意されています：

- `scrapeProductWithGemini()`: URLから商品情報をスクレイピング
- `extractTagInfoWithGemini()`: タグ画像から情報を抽出
- `getSizeRecommendationWithGemini()`: AIによるサイズ推奨

## ビルド

```bash
npm run build
```

ビルド成果物は `dist/` ディレクトリに出力されます。

## ライセンス

Private - THE LONG GAME プロジェクト用

