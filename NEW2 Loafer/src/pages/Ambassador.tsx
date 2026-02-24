import { useState } from 'react';
import { Link } from 'react-router-dom';
// Vite の JSON インポートでバンドル時に組み込む（fetchしない）
import ambassadorsData from '../content/ambassadors.json';

// -------------------- 型定義 --------------------
interface WorkEntry {
  year: string;
  title: string;
  note: string;
}

interface AmbassadorData {
  id: string;
  name_jp: string;
  name_en: string;
  profile_image: string | null;
  profile: {
    birth: string;
    height: string;
    measurements: string;
    shoe_size: string;
    education: string;
  };
  bio_jp: string;
  bio_en: string;
  skills: string[];
  licenses: string[];
  hobbies: string[];
  works: {
    stage: WorkEntry[];
    film: WorkEntry[];
    drama: WorkEntry[];
    cm: string[];
    others: string[];
  };
  social_links: Record<string, string>;
}

// -------------------- サブコンポーネント --------------------
function SectionTitle({ en, ja }: { en: string; ja: string }) {
  return (
    <div className="mb-8 border-b border-gray-200 pb-4">
      <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-1">{en}</p>
      <h3 className="text-sm font-medium tracking-wider text-gray-800">{ja}</h3>
    </div>
  );
}

function WorkTable({ entries }: { entries: WorkEntry[] }) {
  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-4 text-xs leading-relaxed border-b border-gray-50 pb-3">
          <span className="flex-shrink-0 text-gray-400 w-10">{entry.year}</span>
          <div>
            <p className="text-gray-700">{entry.title}</p>
            {entry.note && <p className="text-gray-400 mt-0.5">{entry.note}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

// -------------------- メインコンポーネント --------------------
export default function Ambassador() {
  // JSON はビルド時にバンドル済み
  const ambassadors = ambassadorsData as AmbassadorData[];
  const [activeTab, setActiveTab] = useState<'stage' | 'film' | 'drama' | 'cm'>('film');

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダーバナー */}
      <div className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-3">COMMUNITY</p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-[0.15em] mb-2">AMBASSADOR</h1>
          <p className="text-sm text-gray-400">アンバサダー</p>
        </div>
      </div>

      {/* パンくず */}
      <div className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400 tracking-wider">
          <Link to="/" className="hover:text-gray-700 transition-colors">HOME</Link>
          <span>/</span>
          <span className="text-gray-600">AMBASSADOR</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        {ambassadors.map((amb) => (
          <div key={amb.id}>
            {/* ==================== ヒーロー ==================== */}
            <div className="grid md:grid-cols-2 gap-0 mb-16 mt-12">
              {/* 写真 */}
              <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                {amb.profile_image ? (
                  <img
                    src={amb.profile_image}
                    alt={amb.name_jp}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 名前・基本情報 */}
              <div className="bg-gray-50 p-10 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] tracking-[0.5em] text-gray-400 mb-4">AMBASSADOR</p>
                  <h2 className="text-3xl font-light tracking-wider mb-1">{amb.name_jp}</h2>
                  <p className="text-xs tracking-[0.3em] text-gray-500 mb-10">{amb.name_en}</p>

                  <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                    <div className="flex gap-4">
                      <span className="text-gray-400 w-16 flex-shrink-0">生年月日</span>
                      <span>{amb.profile.birth}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-gray-400 w-16 flex-shrink-0">身長</span>
                      <span>{amb.profile.height}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-gray-400 w-16 flex-shrink-0">スリーサイズ</span>
                      <span>{amb.profile.measurements}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-gray-400 w-16 flex-shrink-0">靴サイズ</span>
                      <span>{amb.profile.shoe_size}</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-gray-400 w-16 flex-shrink-0">学歴</span>
                      <span>{amb.profile.education}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-gray-200">
                  <p className="text-sm text-gray-600 leading-loose">{amb.bio_jp}</p>
                  <p className="text-xs text-gray-400 leading-loose mt-3">{amb.bio_en}</p>
                </div>
              </div>
            </div>

            {/* ==================== 特技・資格・趣味 ==================== */}
            <div className="grid md:grid-cols-3 gap-10 mb-20">
              <div>
                <SectionTitle en="SKILLS" ja="特技" />
                <ul className="space-y-2">
                  {amb.skills.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <SectionTitle en="LICENSES" ja="資格" />
                <ul className="space-y-2">
                  {amb.licenses.map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      {l}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <SectionTitle en="HOBBIES" ja="趣味" />
                <ul className="space-y-2">
                  {amb.hobbies.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ==================== Works ==================== */}
            <div className="mb-20">
              <div className="mb-10 border-b border-gray-200 pb-4">
                <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-1">CAREER</p>
                <h3 className="text-lg font-light tracking-wider text-gray-800">Works</h3>
              </div>

              {/* タブ */}
              <div className="flex gap-0 mb-10 border-b border-gray-200">
                {([
                  { key: 'film', label: '映画 / Film' },
                  { key: 'drama', label: 'ドラマ / Drama' },
                  { key: 'stage', label: '舞台 / Stage' },
                  { key: 'cm', label: 'CM / Others' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3 text-xs tracking-wider transition-all ${
                      activeTab === tab.key
                        ? 'border-b-2 border-gray-900 text-gray-900 -mb-px'
                        : 'text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'film' && <WorkTable entries={amb.works.film} />}
              {activeTab === 'drama' && <WorkTable entries={amb.works.drama} />}
              {activeTab === 'stage' && <WorkTable entries={amb.works.stage} />}
              {activeTab === 'cm' && (
                <div className="grid md:grid-cols-2 gap-x-10 gap-y-2">
                  <div>
                    <p className="text-[10px] tracking-[0.3em] text-gray-400 mb-4">CM</p>
                    <ul className="space-y-2">
                      {amb.works.cm.map((c, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] text-gray-400 mb-4">OTHERS</p>
                    <ul className="space-y-2">
                      {amb.works.others.map((o, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
                          {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* ==================== 区切り ==================== */}
            <div className="border-t border-gray-100 mb-20" />
          </div>
        ))}

        {/* アンバサダー募集 */}
        {(
          <div className="border border-gray-200 p-10 text-center">
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
        )}
      </div>
    </div>
  );
}
