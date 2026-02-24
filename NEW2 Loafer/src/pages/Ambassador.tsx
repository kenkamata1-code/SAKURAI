import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Twitter, ExternalLink } from 'lucide-react';

interface AmbassadorData {
  id: string;
  name: string;
  profile_image: string | null;
  bio_jp: string;
  bio_en: string;
  activities_jp: string[];
  activities_en: string[];
  social_links: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
}

export default function Ambassador() {
  const [ambassadors, setAmbassadors] = useState<AmbassadorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/content/ambassadors.json')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: AmbassadorData[]) => { setAmbassadors(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダーバナー */}
      <div className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-3">COMMUNITY</p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-[0.15em] mb-2">AMBASSADOR</h1>
          <p className="text-sm text-gray-400">アンバサダー</p>
        </div>
      </div>

      {/* パンくずリスト */}
      <div className="border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400 tracking-wider">
          <Link to="/" className="hover:text-gray-700 transition-colors">HOME</Link>
          <span>/</span>
          <span className="text-gray-600">AMBASSADOR</span>
        </div>
      </div>

      {/* リード文 */}
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-sm text-gray-500 leading-relaxed max-w-2xl mx-auto">
          革靴とファッションへの深い情熱を持つ方々が、The Long Game のアンバサダーとして活動しています。
          彼らのリアルな視点からのスタイリング提案や、AIレコメンド機能の活用法をご紹介します。
        </p>
      </div>

      {/* コンテンツ */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin" />
          </div>
        )}
        {error && (
          <div className="text-center py-24">
            <p className="text-gray-400 text-sm">コンテンツを読み込めませんでした</p>
          </div>
        )}
        {!loading && !error && ambassadors.map((ambassador, index) => (
          <div
            key={ambassador.id}
            className={`flex flex-col md:flex-row gap-10 mb-20 pb-20 ${
              index < ambassadors.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            {/* プロフィール画像 */}
            <div className="flex-shrink-0 w-full md:w-56">
              <div className="aspect-square bg-gray-100 overflow-hidden flex items-center justify-center">
                {ambassador.profile_image ? (
                  <img
                    src={ambassador.profile_image}
                    alt={ambassador.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // 画像読み込みエラー時はプレースホルダー表示
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  // 画像なしのプレースホルダー
                  <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>

              {/* SNSリンク */}
              <div className="flex gap-3 mt-4">
                {ambassador.social_links.instagram && (
                  <a
                    href={ambassador.social_links.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all group"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                )}
                {ambassador.social_links.twitter && (
                  <a
                    href={ambassador.social_links.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all group"
                    aria-label="X (Twitter)"
                  >
                    <Twitter className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                )}
                {ambassador.social_links.website && (
                  <a
                    href={ambassador.social_links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border border-gray-200 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all group"
                    aria-label="Website"
                  >
                    <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                  </a>
                )}
              </div>
            </div>

            {/* プロフィール情報 */}
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-2 uppercase">Ambassador</p>
              <h2 className="text-2xl font-light tracking-wider mb-6">{ambassador.name}</h2>

              <p className="text-sm text-gray-600 leading-relaxed mb-8">{ambassador.bio_jp}</p>

              {/* 活動内容 */}
              <div>
                <p className="text-[10px] tracking-[0.3em] text-gray-400 mb-4 uppercase">Activities</p>
                <ul className="space-y-2">
                  {ambassador.activities_jp.map((activity, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      {activity}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}

        {/* アンバサダー募集 */}
        <div className="border border-gray-200 p-10 text-center mt-4">
          <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-4">JOIN US</p>
          <h3 className="text-lg font-light tracking-wider mb-4">アンバサダー募集</h3>
          <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-6">
            The Long Game では、革靴とファッションに情熱を持つアンバサダーを募集しています。
            ご興味のある方はお問い合わせください。
          </p>
          <Link
            to="/contact"
            className="inline-block px-8 py-3 bg-gray-900 text-white text-xs tracking-widest hover:bg-gray-800 transition-colors"
          >
            CONTACT
          </Link>
        </div>
      </div>
    </div>
  );
}
