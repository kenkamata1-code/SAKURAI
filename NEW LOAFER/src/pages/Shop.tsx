import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, Product, Category } from '../lib/supabase';
import { ShoppingCart, Filter } from 'lucide-react';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from('products').select('*, categories(*)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name')
      ]);

      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-gray-800">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <h1 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              ONLINE SHOP
            </h1>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="lg:w-64 flex-shrink-0">
              <div className="border border-gray-200 p-6 sticky top-24">
                <div className="flex items-center gap-2 mb-6">
                  <Filter className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
                  <h2 className="text-sm tracking-[0.2em] font-light uppercase">Category</h2>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      selectedCategory === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    すべて
                  </button>
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-2 text-sm transition ${
                        selectedCategory === category.id
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <div className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map(product => (
                  <Link
                    key={product.id}
                    to={`/shop/${product.slug}`}
                    className="group block"
                  >
                    <div className="aspect-square overflow-hidden bg-[#E8E8E8] mb-4">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm tracking-wider font-light text-gray-800">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-gray-800">
                          ¥{product.price.toLocaleString()}
                        </span>
                        {product.stock > 0 ? (
                          <span className="text-xs text-green-600">在庫あり / In Stock</span>
                        ) : (
                          <span className="text-xs text-red-600">売り切れ</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-20 text-gray-500">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" strokeWidth={1} />
                  <p className="text-sm">商品が見つかりませんでした</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
