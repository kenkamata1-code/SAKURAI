import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, type Order } from '../lib/api-client';
import { updatePassword } from 'aws-amplify/auth';
import { User, Package, Edit2, Save, X, Mail, Lock } from 'lucide-react';

export default function MyAccount() {
  const { profile, user, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    postal_code: '',
    address: '',
    gender: '',
    birth_date: '',
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        phone: profile.phone || '',
        postal_code: profile.postal_code || '',
        address: profile.address || '',
        gender: profile.gender || '',
        birth_date: profile.birth_date || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function fetchOrders() {
    try {
      const ordersData = await api.orders.list();
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
      await api.profile.update({
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
        postal_code: formData.postal_code,
        address: formData.address,
        gender: formData.gender || undefined,
        birth_date: formData.birth_date || undefined,
      });
      await refreshProfile();
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('プロフィールの更新に失敗しました / Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordChange() {
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('すべてのフィールドを入力してください / Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('パスワードが一致しません / Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      alert('パスワードは6文字以上にしてください / Password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);
    try {
      await updatePassword({ oldPassword, newPassword });
      alert('パスワードを更新しました / Password updated successfully');
      setShowPasswordChange(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error updating password:', error);
      alert('パスワードの更新に失敗しました / Failed to update password');
    } finally {
      setUpdatingPassword(false);
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

        <div className="space-y-12">
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
                        first_name: profile?.first_name || '',
                        last_name: profile?.last_name || '',
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider text-gray-500 mb-2">
                    姓 / Last Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                      placeholder="山田 / Yamada"
                    />
                  ) : (
                    <div className="text-sm text-gray-800">{formData.last_name || '未設定 / Not set'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-500 mb-2">
                    名 / First Name
                  </label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                      placeholder="太郎 / Taro"
                    />
                  ) : (
                    <div className="text-sm text-gray-800">{formData.first_name || '未設定 / Not set'}</div>
                  )}
                </div>
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
                            ¥{Math.floor(item.product_price).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-xs tracking-wider text-gray-500">合計金額 / Total</span>
                      <span className="text-lg font-medium text-gray-900">
                        ¥{Math.floor(order.total_amount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl tracking-wider font-light">
                    メールアドレス<br />
                    <span className="text-xs text-gray-500">Email Address</span>
                  </h2>
                </div>

                <div className="border border-gray-200 p-6">
                  <div>
                    <label className="block text-xs tracking-wider text-gray-500 mb-2">
                      登録メールアドレス / Registered Email
                    </label>
                    <div className="text-sm text-gray-800">{profile?.email}</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl tracking-wider font-light">
                    パスワード変更<br />
                    <span className="text-xs text-gray-500">Change Password</span>
                  </h2>
                </div>

                {!showPasswordChange ? (
                  <div className="border border-gray-200 p-6">
                    <div className="mb-4">
                      <label className="block text-xs tracking-wider text-gray-500 mb-2">
                        パスワード / Password
                      </label>
                      <div className="text-sm text-gray-800">••••••••</div>
                    </div>
                    <button
                      onClick={() => setShowPasswordChange(true)}
                      className="w-full px-4 py-2 border border-gray-300 text-xs tracking-wider hover:bg-gray-50 transition"
                    >
                      パスワードを変更 / Change Password
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 p-6 space-y-4">
                    <div>
                      <label className="block text-xs tracking-wider text-gray-500 mb-2">
                        現在のパスワード / Current Password
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                        placeholder="現在のパスワード / Current password"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-wider text-gray-500 mb-2">
                        新しいパスワード / New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                        placeholder="6文字以上 / 6+ characters"
                      />
                    </div>
                    <div>
                      <label className="block text-xs tracking-wider text-gray-500 mb-2">
                        パスワード確認 / Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                        placeholder="もう一度入力 / Re-enter password"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePasswordChange}
                        disabled={updatingPassword}
                        className="flex-1 px-4 py-2 bg-gray-900 text-white text-xs tracking-wider hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        <Save className="w-3 h-3 inline mr-2" strokeWidth={1.5} />
                        更新 / Update
                      </button>
                      <button
                        onClick={() => {
                          setShowPasswordChange(false);
                          setOldPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-xs tracking-wider hover:bg-gray-50 transition"
                      >
                        <X className="w-3 h-3 inline mr-2" strokeWidth={1.5} />
                        キャンセル / Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
