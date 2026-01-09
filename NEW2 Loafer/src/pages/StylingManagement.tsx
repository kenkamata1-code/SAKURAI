import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Styling } from '../lib/api-client';
import { Plus, Edit2, Trash2, X, ArrowUp, ArrowDown } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';

export default function StylingManagement() {
  const [stylings, setStyleings] = useState<Styling[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStyling, setEditingStyling] = useState<Styling | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    color: '',
    size: '',
    height: '',
    slug: '',
  });
  const [additionalImages, setAdditionalImages] = useState<string[]>(['', '', '']);

  useEffect(() => {
    loadStyleings();
  }, []);

  async function loadStyleings() {
    try {
      const data = await api.styling.list();
      setStyleings(data);
    } catch (error) {
      console.error('Error loading stylings:', error);
    }
  }

  function openModal(styling?: Styling) {
    if (styling) {
      setEditingStyling(styling);
      setFormData({
        title: styling.title,
        description: styling.description,
        image_url: styling.image_url,
        color: styling.color,
        size: styling.size,
        height: styling.height,
        slug: styling.slug,
      });

      const images = styling.styling_images?.sort((a, b) => a.display_order - b.display_order) || [];
      const imageUrls = Array(3).fill('');
      images.forEach((img, idx) => {
        if (idx < 3) imageUrls[idx] = img.url;
      });
      setAdditionalImages(imageUrls);
    } else {
      setEditingStyling(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        color: '',
        size: '',
        height: '',
        slug: '',
      });
      setAdditionalImages(['', '', '']);
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingStyling(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      color: '',
      size: '',
      height: '',
      slug: '',
    });
    setAdditionalImages(['', '', '']);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      let stylingId = editingStyling?.id;

      if (editingStyling) {
        await api.admin.updateStyling(editingStyling.id, formData);
      } else {
        const newStyling = await api.admin.createStyling(formData);
        stylingId = newStyling?.id;
      }

      // 画像の更新
      if (stylingId) {
        // 既存の画像を削除
        const existingImages = await api.admin.listStylingImages(stylingId);
        for (const img of existingImages) {
          await api.admin.deleteStylingImage(img.id);
        }

        // 新しい画像を追加
        for (let i = 0; i < additionalImages.length; i++) {
          const url = additionalImages[i];
          if (url.trim() !== '') {
            await api.admin.createStylingImage(stylingId, { url, display_order: i + 1 });
          }
        }
      }

      closeModal();
      loadStyleings();
      alert(editingStyling ? 'スタイリングを更新しました' : 'スタイリングを追加しました');
    } catch (error) {
      console.error('Error saving styling:', error);
      alert('保存に失敗しました');
    }
  }

  async function deleteStyling(id: string) {
    if (!confirm('本当に削除しますか?')) return;

    try {
      await api.admin.deleteStyling(id);
      alert('削除しました');
      loadStyleings();
    } catch (error) {
      console.error('Error deleting styling:', error);
      alert('削除に失敗しました');
    }
  }

  async function moveStyling(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stylings.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const styling1 = stylings[index];
    const styling2 = stylings[newIndex];

    try {
      await api.admin.updateStyling(styling1.id, { display_order: styling2.display_order });
      await api.admin.updateStyling(styling2.id, { display_order: styling1.display_order });
      await loadStyleings();
    } catch (error) {
      console.error('Error moving styling:', error);
      alert('順番の変更に失敗しました');
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
                STYLING MANAGEMENT
              </h1>
              <p className="text-xs tracking-[0.15em] text-gray-500">
                スタイリング管理 / Manage Styling
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/admin"
                className="px-6 py-3 border border-gray-300 text-xs tracking-[0.2em] hover:bg-gray-100 transition uppercase"
              >
                Product Management
              </Link>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-6 py-3 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition uppercase"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                New Styling
              </button>
            </div>
          </div>

          <div className="border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">順番</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">画像</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">タイトル</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">カラー</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">サイズ</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">身長</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">スラッグ</th>
                    <th className="text-right p-4 text-xs font-light tracking-wider text-gray-600 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stylings.map((styling, index) => (
                    <tr key={styling.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveStyling(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100 transition text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上へ移動"
                          >
                            <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => moveStyling(index, 'down')}
                            disabled={index === stylings.length - 1}
                            className="p-1 hover:bg-gray-100 transition text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下へ移動"
                          >
                            <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <img
                          src={styling.image_url}
                          alt={styling.title}
                          className="w-16 h-20 object-cover bg-[#E8E8E8]"
                        />
                      </td>
                      <td className="p-4 text-sm text-gray-800">{styling.title || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">{styling.color || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">{styling.size || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">{styling.height || '-'}</td>
                      <td className="p-4 text-sm text-gray-600">{styling.slug}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(styling)}
                            className="p-2 hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => deleteStyling(styling.id)}
                            className="p-2 hover:bg-red-50 transition text-red-600"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl tracking-[0.1em] font-light">
                {editingStyling ? 'スタイリングを編集' : '新規スタイリングを追加'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">タイトル</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                />
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="メイン画像 / Main Image *"
              />

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-3 uppercase">
                  追加画像 / Additional Images (最大3枚)
                </label>
                <div className="space-y-3">
                  {additionalImages.map((url, index) => (
                    <ImageUpload
                      key={index}
                      value={url}
                      onChange={(newUrl) => {
                        const updated = [...additionalImages];
                        updated[index] = newUrl;
                        setAdditionalImages(updated);
                      }}
                      label={`画像 ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">カラー</label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="BLACK"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">サイズ</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="25.5cm(41)"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">身長</label>
                  <input
                    type="text"
                    value={formData.height}
                    onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="173cm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">スラッグ *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  placeholder="styling-slug"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition uppercase"
                >
                  {editingStyling ? 'Update' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 border border-gray-300 text-xs tracking-[0.2em] hover:bg-gray-100 transition uppercase"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
