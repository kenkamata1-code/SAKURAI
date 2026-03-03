// ==================== SHOECLOAK 型定義 ====================

export type FootType = 'narrow' | 'standard' | 'wide';
export type FitFeedback = 'too_small' | 'slightly_small' | 'perfect' | 'slightly_large' | 'too_large';
export type ShoeStatus = 'active' | 'sold' | 'donated' | 'archived';
export type ShoeCategory =
  | 'sneakers'
  | 'dress_shoes'
  | 'boots'
  | 'sandals'
  | 'loafers'
  | 'running_shoes'
  | 'basketball_shoes'
  | 'casual_shoes'
  | 'hiking_boots'
  | 'work_boots';

export interface Shoe {
  id: string;
  brand: string;
  model?: string;
  category: ShoeCategory;
  size: number;
  color?: string;
  fit_feedback: FitFeedback;
  purchase_date?: string;
  purchase_price?: number;
  notes?: string;
  status: ShoeStatus;
  created_at: string;
}

export interface FootProfile {
  foot_type: FootType;
  foot_length_cm?: number;
  foot_width_cm?: number;
  default_size: number;
  updated_at: string;
}

export interface SizeRecommendationResult {
  recommendedSize: number;
  reasoning: string;
  confidenceScore: number;
}

// ==================== ブランドマスター ====================
// Bolt版 project 9 のデータをそのまま移植

export interface BrandMaster {
  name: string;
  size_bias: number;       // cm単位の補正値
  width_tendency: 'narrow' | 'standard' | 'wide';
}

export const BRANDS: BrandMaster[] = [
  { name: 'Nike',              size_bias: 0,    width_tendency: 'standard' },
  { name: 'Adidas',            size_bias: -0.5, width_tendency: 'standard' },
  { name: 'New Balance',       size_bias: 0,    width_tendency: 'wide'     },
  { name: 'Asics',             size_bias: 0,    width_tendency: 'standard' },
  { name: 'Puma',              size_bias: -0.5, width_tendency: 'narrow'   },
  { name: 'Converse',          size_bias: 0,    width_tendency: 'narrow'   },
  { name: 'Vans',              size_bias: 0,    width_tendency: 'standard' },
  { name: 'Reebok',            size_bias: 0,    width_tendency: 'standard' },
  { name: 'Under Armour',      size_bias: 0,    width_tendency: 'standard' },
  { name: 'Saucony',           size_bias: 0,    width_tendency: 'standard' },
  { name: 'Brooks',            size_bias: 0,    width_tendency: 'standard' },
  { name: 'Hoka One One',      size_bias: 0.5,  width_tendency: 'standard' },
  { name: 'On Running',        size_bias: 0,    width_tendency: 'narrow'   },
  { name: 'Salomon',           size_bias: 0,    width_tendency: 'narrow'   },
  { name: 'Merrell',           size_bias: 0,    width_tendency: 'wide'     },
  { name: 'Allen Edmonds',     size_bias: 0,    width_tendency: 'standard' },
  { name: 'Cole Haan',         size_bias: 0,    width_tendency: 'standard' },
  { name: 'Clarks',            size_bias: 0,    width_tendency: 'standard' },
  { name: 'Dr. Martens',       size_bias: 0,    width_tendency: 'wide'     },
  { name: 'Timberland',        size_bias: 0,    width_tendency: 'standard' },
  { name: 'Red Wing',          size_bias: 0,    width_tendency: 'wide'     },
  { name: 'Common Projects',   size_bias: -0.5, width_tendency: 'narrow'   },
  { name: 'Golden Goose',      size_bias: 0,    width_tendency: 'narrow'   },
];

export const CATEGORY_LABELS: Record<ShoeCategory, string> = {
  sneakers:         'スニーカー',
  dress_shoes:      'ドレスシューズ',
  boots:            'ブーツ',
  sandals:          'サンダル',
  loafers:          'ローファー',
  running_shoes:    'ランニングシューズ',
  basketball_shoes: 'バスケットシューズ',
  casual_shoes:     'カジュアルシューズ',
  hiking_boots:     'ハイキングブーツ',
  work_boots:       'ワークブーツ',
};

export const CATEGORY_SIZE_ADJUSTMENT: Record<ShoeCategory, number> = {
  sneakers:         0,
  dress_shoes:      0,
  boots:            0.5,
  sandals:          0,
  loafers:          0,
  running_shoes:    0,
  basketball_shoes: 0,
  casual_shoes:     0,
  hiking_boots:     0.5,
  work_boots:       0.5,
};

export const FIT_FEEDBACK_LABELS: Record<FitFeedback, string> = {
  too_small:      'かなり小さい',
  slightly_small: 'やや小さい',
  perfect:        'ぴったり',
  slightly_large: 'やや大きい',
  too_large:      'かなり大きい',
};

// ==================== ユーザー基礎情報 ====================

export type ArchHeight    = 'low' | 'medium' | 'high';
export type PreferredFit  = 'snug' | 'regular' | 'loose';

export interface UserProfile {
  display_name:       string;
  age:                number | null;
  height_cm:          number | null;
  weight_kg:          number | null;
  left_foot_length:   number | null;   // 実測値 cm
  right_foot_length:  number | null;
  left_foot_width:    number | null;
  right_foot_width:   number | null;
  arch_height:        ArchHeight | null;
  preferred_fit:      PreferredFit | null;
  is_public:          boolean;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  display_name: '',
  age: null, height_cm: null, weight_kg: null,
  left_foot_length: null, right_foot_length: null,
  left_foot_width: null,  right_foot_width: null,
  arch_height: null, preferred_fit: null,
  is_public: false,
};

export const ARCH_HEIGHT_LABELS: Record<ArchHeight, string> = {
  low:    '低め / Low',
  medium: '普通 / Medium',
  high:   '高め / High',
};

export const PREFERRED_FIT_LABELS: Record<PreferredFit, string> = {
  snug:    'ぴったり / Snug',
  regular: '標準 / Regular',
  loose:   'ゆったり / Loose',
};

