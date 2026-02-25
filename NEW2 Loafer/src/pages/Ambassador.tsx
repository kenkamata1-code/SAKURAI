import { Link } from 'react-router-dom';

// -------------------- アンバサダー情報（固定データ） --------------------
const ambassador = {
  name_jp: '米田 敬',
  name_en: 'KEI YONEDA',
  profile_image: '/images/ambassadors/yoneda.jpg' as string | null,
  occupation: '俳優',
  birth: '1987年6月11日生まれ',
  height: '178cm',
  shoe_size: 'UK6',
  birthplace: '東京都出身',
  bio: '俳優として舞台・映画・ドラマ・CMと幅広く活躍。「シン・仮面ライダー」「青春18×2 君へと続く道」など話題作への出演を重ね、存在感あふれる演技で注目を集める。トライアスロン東京都優勝、甲子園出場（慶應義塾高校）など、アスリートとしての顔も持つ。車椅子バスケなど多岐にわたる活動で活躍。',
};

// -------------------- メインコンポーネント --------------------
export default function Ambassador() {
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

      {/* ウェルカムメッセージ */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-12 text-center">
          <p className="text-sm text-gray-600 leading-loose tracking-wide">
            THE LONG GAME は、さまざまな分野の第一線で活躍する皆様を心から応援しています。
          </p>
          <p className="text-xs text-gray-400 leading-loose mt-2 tracking-wider">
            THE LONG GAME wholeheartedly supports those who are active at the forefront of various fields.
          </p>
        </div>
      </div>

      {/* アンバサダープロフィール */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex flex-col lg:flex-row gap-16 items-start">

          {/* 左：写真エリア */}
          <div className="w-full lg:w-2/5 flex-shrink-0">
            <div className="aspect-[3/4] overflow-hidden bg-gray-100">
              {ambassador.profile_image ? (
                <img
                  src={ambassador.profile_image}
                  alt={ambassador.name_jp}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* 右：テキスト情報 */}
          <div className="flex-1 pt-2">
            {/* ラベル */}
            <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-6">AMBASSADOR</p>

            {/* 名前 */}
            <h2 className="text-3xl font-light tracking-[0.15em] mb-1">{ambassador.name_jp}</h2>
            <p className="text-xs tracking-[0.4em] text-gray-400 mb-2">{ambassador.name_en}</p>
            <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-10">{ambassador.occupation}</p>

            {/* 区切り線 */}
            <div className="w-12 h-px bg-gray-200 mb-10" />

            {/* 基本情報テーブル */}
            <dl className="space-y-3 mb-10">
              <div className="flex gap-6">
                <dt className="text-[10px] tracking-[0.2em] text-gray-400 w-20 flex-shrink-0">生年月日</dt>
                <dd className="text-xs text-gray-600">{ambassador.birth}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-[10px] tracking-[0.2em] text-gray-400 w-20 flex-shrink-0">出身</dt>
                <dd className="text-xs text-gray-600">{ambassador.birthplace}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-[10px] tracking-[0.2em] text-gray-400 w-20 flex-shrink-0">身長</dt>
                <dd className="text-xs text-gray-600">{ambassador.height}</dd>
              </div>
              <div className="flex gap-6">
                <dt className="text-[10px] tracking-[0.2em] text-gray-400 w-20 flex-shrink-0">靴サイズ</dt>
                <dd className="text-xs text-gray-600">{ambassador.shoe_size}</dd>
              </div>
            </dl>

            {/* 区切り線 */}
            <div className="w-12 h-px bg-gray-200 mb-10" />

            {/* プロフィール文 */}
            <p className="text-sm text-gray-600 leading-loose">
              {ambassador.bio}
            </p>
          </div>
        </div>
      </div>

      {/* アンバサダー募集 */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
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
      </div>
    </div>
  );
}
