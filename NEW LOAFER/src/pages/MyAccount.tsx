import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { User, Package, Edit2, Save, X } from 'lucide-react';

interface Order {
  id: string;
  total_amount: number;
  status: string;
  shipping_name: string;
  shipping_address: string;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
}

export default function MyAccount() {
  const { profile, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    postal_code: '',
    address: '',
    gender: '',
    birth_date: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        phone: profile.phone || '',
        postal_code: profile.postal_code || '',
        address: profile.address || '',
        gender: profile.gender || '',
        birth_date: profile.birth_date || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    fetchOrders();
  }, [user]);

  async function fetchOrders() {
    if (!user) return;

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile() {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          postal_code: formData.postal_code,
          address: formData.address,
          gender: formData.gender || null,
          birth_date: formData.birth_date || null,
        })
        .eq('id', user.id);

      if (error) throw error;
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('プロフィールの更新に失敗しました / Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: '処理待ち / Pending',
      processing: '処理中 / Processing',
      completed: '完了 / Completed',
      cancelled: 'キャンセル / Cancelled',
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto text-center text-gray-800">
          読み込み中... / Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-3xl md:text-4xl tracking-[0.3em] mb-12 font-light text-center">
          MY ACCOUNT
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl tracking-wider font-light">
                  会員情報<br />
                  <span className="text-xs text-gray-500">Member Information</span>
                </h2>
              </div>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-xs tracking-wider hover:bg-gray-50 transition"
                >
                  <Edit2 className="w-3 h-3" strokeWidth={1.5} />
                  編集 / Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs tracking-wider hover:bg-gray-800 transition disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" strokeWidth={1.5} />
                    保存 / Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        full_name: profile?.full_name || '',
                        phone: profile?.phone || '',
                        postal_code: profile?.postal_code || '',
                        address: profile?.address || '',
                        gender: profile?.gender || '',
                        birth_date: profile?.birth_date || '',
                      });
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-xs tracking-wider hover:bg-gray-50 transition"
                  >
                    <X className="w-3 h-3" strokeWidth={1.5} />
                    キャンセル / Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="border border-gray-200 p-6 space-y-4">
              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  メールアドレス / Email
                </label>
                <div className="text-sm text-gray-800">{profile?.email}</div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  お名前 / Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    placeholder="山田 太郎 / Taro Yamada"
                  />
                ) : (
                  <div className="text-sm text-gray-800">{formData.full_name || '未設定 / Not set'}</div>
                )}
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  電話番号 / Phone
                </label>
                {editing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    placeholder="090-1234-5678"
                  />
                ) : (
                  <div className="text-sm text-gray-800">{formData.phone || '未設定 / Not set'}</div>
                )}
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  郵便番号 / Postal Code
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                    placeholder="123-4567"
                  />
                ) : (
                  <div className="text-sm text-gray-800">{formData.postal_code || '未設定 / Not set'}</div>
                )}
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  住所 / Address
                </label>
                {editing ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none resize-none"
                    rows={3}
                    placeholder="東京都渋谷区... / Tokyo, Shibuya..."
                  />
                ) : (
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{formData.address || '未設定 / Not set'}</div>
                )}
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  性別 / Gender
                </label>
                {editing ? (
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                  >
                    <option value="">選択してください / Please select</option>
                    <option value="male">男性 / Male</option>
                    <option value="female">女性 / Female</option>
                    <option value="other">その他 / Other</option>
                  </select>
                ) : (
                  <div className="text-sm text-gray-800">
                    {formData.gender === 'male' ? '男性 / Male' :
                     formData.gender === 'female' ? '女性 / Female' :
                     formData.gender === 'other' ? 'その他 / Other' : '未設定 / Not set'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-500 mb-2">
                  生年月日 / Birth Date
                </label>
                {editing ? (
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                  />
                ) : (
                  <div className="text-sm text-gray-800">
                    {formData.birth_date ? new Date(formData.birth_date).toLocaleDateString('ja-JP') : '未設定 / Not set'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl tracking-wider font-light">
                購入履歴<br />
                <span className="text-xs text-gray-500">Order History</span>
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="border border-gray-200 p-12 text-center">
                <p className="text-sm text-gray-500">購入履歴はありません / No order history</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">
                          {new Date(order.created_at).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="text-sm font-medium text-gray-800">
                          注文番号 / Order No: {order.id.slice(0, 8)}
                        </div>
                      </div>
                      <div className={`px-3 py-1 text-xs tracking-wider ${
                        order.status === 'completed' ? 'bg-green-50 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {getStatusLabel(order.status)}
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {item.product_name} × {item.quantity}
                          </span>
                          <span className="text-gray-800">
                            ¥{item.product_price.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs tracking-wider text-gray-500">合計金額 / Total</span>
                      <span className="text-lg font-medium text-gray-900">
                        ¥{order.total_amount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
