// ==================== サイズ推奨ロジック ====================
// Bolt版 project 9 / src/services/sizeRecommendation.ts を移植・改良

import {
  Shoe,
  FootProfile,
  SizeRecommendationResult,
  BRANDS,
  CATEGORY_SIZE_ADJUSTMENT,
  ShoeCategory,
} from './types';

interface RecommendInput {
  brandName: string;
  category: ShoeCategory;
  footProfile: FootProfile | null;
  pastShoes: Shoe[];
}

export function getSizeRecommendation(input: RecommendInput): SizeRecommendationResult {
  const { brandName, category, footProfile, pastShoes } = input;

  // ベースサイズ
  const baseSize = footProfile?.default_size ?? 26.0;
  let totalAdjustment = 0;
  const adjustments: string[] = [];

  // 足タイプ補正
  if (footProfile?.foot_type === 'wide') {
    totalAdjustment += 0.5;
    adjustments.push('幅広足: +0.5cm');
  } else if (footProfile?.foot_type === 'narrow') {
    totalAdjustment -= 0.5;
    adjustments.push('細め足: -0.5cm');
  }

  // ブランドバイアス補正
  const brand = BRANDS.find(b => b.name === brandName);
  if (brand) {
    totalAdjustment += brand.size_bias;
    if (brand.size_bias !== 0) {
      adjustments.push(
        `${brand.name}の傾向: ${brand.size_bias > 0 ? '+' : ''}${brand.size_bias}cm`
      );
    }

    // 足幅 × ブランド幅の組み合わせ補正
    if (footProfile) {
      if (brand.width_tendency === 'narrow' && footProfile.foot_type === 'wide') {
        totalAdjustment += 0.5;
        adjustments.push('幅広足 × 細めブランドの組み合わせ: +0.5cm');
      } else if (brand.width_tendency === 'wide' && footProfile.foot_type === 'narrow') {
        totalAdjustment -= 0.5;
        adjustments.push('細め足 × 幅広ブランドの組み合わせ: -0.5cm');
      }
    }
  }

  // カテゴリー補正
  const categoryAdj = CATEGORY_SIZE_ADJUSTMENT[category];
  if (categoryAdj !== 0) {
    totalAdjustment += categoryAdj;
    adjustments.push(`カテゴリー補正（${category}）: +${categoryAdj}cm`);
  }

  // 過去フィードバック学習（同ブランドの実績）
  const sameBrandShoes = pastShoes.filter(s => s.brand === brandName && s.status === 'active');
  if (sameBrandShoes.length > 0) {
    const perfectShoes = sameBrandShoes.filter(s => s.fit_feedback === 'perfect');
    if (perfectShoes.length > 0) {
      const perfectAvg = perfectShoes.reduce((sum, s) => sum + s.size, 0) / perfectShoes.length;
      const diff = perfectAvg - baseSize;
      totalAdjustment += diff * 0.5;
      adjustments.push(
        `${brandName}での過去のぴったりサイズ実績: ${diff > 0 ? '+' : ''}${(diff * 0.5).toFixed(1)}cm`
      );
    }
  }

  // 最終推奨サイズ（0.5cm刻み）
  const raw = baseSize + totalAdjustment;
  const recommendedSize = Math.round(raw * 2) / 2;

  // 根拠テキスト
  let reasoning = `通常サイズ ${baseSize}cm を基準に：\n`;
  if (adjustments.length === 0) {
    reasoning += '• 補正なし（標準的なフィット予測）\n';
  } else {
    adjustments.forEach(a => { reasoning += `• ${a}\n`; });
  }
  reasoning += `\n推奨サイズ: ${recommendedSize}cm`;

  // 信頼度
  let confidence = 50;
  if (footProfile) confidence += 20;
  if (brand) confidence += 15;
  confidence += Math.min(adjustments.length * 5, 15);
  if (sameBrandShoes.length > 0) confidence = Math.min(confidence + 10, 95);

  return {
    recommendedSize,
    reasoning,
    confidenceScore: Math.min(confidence, 95),
  };
}

