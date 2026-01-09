import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CartItem, getImageUrl } from '../lib/api-client';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { usePageTracking } from '../hooks/usePageTracking';
import { useAuth } from '../contexts/AuthContext';

export default function Cart() {
  usePageTracking('/cart', 'Cart');

  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        loadCart();
      } else {
        setLoading(false);
      }
    }
  }, [user, authLoading]);

  async function loadCart() {
    try {
      const data = await api.cart.list();
      setCartItems(data || []);
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(id: string, newQuantity: number) {
    if (newQuantity < 1) return;

    try {
      await api.cart.update(id, newQuantity);
      await loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  }

  async function removeItem(id: string) {
    try {
      await api.cart.remove(id);
      await loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  }

  const total = cartItems.reduce(
    (sum, item) => sum + (item.products?.price || 0) * item.quantity,
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-gray-800">読み込み中...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-center text-gray-800 max-w-md mx-auto px-6">
          <ShoppingCart className="w-16 h-16 mx-auto mb-6 opacity-20 text-gray-800" strokeWidth={1} />
          <h2 className="text-2xl tracking-[0.1em] font-light mb-4">
            カートを表示するにはログインが必要です
          </h2>
          <p className="text-sm text-gray-600 mb-8 leading-loose">
            ログインして、お気に入りの商品をカートに追加しましょう
          </p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition uppercase"
          >
            Shop
          </Link>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-center text-gray-800 max-w-md mx-auto px-6">
          <ShoppingCart className="w-16 h-16 mx-auto mb-6 opacity-20 text-gray-800" strokeWidth={1} />
          <h2 className="text-2xl tracking-[0.1em] font-light mb-4">
            カートは空です
          </h2>
          <p className="text-sm text-gray-600 mb-8 leading-loose">
            お気に入りの商品を見つけて、カートに追加しましょう
          </p>
          <Link
            to="/shop"
            className="inline-block px-8 py-3 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition uppercase"
          >
            Shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-12">
            <h1 className="text-2xl md:text-3xl tracking-[0.3em] mb-1 font-light">
              SHOPPING CART
            </h1>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              ショッピングカート
            </p>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              {cartItems.length}点の商品
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              {cartItems.map(item => (
                <div
                  key={item.id}
                  className="border border-gray-200 p-6 flex gap-6"
                >
                  <Link
                    to={`/shop/${item.products?.slug}`}
                    className="flex-shrink-0"
                  >
                    <img
                      src={item.products?.image_url}
                      alt={item.products?.name}
                      className="w-32 h-32 object-cover bg-[#E8E8E8]"
                    />
                  </Link>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <Link
                        to={`/shop/${item.products?.slug}`}
                        className="text-lg tracking-wider font-light text-gray-800 hover:text-gray-600 transition"
                      >
                        {item.products?.name}
                      </Link>
                      {item.product_variants && (
                        <p className="text-xs text-gray-500 mt-1">
                          サイズ: {item.product_variants.size}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-2">
                        ¥{item.products?.price.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                        <span className="w-12 text-center text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 border border-gray-300 hover:bg-gray-100 transition flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" strokeWidth={1.5} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg text-gray-800">
                      ¥{((item.products?.price || 0) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="border border-gray-200 p-6 sticky top-24">
                <h2 className="text-sm tracking-[0.2em] font-light mb-6 uppercase">
                  Order Summary
                </h2>

                <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">小計</span>
                    <span className="text-gray-800">¥{total.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">配送料</span>
                    <span className="text-gray-800">
                      {total >= 10000 ? (
                        <span className="text-green-600">無料</span>
                      ) : (
                        '¥800'
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-lg mb-6">
                  <span className="text-gray-800">合計</span>
                  <span className="text-gray-800">
                    ¥{(total + (total >= 10000 ? 0 : 800)).toLocaleString()}
                  </span>
                </div>

                {total < 10000 && (
                  <p className="text-xs text-gray-600 mb-6 leading-loose">
                    あと¥{(10000 - total).toLocaleString()}で送料無料
                  </p>
                )}

                <button
                  onClick={() => alert('購入機能は実装中です')}
                  className="w-full py-4 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition flex items-center justify-center gap-2 uppercase"
                >
                  Checkout
                  <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <Link
                  to="/shop"
                  className="block text-center mt-4 text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  買い物を続ける
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
