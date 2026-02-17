/**
 * Excelエクスポートユーティリティ
 */

import * as XLSX from 'xlsx';
import type { WardrobeItem } from '../types';

export function exportToExcel(items: WardrobeItem[], category: string) {
  const exportData = items.map(item => {
    let status = 'アクティブ / Active';
    if (item.is_sold) {
      status = '販売済み / Sold';
    } else if (item.is_discarded) {
      status = '廃棄済み / Discarded';
    }

    return {
      'アイテム名 / Item Name': item.name,
      'ブランド / Brand': item.brand || '',
      'カテゴリー / Category': item.category || '',
      'サイズ / Size': item.size || '',
      '色 / Color': item.color || '',
      '購入日 / Purchase Date': item.purchase_date || '',
      '購入価格 / Purchase Price': item.purchase_price || '',
      '通貨 / Currency': item.currency || '',
      '購入場所 / Purchase Location': item.purchase_location || '',
      'ステータス / Status': status,
      '販売日 / Sold Date': item.sold_date || '',
      '販売価格 / Sold Price': item.sold_price || '',
      '販売通貨 / Sold Currency': item.sold_currency || '',
      '販売場所 / Sold Location': item.sold_location || '',
      '廃棄日 / Discarded Date': item.discarded_at ? new Date(item.discarded_at).toLocaleDateString() : '',
      'メモ / Notes': item.notes || '',
      'URL': item.source_url || '',
      '登録日 / Created At': new Date(item.created_at).toLocaleDateString(),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Wardrobe');

  const categoryText = category === 'All' ? 'All' : category;
  const filename = `wardrobe_${categoryText}_${new Date().toISOString().split('T')[0]}.xlsx`;

  XLSX.writeFile(workbook, filename);
}

