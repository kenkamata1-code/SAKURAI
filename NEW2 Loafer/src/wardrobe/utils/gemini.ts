/**
 * Gemini API ユーティリティ
 * 
 * 将来的なスクレイピングとサイズ推薦に使用
 * 環境変数 VITE_GEMINI_API_KEY を設定してください
 */

import type { ScrapedProductData, TagExtractionResult, SizeRecommendation, FootMeasurement, BrandSizeMapping } from '../types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const GEMINI_VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

/**
 * Gemini APIが設定されているかチェック
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}

/**
 * 商品URLからデータをスクレイピング（Gemini API使用）
 * 
 * 拡張ポイント: この関数を実装してスクレイピング機能を追加
 */
export async function scrapeProductWithGemini(url: string): Promise<ScrapedProductData | null> {
  if (!isGeminiConfigured()) {
    console.warn('Gemini API key not configured. Set VITE_GEMINI_API_KEY environment variable.');
    return null;
  }

  try {
    // TODO: 実装
    // 1. URLからページコンテンツを取得（プロキシサーバー経由）
    // 2. Gemini APIでコンテンツを解析
    // 3. 商品情報を抽出
    
    const prompt = `
以下のURLから商品情報を抽出してください。
URL: ${url}

以下の形式でJSONを返してください:
{
  "name": "商品名",
  "brand": "ブランド名",
  "price": "価格（数字のみ）",
  "currency": "通貨コード（JPY, USD等）",
  "size": "サイズ",
  "color": "色",
  "description": "商品説明",
  "image_url": "商品画像URL"
}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      // JSONを抽出してパース
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as ScrapedProductData;
      }
    }

    return null;
  } catch (error) {
    console.error('Scraping with Gemini failed:', error);
    return null;
  }
}

/**
 * タグ画像から情報を抽出（Gemini Vision API使用）
 * 
 * 拡張ポイント: この関数を実装してタグ解析機能を追加
 */
export async function extractTagInfoWithGemini(imageBase64: string): Promise<TagExtractionResult | null> {
  if (!isGeminiConfigured()) {
    console.warn('Gemini API key not configured. Set VITE_GEMINI_API_KEY environment variable.');
    return null;
  }

  try {
    const prompt = `
この画像はアパレル商品のタグです。以下の情報を抽出してください:

- ブランド名
- サイズ
- 素材・材質
- 洗濯表示
- 製造国
- カテゴリー（トップス、パンツ、アウター等）

以下の形式でJSONを返してください:
{
  "brand": "ブランド名",
  "size": "サイズ",
  "materials": "素材（例: 綿 100%）",
  "care_instructions": "洗濯表示",
  "category": "カテゴリー"
}
`;

    const response = await fetch(`${GEMINI_VISION_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              }
            }
          ]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error('Gemini Vision API request failed');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as TagExtractionResult;
      }
    }

    return null;
  } catch (error) {
    console.error('Tag extraction with Gemini failed:', error);
    return null;
  }
}

/**
 * AIサイズ推奨を取得（Gemini API使用）
 * 
 * 拡張ポイント: この関数を実装してAIサイズ推奨機能を追加
 */
export async function getSizeRecommendationWithGemini(
  productName: string,
  footMeasurements: FootMeasurement[],
  sizeMappings: BrandSizeMapping[]
): Promise<SizeRecommendation | null> {
  if (!isGeminiConfigured()) {
    console.warn('Gemini API key not configured. Set VITE_GEMINI_API_KEY environment variable.');
    return null;
  }

  try {
    const activeMeasurement = footMeasurements.find(m => m.is_active);
    
    const prompt = `
シューズのサイズ推奨をお願いします。

商品: ${productName}

ユーザーの足のサイズ:
${activeMeasurement ? `
- 足長: ${activeMeasurement.length_mm / 10}cm
- 足幅: ${activeMeasurement.width_mm / 10}cm
${activeMeasurement.arch_height_mm ? `- 甲高: ${activeMeasurement.arch_height_mm / 10}cm` : ''}
` : '測定データなし'}

過去の購入サイズ情報:
${sizeMappings.length > 0 
  ? sizeMappings.map(m => `- ${m.brand_name}: ${m.size_system} ${m.size} (フィット感: ${m.fit_rating}/5)`).join('\n')
  : 'なし'
}

以下の形式でJSONを返してください:
{
  "brand_name": "ブランド名",
  "model_name": "モデル名",
  "recommended_size": "推奨サイズ",
  "confidence_score": 信頼度（0-100）,
  "reasoning": "推奨理由の説明",
  "alternative_sizes": [
    {"size": "代替サイズ1", "note": "説明"},
    {"size": "代替サイズ2", "note": "説明"}
  ]
}
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      }),
    });

    if (!response.ok) {
      throw new Error('Gemini API request failed');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (text) {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as SizeRecommendation;
      }
    }

    return null;
  } catch (error) {
    console.error('Size recommendation with Gemini failed:', error);
    return null;
  }
}

