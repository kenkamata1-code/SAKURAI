import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Product, ProductImage, ProductVariant } from '../lib/api-client';
import { Plus, Edit2, Trash2, X, Package, ArrowUp, ArrowDown } from 'lucide-react';
import ImageUpload from '../components/ImageUpload';

interface LocalProductVariant {
  id?: string;
  size: string;
  stock: number;
  sku: string;
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    image_url: '',
    category: '' as '' | 'shoes' | 'accessory',
    stock: '',
    featured: false
  });
  const [additionalImages, setAdditionalImages] = useState<string[]>(['', '', '', '', '']);
  const [variants, setVariants] = useState<LocalProductVariant[]>([]);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const productsData = await api.products.list();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
    }
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
        category: product.category || '',
        stock: product.stock.toString(),
        featured: product.featured
      });

      const images = product.product_images?.sort((a, b) => a.display_order - b.display_order) || [];
      const imageUrls = Array(5).fill('');
      images.forEach((img, idx) => {
        if (idx < 5) imageUrls[idx] = img.url;
      });
      setAdditionalImages(imageUrls);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        price: '',
        image_url: '',
        category: '',
        stock: '',
        featured: false
      });
      setAdditionalImages(['', '', '', '', '']);
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
      category: formData.category || null,
      stock: parseInt(formData.stock),
      featured: formData.featured,
    };

    try {
      let productId = editingProduct?.id;

      if (editingProduct) {
        await api.admin.updateProduct(editingProduct.id, productData);
      } else {
        const newProduct = await api.admin.createProduct(productData);
        productId = newProduct?.id;
      }

      // 画像の更新
      if (productId) {
        // 既存の画像を削除
        const existingImages = await api.admin.listProductImages(productId);
        for (const img of existingImages) {
          await api.admin.deleteProductImage(img.id);
        }

        // 新しい画像を追加
        for (let i = 0; i < additionalImages.length; i++) {
          const url = additionalImages[i];
          if (url.trim() !== '') {
            await api.admin.createProductImage(productId, { url, display_order: i + 1 });
          }
        }
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
      await api.admin.deleteProduct(id);
      await loadData();
      alert('商品を削除しました');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('削除に失敗しました');
    }
  }

  async function moveProduct(index: number, direction: 'up' | 'down') {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === products.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const product1 = products[index];
    const product2 = products[newIndex];

    try {
      await api.admin.updateProduct(product1.id, { display_order: product2.display_order });
      await api.admin.updateProduct(product2.id, { display_order: product1.display_order });
      await loadData();
    } catch (error) {
      console.error('Error moving product:', error);
      alert('順番の変更に失敗しました');
    }
  }

  async function openVariantModal(product: Product) {
    setVariantProduct(product);

    try {
      const data = await api.admin.listProductVariants(product.id);
      setVariants(data.map(v => ({ id: v.id, size: v.size, stock: v.stock, sku: v.sku || '' })));
    } catch (error) {
      console.error('Error loading variants:', error);
      setVariants([]);
    }
    setShowVariantModal(true);
  }

  function closeVariantModal() {
    setShowVariantModal(false);
    setVariantProduct(null);
    setVariants([]);
  }

  function addVariant() {
    setVariants([...variants, { size: '', stock: 0, sku: '' }]);
  }

  function updateVariant(index: number, field: keyof LocalProductVariant, value: string | number) {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  }

  function removeVariant(index: number) {
    const updated = variants.filter((_, i) => i !== index);
    setVariants(updated);
  }

  async function saveVariants() {
    if (!variantProduct) return;

    try {
      // 既存のバリエーションを削除
      const existingVariants = await api.admin.listProductVariants(variantProduct.id);
      for (const v of existingVariants) {
        await api.admin.deleteProductVariant(v.id);
      }

      // 新しいバリエーションを追加
      const variantsToInsert = variants.filter(v => v.size.trim() !== '');

      for (const v of variantsToInsert) {
        await api.admin.createProductVariant(variantProduct.id, {
          size: v.size,
          stock: v.stock,
          sku: v.sku || undefined
        });
      }

      await loadData();
      closeVariantModal();
      alert('バリアントを保存しました');
    } catch (error) {
      console.error('Error saving variants:', error);
      alert('保存に失敗しました');
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
                    <th className="text-left p-4 text-xs font-light tracking-wider text-gray-600 uppercase">順番</th>
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
                  {products.map((product, index) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveProduct(index, 'up')}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-100 transition text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上へ移動"
                          >
                            <ArrowUp className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => moveProduct(index, 'down')}
                            disabled={index === products.length - 1}
                            className="p-1 hover:bg-gray-100 transition text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下へ移動"
                          >
                            <ArrowDown className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                      <td className="p-4">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 object-cover bg-[#E8E8E8]"
                        />
                      </td>
                      <td className="p-4 text-sm text-gray-800">{product.name}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {product.category === 'shoes' ? 'Shoes' : product.category === 'accessory' ? 'Accessory' : '-'}
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
                            onClick={() => openVariantModal(product)}
                            className="p-2 hover:bg-blue-50 transition text-blue-600"
                            title="サイズ・在庫管理"
                          >
                            <Package className="w-4 h-4" strokeWidth={1.5} />
                          </button>
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
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">カテゴリー *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as 'shoes' | 'accessory' })}
                  className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="shoes">Shoes</option>
                  <option value="accessory">Accessory</option>
                </select>
              </div>

              <ImageUpload
                value={formData.image_url}
                onChange={(url) => setFormData({ ...formData, image_url: url })}
                label="メイン画像 / Main Image *"
              />

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-3 uppercase">
                  追加画像・動画 / Additional Images & Videos (最大5枚)
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

      {showVariantModal && variantProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl tracking-[0.1em] font-light">サイズ・在庫管理</h2>
                <p className="text-sm text-gray-500 mt-1">{variantProduct.name}</p>
              </div>
              <button
                onClick={closeVariantModal}
                className="p-2 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4 mb-6">
                {variants.map((variant, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">サイズ</label>
                      <input
                        type="text"
                        value={variant.size}
                        onChange={(e) => updateVariant(index, 'size', e.target.value)}
                        placeholder="S, M, L, 24, 25, etc."
                        className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-xs text-gray-600 mb-1">在庫数</label>
                      <input
                        type="number"
                        value={variant.stock}
                        onChange={(e) => updateVariant(index, 'stock', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600 mb-1">SKU (任意)</label>
                      <input
                        type="text"
                        value={variant.sku}
                        onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                        placeholder="SKU-001"
                        className="w-full px-4 py-2 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeVariant(index)}
                      className="mt-6 p-2 text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addVariant}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-xs tracking-wider hover:bg-gray-50 transition"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
                サイズを追加
              </button>

              <div className="flex gap-4 pt-6 mt-6 border-t border-gray-200">
                <button
                  onClick={saveVariants}
                  className="flex-1 py-3 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition uppercase"
                >
                  Save
                </button>
                <button
                  onClick={closeVariantModal}
                  className="flex-1 py-3 border border-gray-300 text-xs tracking-[0.2em] hover:bg-gray-100 transition uppercase"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
