import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Shield, ShieldOff, Search } from 'lucide-react';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
}

export default function AccountManagement() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function fetchProfiles() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
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
      const { error } = await supabase
        .from('profiles')
        .update({ is_admin: !currentStatus })
        .eq('id', profileId);

      if (error) throw error;

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

  const filteredProfiles = profiles.filter(profile =>
    profile.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.full_name && profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
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
                            {profile.full_name || '未設定'}
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
    </div>
  );
}
