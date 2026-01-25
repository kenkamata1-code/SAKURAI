import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { api } from '../lib/api-client';
import { formatPrice } from '../lib/format';
import { trackPurchase } from '../lib/gtm';

interface OrderDetails {
  status: string;
  customerEmail: string;
  amountTotal: number;
  shippingDetails: {
    name?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  } | null;
}

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasPurchaseTracked = useRef(false);

  useEffect(() => {
    if (sessionId) {
      loadOrderDetails();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  // 購入完了時のGA4トラッキング（重複防止）
  useEffect(() => {
    if (orderDetails && sessionId && !hasPurchaseTracked.current) {
      // sessionStorageで重複チェック
      const purchaseKey = `purchase_tracked_${sessionId}`;
      const alreadyTracked = sessionStorage.getItem(purchaseKey);
      
      if (!alreadyTracked) {
        hasPurchaseTracked.current = true;
        
        // 購入イベントをトラッキング
        // Note: 注文詳細にitemsがある場合はそれを使用、なければ金額のみで計測
        trackPurchase(
          sessionId,
          [{
            item_id: 'order',
            item_name: 'Order',
            price: orderDetails.amountTotal,
            quantity: 1,
          }],
          0, // shipping
          0  // tax
        );
        
        sessionStorage.setItem(purchaseKey, 'true');
      }
    }
  }, [orderDetails, sessionId]);

  async function loadOrderDetails() {
    try {
      const details = await api.checkout.getSession(sessionId!);
      setOrderDetails(details);
    } catch (err) {
      console.error('Error loading order details:', err);
      setError('注文情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-gray-600 text-sm tracking-wider">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link
            to="/"
            className="text-gray-600 hover:text-gray-900 underline text-sm"
          >
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-lg mx-auto">
        {/* 成功アイコン */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" strokeWidth={1.5} />
          </div>
          
          <h1 className="text-2xl tracking-[0.2em] mb-2 font-light">
            ORDER COMPLETE
          </h1>
          <p className="text-sm text-gray-600 tracking-wider">
            ご注文ありがとうございます
          </p>
        </div>

        {/* 注文詳細 */}
        {orderDetails && (
          <div className="border border-gray-200 mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xs tracking-[0.15em] text-gray-500 uppercase">
                Order Details / 注文詳細
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">合計金額 / Total</span>
                <span className="text-lg font-light">
                  ¥{formatPrice(orderDetails.amountTotal)}
                </span>
              </div>
              
              <div className="flex justify-between items-start">
                <span className="text-sm text-gray-600">メールアドレス / Email</span>
                <span className="text-sm text-right">
                  {orderDetails.customerEmail}
                </span>
              </div>

              {orderDetails.shippingDetails?.address && (
                <div className="pt-4 border-t border-gray-100">
                  <span className="text-sm text-gray-600 block mb-2">
                    配送先 / Shipping Address
                  </span>
                  <div className="text-sm">
                    <p>{orderDetails.shippingDetails.name}</p>
                    <p>〒{orderDetails.shippingDetails.address.postal_code}</p>
                    <p>
                      {orderDetails.shippingDetails.address.state}
                      {orderDetails.shippingDetails.address.city}
                      {orderDetails.shippingDetails.address.line1}
                    </p>
                    {orderDetails.shippingDetails.address.line2 && (
                      <p>{orderDetails.shippingDetails.address.line2}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* お知らせ */}
        <div className="bg-gray-50 p-6 mb-8">
          <div className="flex items-start gap-4">
            <Package className="w-5 h-5 text-gray-400 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm text-gray-800 mb-2">
                ご注文確認メールをお送りしました。
              </p>
              <p className="text-xs text-gray-600">
                商品の発送準備が整い次第、発送のご連絡をいたします。
                <br />
                通常3〜7営業日以内にお届けいたします。
              </p>
            </div>
          </div>
        </div>

        {/* ボタン */}
        <div className="space-y-3">
          <Link
            to="/myaccount"
            className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 text-sm tracking-wider hover:bg-gray-800 transition"
          >
            注文履歴を確認 / VIEW ORDERS
            <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
          </Link>
          
          <Link
            to="/shop"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-800 py-4 text-sm tracking-wider hover:bg-gray-50 transition"
          >
            買い物を続ける / CONTINUE SHOPPING
          </Link>
        </div>
      </div>
    </div>
  );
}

