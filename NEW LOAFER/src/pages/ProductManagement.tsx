import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Product, Category } from '../lib/supabase';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    image_url: '',
    category_id: '',
    stock: '',
    featured: false
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [productsRes, categoriesRes] = await Promise.all([
      supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name')
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (categoriesRes.data) setCategories(categoriesRes.data);
  }

  function openModal(product?: Product) {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: product.price.toString(),
        image_url: product.image_url,
        category_id: product.category_id || '',
        stock: product.stock.toString(),
        featured: product.featured
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: '',
        image_url: '',
        category_id: '',
        stock: '',
        featured: false
      });
    }
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProduct(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const productData = {
      name: formData.name,
      slug: formData.slug,
      description: formData.description,
      price: parseFloat(formData.price),
      image_url: formData.image_url,
      category_id: formData.category_id || null,
      stock: parseInt(formData.stock),
      featured: formData.featured,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingProduct) {
        await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
      } else {
        await supabase
          .from('products')
          .insert(productData);
      }

      await loadData();
      closeModal();
      alert(editingProduct ? '商品を更新しました' : '商品を追加しました');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('保存に失敗しました');
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm('本当に削除しますか？')) return;

    try {
      await supabase.from('products').delete().eq('id', id);
      await loadData();
      alert('商品を削除しました');
    } catch (error) {
      console.error('Error deleting product:', error);
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
                PRODUCT MANAGEMENT
              </h1>
              <p className="text-xs tracking-[0.15em] text-gray-500">
                商品管理 / Manage Products
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/admin/styling"
                className="px-6 py-3 border border-gray-300 text-xs tracking-[0.2em] hover:bg-gray-100 transition uppercase"
              >
                Styling Management
              </Link>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-6 py-3 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition uppercase"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                New Product
              </button>
            </div>
          </div>

          <div className="border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">画像</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">商品名</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">カテゴリー</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">価格</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">在庫</th>
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">注目</th>
                    <th className="text-right p-4 text-xs font-light tracking-wider text-gray-600 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 object-cover bg-[#E8E8E8]"
                        />
                      </td>
                      <td className="p-4 text-sm text-gray-800">{product.name}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {product.categories?.name || '-'}
                      </td>
                      <td className="p-4 text-sm text-gray-800">¥{product.price.toLocaleString()}</td>
                      <td className="p-4 text-sm text-gray-800">{product.stock}</td>
                      <td className="p-4">
                        {product.featured ? (
                          <span className="text-yellow-600">★</span>
                        ) : (
                          <span className="text-gray-300">☆</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openModal(product)}
                            className="p-2 hover:bg-gray-100 transition text-gray-600 hover:text-gray-900"
                          >
                            <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
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
                {editingProduct ? '商品を編集' : '新規商品を追加'}
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
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">商品名 *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">スラッグ *</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  placeholder="product-slug"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">価格 *</label>
                  <input
                    type="number"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">在庫 *</label>
                  <input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">カテゴリー</label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                >
                  <option value="">選択してください</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="画像 / Image"
              />

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="featured" className="text-xs text-gray-600">
                  注目商品として表示
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition uppercase"
                >
                  {editingProduct ? 'Update' : 'Add'}
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
