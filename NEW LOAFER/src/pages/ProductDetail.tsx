import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase, Product } from '../lib/supabase';
import { ShoppingCart, ArrowLeft, Plus, Minus } from 'lucide-react';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [slug]);

  async function loadProduct() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addToCart() {
    setAddingToCart(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('カートに追加するにはログインが必要です');
        return;
      }

      if (!product) return;

      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingItem) {
        await supabase
          .from('cart_items')
          .update({
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity
          });
      }

      alert('カートに追加しました');
      navigate('/cart');
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('カートへの追加に失敗しました');
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-gray-800">読み込み中...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-center text-gray-800">
          <h2 className="text-2xl mb-4 font-light">商品が見つかりませんでした</h2>
          <Link to="/shop" className="text-gray-600 hover:text-gray-900 underline text-sm">
            ショップに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-12 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            ショップに戻る
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="aspect-square bg-[#E8E8E8] overflow-hidden">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-8">
              {product.categories && (
                <span className="inline-block px-3 py-1 border border-gray-300 text-xs tracking-wider">
                  {product.categories.name}
                </span>
              )}

              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl tracking-[0.1em] font-light text-gray-800">
                  {product.name}
                </h1>
                <p className="text-2xl text-gray-800">
                  ¥{product.price.toLocaleString()}
                </p>
              </div>

              <div className="border-t border-b border-gray-200 py-8">
                <p className="text-sm text-gray-600 leading-loose">
                  {product.description}
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">在庫:</span>
                  {product.stock > 0 ? (
                    <span className="text-green-600">在庫あり / In Stock ({product.stock}点)</span>
                  ) : (
                    <span className="text-red-600">売り切れ</span>
                  )}
                </div>

                {product.stock > 0 && (
                  <>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">数量:</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-8 h-8 border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                        <span className="w-12 text-center">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                          className="w-8 h-8 border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={addToCart}
                      disabled={addingToCart}
                      className="w-full py-4 bg-gray-900 text-white text-sm tracking-[0.2em] hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-50 uppercase"
                    >
                      <ShoppingCart className="w-4 h-4" strokeWidth={1.5} />
                      {addingToCart ? 'Adding to cart...' : 'Add to cart'}
                    </button>
                  </>
                )}
              </div>

              <div className="border border-gray-200 p-6 space-y-4">
                <h3 className="text-sm tracking-[0.2em] font-light uppercase">Shipping</h3>
                <div className="space-y-2 text-xs text-gray-600 leading-loose">
                  <p>全国送料無料（¥10,000以上のご注文）</p>
                  <p>ご注文から3-5営業日でお届け</p>
                  <p>返品・交換: 商品到着後14日以内</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
