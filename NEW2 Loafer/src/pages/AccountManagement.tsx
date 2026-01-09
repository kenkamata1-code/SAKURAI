import { useState, useEffect } from 'react';
import { api, type Profile } from '../lib/api-client';
import { apiConfig } from '../lib/aws-config';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Users, Shield, ShieldOff, Search, UserPlus, X, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function AccountManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    is_admin: false,
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${apiConfig.baseUrl}/admin/profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch profiles');
      
      const data = await response.json();
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdminStatus(profileId: string, currentStatus: boolean) {
    setUpdating(profileId);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${apiConfig.baseUrl}/admin/profiles/${profileId}/admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_admin: !currentStatus }),
      });

      if (!response.ok) throw new Error('Failed to update admin status');

      setProfiles(profiles.map(p =>
        p.id === profileId ? { ...p, is_admin: !currentStatus } : p
      ));
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('管理者権限の変更に失敗しました');
    } finally {
      setUpdating(null);
    }
  }

  async function deleteUser(profileId: string, email: string) {
    if (!confirm(`${email} を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('認証が必要です');
      }

      const response = await fetch(`${apiConfig.baseUrl}/admin/profiles/${profileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setProfiles(profiles.filter(p => p.id !== profileId));
      alert('ユーザーを削除しました');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('ユーザーの削除に失敗しました');
    }
  }

  async function createUser() {
    if (!newUser.email || !newUser.password) {
      alert('メールアドレスとパスワードは必須です');
      return;
    }

    setCreating(true);
    try {
      await api.admin.createUser(newUser);

      alert('ユーザーを作成しました');
      setShowAddModal(false);
      setNewUser({ email: '', password: '', full_name: '', is_admin: false });
      await fetchProfiles();
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error instanceof Error ? error.message : 'ユーザーの作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  function exportToExcel() {
    const exportData = profiles.map((profile) => ({
      'メールアドレス': profile.email,
      '姓': profile.last_name || '',
      '名': profile.first_name || '',
      '電話番号': profile.phone || '',
      '郵便番号': profile.postal_code || '',
      '住所': profile.address || '',
      '性別': profile.gender === 'male' ? '男性' : profile.gender === 'female' ? '女性' : profile.gender === 'other' ? 'その他' : '',
      '生年月日': profile.birth_date || '',
      '管理者': profile.is_admin ? 'はい' : 'いいえ',
      '登録日': new Date(profile.created_at).toLocaleDateString('ja-JP'),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'アカウント情報');

    const colWidths = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
    ];
    ws['!cols'] = colWidths;

    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `アカウント情報_${date}.xlsx`);
  }

  const filteredProfiles = profiles.filter(profile =>
    profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.first_name && profile.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (profile.last_name && profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto text-center text-gray-800">
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 border border-gray-300 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl tracking-[0.3em] font-light">
                ACCOUNT MANAGEMENT
              </h1>
              <p className="text-xs tracking-[0.15em] text-gray-500 mt-1">
                アカウント管理 / User Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToExcel}
              disabled={profiles.length === 0}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-xs tracking-wider hover:bg-gray-50 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              エクセルエクスポート
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-xs tracking-wider hover:bg-gray-800 transition"
            >
              <UserPlus className="w-4 h-4" strokeWidth={1.5} />
              ユーザーを追加
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="メールアドレスまたは名前で検索"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs tracking-wider text-gray-600 uppercase">
                    ユーザー情報
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-wider text-gray-600 uppercase">
                    登録日
                  </th>
                  <th className="px-6 py-4 text-left text-xs tracking-wider text-gray-600 uppercase">
                    権限
                  </th>
                  <th className="px-6 py-4 text-right text-xs tracking-wider text-gray-600 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-gray-500">
                      {searchTerm ? '該当するユーザーが見つかりません' : 'ユーザーが登録されていません'}
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((profile) => (
                    <tr key={profile.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {profile.last_name && profile.first_name
                              ? `${profile.last_name} ${profile.first_name}`
                              : '未設定'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {profile.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">
                          {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {profile.is_admin ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-900 text-white text-xs tracking-wider">
                            <Shield className="w-3 h-3" strokeWidth={1.5} />
                            管理者
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-600 text-xs tracking-wider">
                            一般ユーザー
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleAdminStatus(profile.id, profile.is_admin)}
                            disabled={updating === profile.id}
                            className={`inline-flex items-center gap-2 px-4 py-2 text-xs tracking-wider border transition disabled:opacity-50 ${
                              profile.is_admin
                                ? 'border-red-300 text-red-700 hover:bg-red-50'
                                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {profile.is_admin ? (
                              <>
                                <ShieldOff className="w-3 h-3" strokeWidth={1.5} />
                                管理者権限を解除
                              </>
                            ) : (
                              <>
                                <Shield className="w-3 h-3" strokeWidth={1.5} />
                                管理者権限を付与
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => deleteUser(profile.id, profile.email)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-xs tracking-wider border border-red-300 text-red-700 hover:bg-red-50 transition"
                            title="ユーザーを削除"
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Shield className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
            </div>
            <div className="text-xs text-gray-600 leading-relaxed">
              <p className="font-medium mb-2">管理者権限について</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>管理者は商品管理、スタイリング管理、アカウント管理にアクセスできます</li>
                <li>管理者は他のユーザーに管理者権限を付与・解除できます</li>
                <li>最初に登録したユーザーは自動的に管理者権限が付与されます</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl tracking-[0.2em] font-light">ユーザーを追加</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                  メールアドレス *
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="user@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                  パスワード *
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="8文字以上"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">最低8文字のパスワードを設定してください</p>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                  氏名
                </label>
                <input
                  type="text"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 text-sm focus:border-gray-900 focus:outline-none"
                  placeholder="山田太郎"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={newUser.is_admin}
                  onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_admin" className="text-sm text-gray-700">
                  管理者権限を付与する
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-6 py-3 border border-gray-300 text-sm tracking-wider hover:bg-gray-50 transition"
              >
                キャンセル
              </button>
              <button
                onClick={createUser}
                disabled={creating}
                className="flex-1 px-6 py-3 bg-gray-900 text-white text-sm tracking-wider hover:bg-gray-800 transition disabled:opacity-50"
              >
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
