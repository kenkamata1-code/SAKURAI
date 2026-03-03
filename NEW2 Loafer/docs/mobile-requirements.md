# モバイルアプリ（iOS）要件定義書
## プロジェクト名：HIRONORI - 足計測ライダー機能
### バージョン：v1.0 ドラフト
### 作成日：2026年3月3日

---

## 1. プロジェクト概要

### 1.1 目的
iOSネイティブアプリとして、スマートフォンカメラを使って**足の実寸計測**を行い、最適な靴のサイズを推奨するシステムを構築する。
Web/AdminのTHE LONG GAMEシステムと連携し、測定結果をAdminが確認・活用できるエコシステムを実現する。

### 1.2 対象プラットフォーム
- **iOS 16.0以上**（主要ターゲット）
- iPhone 12以降（LiDARセンサー搭載機種でオプション機能追加）
- Android対応は **Phase 2以降**で検討

### 1.3 技術スタック推奨構成

| レイヤー | 採用技術 | 理由 |
|---|---|---|
| UI | **SwiftUI** | iOS 16+ではSwiftUIが成熟、宣言的UIで開発効率が高い |
| 言語 | **Swift 5.9+** | 型安全性、async/await対応 |
| カメラ処理 | **AVFoundation + Vision.framework** | Appleネイティブ。リアルタイム計測に最適 |
| 3D計測（オプション） | **ARKit + RealityKit** | LiDAR搭載機種で精度向上 |
| AI解析（ローカル） | **Core ML** | オフライン対応、プライバシー保護 |
| AI解析（クラウド） | **Gemini API（google-generativeai-swift）** | サーバー側と統一 |
| ネットワーク | **URLSession + async/await** | 標準ライブラリ、依存最小化 |
| 状態管理 | **@Observable（SwiftUI）/ Combine** | Swift標準 |
| ローカルDB | **SwiftData（iOS 17+）/ CoreData** | 計測履歴のオフライン保存 |
| 認証 | **AWS Cognito（AmplifyiOS SDK）** | Web/Adminと統一 |
| API連携 | **REST API via API Gateway** | Web/Adminと統一バックエンド |

---

## 2. 機能要件

### 2.1 認証・ユーザー管理

#### FR-AUTH-01: ログイン
- メールアドレス＋パスワード認証（AWS Cognito）
- 生体認証（Face ID / Touch ID）サポート
- セッション自動更新（トークンリフレッシュ）

#### FR-AUTH-02: 初回プロファイル設定
Web版の `ProfileSetup` と同等の情報をネイティブUIで入力：
- 通常サイズ（必須）
- 身長・体重・年齢・性別（任意）

---

### 2.2 足の計測フロー（コア機能）

#### FR-MEASURE-01: 測定前ガイダンス
- 測定方法の説明画面（アニメーション付き）
- 必要なもの：A4用紙（基準スケール用）
- 床への用紙配置ガイド
- 良い光の状態の確認チェックリスト

#### FR-MEASURE-02: カメラキャプチャ（上面撮影）
- **リアルタイムプレビュー**（`AVCaptureSession`）
- 撮影ガイドオーバーレイ（足の輪郭枠）
- 自動シャッター：足が枠内に収まったら自動撮影
- A4用紙の4隅を自動検出してスケール計算

#### FR-MEASURE-03: カメラキャプチャ（側面撮影）
- 横向き撮影ガイド
- 甲の高さ計測のためのサイドビュー

#### FR-MEASURE-04: 実寸計測ロジック
以下のアルゴリズムで実寸を算出：

```
1. A4用紙検出（コーナー検出 → ホモグラフィー変換）
   A4サイズ = 210mm × 297mm（既知スケール）

2. 足輪郭検出
   - Vision.framework の VNDetectContoursRequest を使用
   - または Core ML カスタムモデル（足専用セグメンテーション）

3. ピクセル→実寸変換
   mm_per_pixel = 297mm / A4の長辺ピクセル数
   足長(mm) = 足の最長ピクセル × mm_per_pixel
   足幅(mm) = 足の最広ピクセル × mm_per_pixel

4. cm変換・JIS規格への丸め
   足長(cm) = 足長(mm) / 10
   JISサイズ = ceil(足長(cm) × 2) / 2  ← 0.5cm刻みで切り上げ
```

#### FR-MEASURE-05: 計測精度表示
- 計測信頼度スコア（0〜100%）を表示
- 「再撮影を推奨」のフィードバック条件定義
  - A4用紙が検出できない場合
  - 足の輪郭が不完全な場合
  - 照明が不十分な場合

#### FR-MEASURE-06: LiDAR対応（iPhone 12 Pro以降）オプション
- ARKitを使った3D点群計測
- 足の体積・甲の高さをより正確に計測
- フォールバック：LiDAR非搭載機種ではカメラのみ計測

---

### 2.3 AI解析・サイズ推奨

#### FR-AI-01: ローカル推論（オフライン対応）
- Core MLモデルで足タイプ分類（narrow/standard/wide）
- モデルサイズ：5MB以内（ダウンロード時間考慮）

#### FR-AI-02: Gemini API連携（オンライン時）
`POST /measurement/gemini-analyze` を呼び出し：
- 入力：足写真（Base64）+ 計測値
- 出力：
  - 足タイプ詳細説明（日本語）
  - おすすめブランド・サイズ
  - 注意点・購入アドバイス

#### FR-AI-03: サイズ推奨表示
`sizeRecommendation.ts` のロジックをSwiftで再実装：
- ベースサイズ（実測値 or 自己申告値）
- ブランドバイアス補正
- カテゴリー補正
- 過去フィードバック学習補正
- Geminiコメント付きで最終推奨を表示

---

### 2.4 計測履歴

#### FR-HISTORY-01: ローカル保存
- SwiftDataで端末に計測セッションを保存
- オフライン時でも過去の結果を参照可能

#### FR-HISTORY-02: サーバー同期
- オンライン復帰時にAPI経由でRDSへ自動同期
- 重複防止のためUUID管理

#### FR-HISTORY-03: 履歴一覧・詳細
- 過去の計測一覧（日付順）
- タップで詳細：写真・計測値・Geminiコメント

---

### 2.5 Admin連携

#### FR-ADMIN-01: 測定セッション受信
- Adminが発行した「測定セッションID」をQRコードでスキャン
- またはディープリンク（`hironori://session/{session_id}`）で起動
- セッションとユーザーが自動紐付けされる

#### FR-ADMIN-02: 結果送信
- 測定完了後、自動的に `measurement_sessions` テーブルを更新
- Admin画面でリアルタイムに結果を確認可能

---

### 2.6 設定・プロファイル

#### FR-PROFILE-01: プロファイル編集
- 通常サイズ、身長・体重等の更新

#### FR-PROFILE-02: 通知設定
- 測定リマインダー（任意）
- Adminからのセッション招待通知

---

## 3. 非機能要件

### 3.1 パフォーマンス
| 指標 | 目標値 |
|---|---|
| アプリ起動時間 | 2秒以内 |
| カメラ起動 | 1秒以内 |
| 計測処理時間 | 3秒以内（ローカル処理） |
| Gemini API応答待ち | 5秒以内 |
| 最大メモリ使用量 | 200MB以内 |

### 3.2 精度
| 指標 | 目標値 |
|---|---|
| 足長計測誤差 | ±3mm以内（A4基準スケール使用時） |
| 足タイプ分類精度 | 85%以上 |
| サイズ推奨適合率 | ユーザーフィードバックで80%以上の「ちょうど良い」 |

### 3.3 セキュリティ
- 足写真はS3に暗号化保存（AES-256）
- API通信はHTTPS必須
- 写真はユーザー本人のみアクセス可能（IAMポリシー制御）
- ローカル保存データはiOSキーチェーン/データ保護クラスを使用
- 個人情報の取り扱いはAppleガイドライン準拠

### 3.4 プライバシー
- `NSCameraUsageDescription`：「足のサイズを計測するためにカメラを使用します」
- 写真はサーバー送信前にユーザー確認を取る
- プライバシーポリシーのインアプリ表示

### 3.5 アクセシビリティ
- Dynamic Type対応
- VoiceOver対応（計測ガイダンス）
- ハイコントラストモード対応

---

## 4. 画面設計（ワイヤーフレームレベル）

### 4.1 画面一覧

```
起動
├── スプラッシュ画面
├── オンボーディング（初回のみ）3画面
│   ├── 機能説明1：カメラで足を計測
│   ├── 機能説明2：AIがサイズを推奨
│   └── 機能説明3：Adminと連携
├── 認証
│   ├── ログイン画面
│   └── 初回プロファイル設定
└── メインタブ
    ├── タブ1: ホーム（直近の計測・推奨）
    ├── タブ2: 計測
    │   ├── 測定前ガイダンス
    │   ├── 上面撮影画面（カメラ + ガイドオーバーレイ）
    │   ├── 側面撮影画面
    │   ├── 処理中画面（ローカル計測 + Gemini API）
    │   └── 結果画面
    │       ├── 計測値サマリー
    │       ├── Geminiコメント
    │       └── ブランド別推奨サイズ
    ├── タブ3: 履歴
    │   ├── 計測履歴一覧
    │   └── 計測詳細
    └── タブ4: 設定
        ├── プロファイル編集
        ├── 通知設定
        └── プライバシー・利用規約
```

---

## 5. API設計（モバイル↔バックエンド）

### 5.1 エンドポイント一覧

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/auth/login` | Cognitoログイン |
| GET | `/user/profile` | プロファイル取得 |
| PUT | `/user/profile` | プロファイル更新 |
| POST | `/measurement/upload-photos` | 足写真をS3にアップロード |
| POST | `/measurement/analyze` | 計測処理起動（Lambda） |
| POST | `/measurement/gemini-analyze` | Gemini AI解析 |
| GET | `/measurement/history` | 計測履歴取得 |
| GET | `/measurement/history/{id}` | 計測詳細取得 |
| GET | `/session/{session_id}` | Adminセッション情報取得 |
| PUT | `/session/{session_id}/complete` | セッション完了通知 |
| GET | `/brands` | ブランド一覧取得 |
| GET | `/size-recommendation` | サイズ推奨取得 |

### 5.2 計測データモデル

```swift
// Swift側のデータモデル
struct MeasurementResult: Codable {
    let id: UUID
    let userId: String
    let sessionId: String?       // Admin連携時
    let footLength: Double       // cm
    let footWidth: Double        // cm
    let instepHeight: Double?    // cm（LiDAR搭載時）
    let footType: FootType       // narrow/standard/wide
    let confidence: Double       // 0.0〜1.0
    let photoTopUrl: String?
    let photoSideUrl: String?
    let geminiAnalysis: GeminiAnalysis?
    let createdAt: Date

    struct GeminiAnalysis: Codable {
        let footTypeDescription: String
        let recommendedBrands: [BrandRecommendation]
        let cautionPoints: [String]
        let adviceComment: String
        let modelVersion: String
    }

    struct BrandRecommendation: Codable {
        let brandName: String
        let recommendedSize: Double
        let sizeNote: String
    }
}
```

---

## 6. 開発フェーズ計画

### Phase 1（MVP）- 目標：4〜6週間
- [ ] プロジェクトセットアップ（Xcode, Swift Package Manager）
- [ ] 認証フロー（Cognito連携）
- [ ] プロファイル設定画面
- [ ] カメラキャプチャ基盤（AVFoundation）
- [ ] 基本的な計測ロジック（A4基準スケール）
- [ ] ルールベースのサイズ推奨（Web版ロジックの移植）
- [ ] 計測履歴（ローカルのみ）
- [ ] API基盤（URLSession）

### Phase 2 - 目標：+4週間
- [ ] Gemini API連携
- [ ] Core MLモデル統合（足タイプ分類）
- [ ] Admin連携（QRコード / ディープリンク）
- [ ] サーバー同期
- [ ] 計測精度の改善

### Phase 3（高精度化）- 目標：+4週間
- [ ] LiDAR対応（ARKit）
- [ ] カスタムCore MLモデル訓練
- [ ] リアルタイムフィードバック最適化
- [ ] App Store申請準備

---

## 7. 技術的リスクと対策

| リスク | 影響度 | 対策 |
|---|---|---|
| A4用紙なし環境での精度低下 | 高 | コイン（直径26.5mm）等の代替基準物体に対応 |
| 暗い環境でのカメラ精度 | 高 | 照明チェックUIと明るさガイダンス |
| LiDAR非搭載機種での精度 | 中 | カメラのみモードをデフォルトとして設計 |
| Gemini APIのレートリミット | 中 | キャッシュ実装、ローカルフォールバック |
| App Store審査（カメラ用途） | 中 | プライバシー説明文の充実 |
| Cognito⇔Supabase認証の統一 | 中 | Web側がCognito移行完了後に対応 |

---

## 8. 将来の拡張性

- **Android版**：Flutter or React Nativeでの移植（Phase 4）
- **AR試着連携**：計測した足データでAR上での靴試着
- **3Dフット印刷**：オーダーメイド靴のための3Dデータ出力
- **Siriショートカット**：「Siri、足のサイズを測って」
- **Apple Watch連携**：歩行データとの組み合わせ分析

---

## 9. 用語定義

| 用語 | 定義 |
|---|---|
| ライダー | 足計測を行うアプリ機能全体の呼称 |
| 測定セッション | Adminが特定ユーザーのために発行する計測タスク |
| 足長 | かかと後端から最長のつま先前端までの距離（cm） |
| 足幅 | 親指の付け根から小指の付け根の最も広い部分（cm） |
| 甲高 | 足の甲の最も高い部分の高さ（cm） |
| JISサイズ | 足長を0.5cm刻みで切り上げた日本標準靴サイズ |
| 基準スケール | A4用紙またはコイン等の既知サイズの参照物体 |

---

*このドキュメントはプロトタイプ（project 9 / Bolt）の解析結果をもとに作成されました。*
*詳細な画面デザインはFigmaで別途作成予定。*

