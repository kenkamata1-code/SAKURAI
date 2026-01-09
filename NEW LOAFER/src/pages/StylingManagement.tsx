import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Styling } from '../lib/supabase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
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

  useEffect(() => {
    loadStyleings();
  }, []);

  async function loadStyleings() {
    try {
      const { data, error } = await supabase
        .from('styling')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setStyleings(data);
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      if (editingStyling) {
        const { error } = await supabase
          .from('styling')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingStyling.id);

        if (error) throw error;
        alert('スタイリングを更新しました');
      } else {
        const { error } = await supabase
          .from('styling')
          .insert([formData]);

        if (error) throw error;
        alert('スタイリングを追加しました');
      }

      closeModal();
      loadStyleings();
    } catch (error) {
      console.error('Error saving styling:', error);
      alert('保存に失敗しました');
    }
  }

  async function deleteStyling(id: string) {
    if (!confirm('本当に削除しますか?')) return;

    try {
      const { error } = await supabase
        .from('styling')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('削除しました');
      loadStyleings();
    } catch (error) {
      console.error('Error deleting styling:', error);
      alert('削除に失敗しました');
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
                  {stylings.map(styling => (
                    <tr key={styling.id} className="hover:bg-gray-50">
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
                label="画像 / Image *"
              />

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
