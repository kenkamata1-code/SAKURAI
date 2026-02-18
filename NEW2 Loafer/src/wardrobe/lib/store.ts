/**
 * 状態管理ストア - Zustand
 * 
 * THE LONG GAMEへ統合時の接続ポイント:
 * - 必要に応じて親アプリの状態管理と連携できます
 * - 独立して動作するため、そのまま使用することも可能です
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  WardrobeItem, 
  StylingPhoto, 
  FootMeasurement, 
  BrandSizeMapping 
} from '../types';
import { apiClient } from './api-client';

// Wardrobe Store
interface WardrobeState {
  items: WardrobeItem[];
  loading: boolean;
  error: string | null;
  selectedCategory: string;
  
  // Actions
  fetchItems: (userId: string) => Promise<void>;
  addItem: (userId: string, item: Partial<WardrobeItem>) => Promise<void>;
  updateItem: (id: string, updates: Partial<WardrobeItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  discardItem: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<void>;
  sellItem: (id: string, sellData: { sold_date: string; sold_price?: number; sold_currency?: string; sold_location?: string }) => Promise<void>;
  setSelectedCategory: (category: string) => void;
}

export const useWardrobeStore = create<WardrobeState>()(
  devtools(
    (set, get) => ({
      items: [],
      loading: false,
      error: null,
      selectedCategory: 'All',

      fetchItems: async (userId) => {
        set({ loading: true, error: null });
        const result = await apiClient.getWardrobeItems(userId);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else {
          set({ items: result.data || [], loading: false });
        }
      },

      addItem: async (userId, item) => {
        set({ loading: true, error: null });
        const result = await apiClient.createWardrobeItem(userId, item);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else if (result.data) {
          set((state) => ({ 
            items: [result.data!, ...state.items],
            loading: false 
          }));
        }
      },

      updateItem: async (id, updates) => {
        const result = await apiClient.updateWardrobeItem(id, updates);
        if (result.error) {
          set({ error: result.error.message });
        } else if (result.data) {
          set((state) => ({
            items: state.items.map(item => 
              item.id === id ? result.data! : item
            ),
          }));
        }
      },

      deleteItem: async (id) => {
        await apiClient.deleteWardrobeItem(id);
        set((state) => ({
          items: state.items.filter(item => item.id !== id),
        }));
      },

      discardItem: async (id) => {
        const result = await apiClient.updateWardrobeItem(id, {
          is_discarded: true,
          discarded_at: new Date().toISOString(),
        });
        if (result.data) {
          set((state) => ({
            items: state.items.map(item => 
              item.id === id ? result.data! : item
            ),
          }));
        }
      },

      restoreItem: async (id) => {
        const result = await apiClient.updateWardrobeItem(id, {
          is_discarded: false,
          discarded_at: null,
        });
        if (result.data) {
          set((state) => ({
            items: state.items.map(item => 
              item.id === id ? result.data! : item
            ),
          }));
        }
      },

      sellItem: async (id, sellData) => {
        const result = await apiClient.updateWardrobeItem(id, {
          is_sold: true,
          sold_date: sellData.sold_date,
          sold_price: sellData.sold_price || null,
          sold_currency: sellData.sold_currency || 'JPY',
          sold_location: sellData.sold_location || null,
        });
        if (result.data) {
          set((state) => ({
            items: state.items.map(item => 
              item.id === id ? result.data! : item
            ),
          }));
        }
      },

      setSelectedCategory: (category) => {
        set({ selectedCategory: category });
      },
    }),
    { name: 'wardrobe-store' }
  )
);

// Styling Store
interface StylingState {
  photos: StylingPhoto[];
  loading: boolean;
  error: string | null;
  
  fetchPhotos: (userId: string) => Promise<void>;
  addPhoto: (userId: string, photo: Partial<StylingPhoto>, wornItemIds: string[]) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
}

export const useStylingStore = create<StylingState>()(
  devtools(
    (set) => ({
      photos: [],
      loading: false,
      error: null,

      fetchPhotos: async (userId) => {
        set({ loading: true, error: null });
        const result = await apiClient.getStylingPhotos(userId);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else {
          set({ photos: result.data || [], loading: false });
        }
      },

      addPhoto: async (userId, photo, wornItemIds) => {
        set({ loading: true, error: null });
        const result = await apiClient.createStylingPhoto(userId, photo, wornItemIds);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else if (result.data) {
          set((state) => ({ 
            photos: [result.data!, ...state.photos],
            loading: false 
          }));
        }
      },

      deletePhoto: async (id) => {
        await apiClient.deleteStylingPhoto(id);
        set((state) => ({
          photos: state.photos.filter(photo => photo.id !== id),
        }));
      },
    }),
    { name: 'styling-store' }
  )
);

// Measurement Store
interface MeasurementState {
  measurements: FootMeasurement[];
  sizeMappings: BrandSizeMapping[];
  loading: boolean;
  error: string | null;
  
  fetchMeasurements: (userId: string) => Promise<void>;
  addMeasurement: (userId: string, measurement: Partial<FootMeasurement>) => Promise<void>;
  setMeasurementActive: (id: string, footType: 'left' | 'right') => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  
  fetchSizeMappings: (userId: string) => Promise<void>;
  addSizeMapping: (userId: string, mapping: Partial<BrandSizeMapping>) => Promise<void>;
  updateSizeMapping: (id: string, updates: Partial<BrandSizeMapping>) => Promise<void>;
  deleteSizeMapping: (id: string) => Promise<void>;
}

export const useMeasurementStore = create<MeasurementState>()(
  devtools(
    (set, get) => ({
      measurements: [],
      sizeMappings: [],
      loading: false,
      error: null,

      fetchMeasurements: async (userId) => {
        set({ loading: true, error: null });
        const result = await apiClient.getFootMeasurements(userId);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else {
          set({ measurements: result.data || [], loading: false });
        }
      },

      addMeasurement: async (userId, measurement) => {
        set({ loading: true, error: null });
        const result = await apiClient.createFootMeasurement(userId, measurement);
        if (result.error) {
          set({ error: result.error.message, loading: false });
        } else if (result.data) {
          set((state) => ({ 
            measurements: [result.data!, ...state.measurements],
            loading: false 
          }));
        }
      },

      setMeasurementActive: async (id, footType) => {
        const result = await apiClient.updateFootMeasurementActive(id, true);
        if (result.data) {
          set((state) => ({
            measurements: state.measurements.map(m => 
              m.id === id ? result.data! : 
              m.foot_type === footType ? { ...m, is_active: false } : m
            ),
          }));
        }
      },

      deleteMeasurement: async (id) => {
        await apiClient.deleteFootMeasurement(id);
        set((state) => ({
          measurements: state.measurements.filter(m => m.id !== id),
        }));
      },

      fetchSizeMappings: async (userId) => {
        const result = await apiClient.getBrandSizeMappings(userId);
        if (result.data) {
          set({ sizeMappings: result.data });
        }
      },

      addSizeMapping: async (userId, mapping) => {
        const result = await apiClient.createBrandSizeMapping(userId, mapping);
        if (result.data) {
          set((state) => ({ 
            sizeMappings: [result.data!, ...state.sizeMappings]
          }));
        }
      },

      updateSizeMapping: async (id, updates) => {
        const result = await apiClient.updateBrandSizeMapping(id, updates);
        if (result.data) {
          set((state) => ({
            sizeMappings: state.sizeMappings.map(m => 
              m.id === id ? result.data! : m
            ),
          }));
        }
      },

      deleteSizeMapping: async (id) => {
        await apiClient.deleteBrandSizeMapping(id);
        set((state) => ({
          sizeMappings: state.sizeMappings.filter(m => m.id !== id),
        }));
      },
    }),
    { name: 'measurement-store' }
  )
);

// UI Store - 画面表示の状態管理
interface UIState {
  viewMode: 'items' | 'styling' | 'dashboard' | 'sales' | 'portfolio' | 'ai-assistant' | 'foot-scan' | 'size-mapping' | 'size-recommend';
  dashboardSubTab: 'expense' | 'sell' | 'portfolio';
  showAddModal: boolean;
  showStylingModal: boolean;
  showSellModal: boolean;
  
  setViewMode: (mode: UIState['viewMode']) => void;
  setDashboardSubTab: (tab: UIState['dashboardSubTab']) => void;
  setShowAddModal: (show: boolean) => void;
  setShowStylingModal: (show: boolean) => void;
  setShowSellModal: (show: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      viewMode: 'items',
      dashboardSubTab: 'expense',
      showAddModal: false,
      showStylingModal: false,
      showSellModal: false,

      setViewMode: (mode) => set({ viewMode: mode }),
      setDashboardSubTab: (tab) => set({ dashboardSubTab: tab }),
      setShowAddModal: (show) => set({ showAddModal: show }),
      setShowStylingModal: (show) => set({ showStylingModal: show }),
      setShowSellModal: (show) => set({ showSellModal: show }),
    }),
    { name: 'wardrobe-ui-state' }
  )
);

