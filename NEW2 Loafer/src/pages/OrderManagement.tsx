import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api, type Order } from '../lib/api-client';
import { Package, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function OrderManagement() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (!authLoading) {
      if (!user || !isAdmin) {
        navigate('/login');
        return;
      }
      fetchOrders();
    }
  }, [user, isAdmin, authLoading, navigate]);

  async function fetchOrders() {
    try {
      const ordersData = await api.admin.listOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      await api.admin.updateOrderStatus(orderId, newStatus);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('注文ステータスの更新に失敗しました。');
    }
  }

  function toggleOrderExpansion(orderId: string) {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  }

  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  function getStatusBadge(status: string) {
    const statusConfig = {
      pending: { label: '未処理', className: 'bg-yellow-100 text-yellow-800' },
      processing: { label: '処理中', className: 'bg-blue-100 text-blue-800' },
      shipped: { label: '発送済み', className: 'bg-green-100 text-green-800' },
      completed: { label: '完了', className: 'bg-gray-100 text-gray-800' },
      cancelled: { label: 'キャンセル', className: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-3 py-1 text-xs tracking-wider ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto text-center py-12 text-gray-500">
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
            <h1 className="text-3xl tracking-wider font-light">注文管理</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 text-xs tracking-wider border transition ${
                filterStatus === 'all'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              全て
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 text-xs tracking-wider border transition ${
                filterStatus === 'pending'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              未処理
            </button>
            <button
              onClick={() => setFilterStatus('shipped')}
              className={`px-4 py-2 text-xs tracking-wider border transition ${
                filterStatus === 'shipped'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              発送済み
            </button>
            <button
              onClick={() => setFilterStatus('completed')}
              className={`px-4 py-2 text-xs tracking-wider border transition ${
                filterStatus === 'completed'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              完了
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border border-gray-200">
            注文がありません
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="border border-gray-200">
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => toggleOrderExpansion(order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">注文日時</p>
                        <p className="text-sm tracking-wider">
                          {new Date(order.created_at).toLocaleString('ja-JP')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">顧客</p>
                        <p className="text-sm tracking-wider">{order.shipping_name}</p>
                        <p className="text-xs text-gray-400">{order.user_email}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">商品数</p>
                        <p className="text-sm tracking-wider">
                          {order.order_items.reduce((sum, item) => sum + item.quantity, 0)} 点
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">合計金額</p>
                        <p className="text-sm tracking-wider">¥{order.total_amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">ステータス</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="ml-4">
                      {expandedOrders.has(order.id) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {expandedOrders.has(order.id) && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <div className="grid grid-cols-2 gap-8 mb-6">
                      <div>
                        <h3 className="text-sm tracking-wider font-medium mb-4">配送先情報</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-500">名前:</span> {order.shipping_name}</p>
                          <p><span className="text-gray-500">郵便番号:</span> {order.shipping_postal_code}</p>
                          <p><span className="text-gray-500">住所:</span> {order.shipping_address}</p>
                          <p><span className="text-gray-500">電話番号:</span> {order.shipping_phone}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm tracking-wider font-medium mb-4">注文商品</h3>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>{item.product_name} × {item.quantity}</span>
                              <span>¥{(item.product_price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      {order.status === 'pending' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'processing');
                            }}
                            className="px-4 py-2 text-xs tracking-wider border border-gray-900 bg-gray-900 text-white hover:bg-gray-800 transition"
                          >
                            処理中にする
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'shipped');
                            }}
                            className="px-4 py-2 text-xs tracking-wider border border-green-600 bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            発送完了
                          </button>
                        </>
                      )}
                      {order.status === 'processing' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOrderStatus(order.id, 'shipped');
                          }}
                          className="px-4 py-2 text-xs tracking-wider border border-green-600 bg-green-600 text-white hover:bg-green-700 transition flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          発送完了
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateOrderStatus(order.id, 'completed');
                          }}
                          className="px-4 py-2 text-xs tracking-wider border border-gray-900 bg-gray-900 text-white hover:bg-gray-800 transition flex items-center gap-2"
                        >
                          <Check className="w-4 h-4" />
                          完了にする
                        </button>
                      )}
                      {order.status !== 'cancelled' && order.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('この注文をキャンセルしますか？')) {
                              updateOrderStatus(order.id, 'cancelled');
                            }
                          }}
                          className="px-4 py-2 text-xs tracking-wider border border-red-600 text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          キャンセル
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
