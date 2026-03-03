// ==================== SHOECLOAK ローカルストア ====================
// TODO: バックエンドAPI実装後はlocalStorageではなくAPIに差し替え

import { Shoe, FootProfile, UserProfile, DEFAULT_USER_PROFILE } from './types';

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

