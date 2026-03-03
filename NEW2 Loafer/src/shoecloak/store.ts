// ==================== SHOECLOAK ローカルストア ====================
// TODO: バックエンドAPI実装後はlocalStorageではなくAPIに差し替え

import { Shoe, FootProfile, UserProfile, DEFAULT_USER_PROFILE, FootMeasurement } from './types';

const SHOES_KEY   = 'shoecloak_shoes';
const PROFILE_KEY = 'shoecloak_foot_profile';

// ----- 靴データ -----

export function loadShoes(): Shoe[] {
  try {
    const raw = localStorage.getItem(SHOES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShoes(shoes: Shoe[]): void {
  localStorage.setItem(SHOES_KEY, JSON.stringify(shoes));
}

export function addShoe(shoe: Omit<Shoe, 'id' | 'created_at'>): Shoe {
  const newShoe: Shoe = {
    ...shoe,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const existing = loadShoes();
  saveShoes([newShoe, ...existing]);
  return newShoe;
}

export function updateShoe(id: string, patch: Partial<Shoe>): void {
  const shoes = loadShoes().map(s => s.id === id ? { ...s, ...patch } : s);
  saveShoes(shoes);
}

export function deleteShoe(id: string): void {
  saveShoes(loadShoes().filter(s => s.id !== id));
}

// ----- 足プロファイル -----

export function loadFootProfile(): FootProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveFootProfile(profile: FootProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ----- ユーザー基礎情報 -----

const USER_PROFILE_KEY = 'shoecloak_user_profile';

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    return raw ? { ...DEFAULT_USER_PROFILE, ...JSON.parse(raw) } : { ...DEFAULT_USER_PROFILE };
  } catch {
    return { ...DEFAULT_USER_PROFILE };
  }
}

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

// ----- 足の実測データ -----

const MEASUREMENTS_KEY = 'shoecloak_measurements';

export function loadMeasurements(): FootMeasurement[] {
  try {
    const raw = localStorage.getItem(MEASUREMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

/** 左右どちらかを上書き保存（1足につき最新1件を保持） */
export function saveMeasurement(m: Omit<FootMeasurement, 'id' | 'measured_at'>): FootMeasurement {
  const newM: FootMeasurement = {
    ...m,
    id: crypto.randomUUID(),
    measured_at: new Date().toISOString(),
  };
  const others = loadMeasurements().filter(x => x.foot_side !== m.foot_side);
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify([...others, newM]));
  return newM;
}

export function deleteMeasurement(foot_side: 'left' | 'right'): void {
  localStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(loadMeasurements().filter(m => m.foot_side !== foot_side)));
}

// ----- カスタムブランド -----

const CUSTOM_BRANDS_KEY = 'shoecloak_custom_brands';

export function loadCustomBrands(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_BRANDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function addCustomBrand(name: string): void {
  const existing = loadCustomBrands();
  const upper = name.toUpperCase();
  if (!existing.includes(upper)) {
    localStorage.setItem(CUSTOM_BRANDS_KEY, JSON.stringify([...existing, upper]));
  }
}

export function removeCustomBrand(name: string): void {
  localStorage.setItem(CUSTOM_BRANDS_KEY, JSON.stringify(loadCustomBrands().filter(b => b !== name)));
}

