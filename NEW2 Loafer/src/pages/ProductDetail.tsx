import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, type Product, type ProductVariant, getImageUrl } from '../lib/api-client';
import { ShoppingCart, ArrowLeft, Plus, Minus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { trackViewItem, trackAddToCart } from '../lib/gtm';

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const hasTrackedViewItem = useRef(false);

  useEffect(() => {
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  // 商品詳細が読み込まれたらGA4にトラッキング
  useEffect(() => {
    if (product && !hasTrackedViewItem.current) {
      hasTrackedViewItem.current = true;
      trackViewItem({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || undefined,
        item_variant: selectedVariant?.size,
        price: product.price,
      });
    }
  }, [product, selectedVariant]);

  async function loadProduct() {
    try {
      const data = await api.products.get(slug!);
      setProduct(data);

      if (data && data.product_variants && data.product_variants.length > 0) {
        setVariants(data.product_variants);
        const firstAvailable = data.product_variants.find(v => v.stock > 0);
        if (firstAvailable) {
          setSelectedVariant(firstAvailable);
        }
      }
    } catch (error) {
      console.error('Error loading product:', error);
    } finally {
      setLoading(false);
    }
  }

  const allImages = product ? [
    product.image_url,
    ...(product.product_images?.sort((a, b) => a.display_order - b.display_order).map(img => img.url) || [])
  ].filter(url => url) : [];

  async function addToCart() {
    if (!selectedVariant) {
      alert('サイズを選択してください');
      return;
    }

    if (!user) {
      alert('カートに追加するにはログインが必要です');
      navigate('/login');
      return;
    }

    if (!product) return;

    setAddingToCart(true);
    try {
      await api.cart.add(product.id, selectedVariant.id, quantity);
      
      // GA4 カート追加トラッキング
      trackAddToCart({
        item_id: product.id,
        item_name: product.name,
        item_category: product.category || undefined,
        item_variant: selectedVariant.size,
        price: product.price,
      }, quantity);
      
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
            <div className="space-y-4">
              <div className="aspect-square bg-[#E8E8E8] overflow-hidden">
                <img
                  src={allImages[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {allImages.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square bg-[#E8E8E8] overflow-hidden border-2 transition ${
                        selectedImageIndex === index ? 'border-gray-900' : 'border-transparent hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-8">
              {product.category && (
                <span className="inline-block px-3 py-1 border border-gray-300 text-xs tracking-wider uppercase">
                  {product.category === 'shoes' ? 'Shoes' : 'Accessory'}
                </span>
              )}

              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl tracking-[0.1em] font-light text-gray-800">
                  {product.name}
                </h1>
                <p className="text-2xl text-gray-800">
                  ¥{Math.floor(product.price).toLocaleString()}
                </p>
              </div>

              <div className="border-t border-b border-gray-200 py-8">
                <p className="text-sm text-gray-600 leading-loose">
                  {product.description}
                </p>
              </div>

              <div className="space-y-6">
                {variants.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-sm text-gray-500">サイズ / Size</label>
                    <div className="grid grid-cols-4 gap-2">
                      {variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => {
                            setSelectedVariant(variant);
                            setQuantity(1);
                          }}
                          disabled={variant.stock === 0}
                          className={`py-3 text-sm border transition ${
                            selectedVariant?.id === variant.id
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : variant.stock === 0
                              ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                              : 'border-gray-300 hover:border-gray-900'
                          }`}
                        >
                          {variant.size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedVariant && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">在庫:</span>
                    {selectedVariant.stock > 0 ? (
                      <span className="text-green-600">在庫あり / In Stock ({selectedVariant.stock}点)</span>
                    ) : (
                      <span className="text-red-600">売り切れ</span>
                    )}
                  </div>
                )}

                {selectedVariant && selectedVariant.stock > 0 && (
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
                          onClick={() => setQuantity(Math.min(selectedVariant.stock, quantity + 1))}
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

                {variants.length === 0 && (
                  <div className="text-sm text-gray-500">
                    このアイテムは現在在庫がありません
                  </div>
                )}
              </div>

              <div className="border border-gray-200 p-6 space-y-4">
                <h3 className="text-sm tracking-[0.2em] font-light uppercase">Shipping</h3>
                <div className="space-y-2 text-xs text-gray-600 leading-loose">
                  <p>全国送料無料（¥10,000以上のご注文）</p>
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
