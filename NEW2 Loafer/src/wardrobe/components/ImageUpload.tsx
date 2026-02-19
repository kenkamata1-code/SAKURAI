import { useState, useRef, useCallback } from 'react';
import { Upload, X, Camera } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useAuth } from '../../contexts/AuthContext';

interface ImageUploadProps {
  onImageSelect?: (file: File) => void;
  onImageProcessed?: (url: string) => void;
  currentImage?: string | null;
  currentImageUrl?: string | null;
  removeBackground?: boolean;
  label?: string;
  value?: string;
  onChange?: (url: string) => void;
}

export default function ImageUpload({ 
  onImageSelect,
  onImageProcessed,
  currentImage, 
  currentImageUrl,
  removeBackground = false,
  label,
  value,
  onChange,
}: ImageUploadProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || currentImageUrl || value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    // プレビュー表示
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // コールバックを呼び出し
    if (onImageSelect) {
      onImageSelect(file);
    }

    // 自動アップロードする場合
    if (onImageProcessed || onChange) {
      setUploading(true);
      try {
        const result = await apiClient.uploadImage(
          user?.id || 'anonymous', 
          file, 
          'wardrobe-images'
        );
        
        if (result.data) {
          setPreviewUrl(result.data);
          onImageProcessed?.(result.data);
          onChange?.(result.data);
        }
      } catch (error) {
        console.error('Upload error:', error);
        alert('画像のアップロードに失敗しました');
      } finally {
        setUploading(false);
      }
    }
  }, [user, onImageSelect, onImageProcessed, onChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange?.('');
    onImageProcessed?.('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
          {label}
        </label>
      )}

      {previewUrl ? (
        <div className="relative group">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-64 object-cover border border-gray-300"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-white border border-gray-300 hover:bg-gray-100 transition opacity-0 group-hover:opacity-100"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <p className="text-white text-sm">アップロード中...</p>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full h-64 border-2 border-dashed flex flex-col items-center justify-center
            transition-colors
            ${isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          {uploading ? (
            <p className="text-sm text-gray-600">アップロード中... / Uploading...</p>
          ) : (
            <>
              {/* ファイル選択ボタン */}
              <button
                type="button"
                onClick={handleClick}
                className="flex flex-col items-center gap-2 mb-4 text-gray-500 hover:text-gray-800 transition"
              >
                <Upload className="w-8 h-8" strokeWidth={1.5} />
                <span className="text-xs">クリックまたはドラッグ&ドロップ</span>
              </button>

              {/* 区切り */}
              <p className="text-xs text-gray-400 mb-4">または</p>

              {/* カメラボタン（モバイルで直接カメラ起動） */}
              <button
                type="button"
                onClick={handleCameraClick}
                className="flex items-center gap-2 px-4 py-2 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition text-sm"
              >
                <Camera className="w-4 h-4" />
                カメラで撮影
              </button>
            </>
          )}
        </div>
      )}

      {/* 通常のファイル選択用 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {/* カメラ直接起動用（capture属性） */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

