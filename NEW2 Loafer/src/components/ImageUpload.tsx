import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
}

export default function ImageUpload({ value, onChange, label }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    try {
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onChange(data.publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      alert('画像のアップロードに失敗しました / Failed to upload image');
    } finally {
      setUploading(false);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await uploadImage(file);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      await uploadImage(file);
    }
  }

  function handleClick() {
    fileInputRef.current?.click();
  }

  function handleRemove() {
    onChange('');
  }

  return (
    <div>
      <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
        {label}
      </label>

      {value ? (
        <div className="relative group">
          <img
            src={value}
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
        </div>
      ) : (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full h-64 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer
            transition-colors
            ${isDragging ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:border-gray-400'}
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <Upload className="w-12 h-12 text-gray-400 mb-4" strokeWidth={1.5} />
          <p className="text-sm text-gray-600 mb-1">
            {uploading ? 'アップロード中... / Uploading...' : 'クリックまたはドラッグ&ドロップ'}
          </p>
          <p className="text-xs text-gray-500">
            Click or drag & drop to upload
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
