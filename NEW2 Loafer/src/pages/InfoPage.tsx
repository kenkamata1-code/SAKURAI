import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface InfoPageProps {
  slug: 'terms' | 'privacy';
}

// ページ設定
const PAGE_CONFIG = {
  terms: {
    file: '/content/terms.md',
    title: 'TERMS OF SERVICE',
    titleJa: '利用規約',
  },
  privacy: {
    file: '/content/privacy.md',
    title: 'PRIVACY POLICY',
    titleJa: 'プライバシーポリシー',
  },
} as const;

// インライン要素（太字・リンク）のMarkdown変換
function processInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

// シンプルなMarkdown → HTML 変換（ブラケットカウント不要のテキスト処理）
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const html: string[] = [];
  let paraLines: string[] = [];
  let inList = false;

  const flushPara = () => {
    if (paraLines.length > 0) {
      const text = paraLines.join(' ').trim();
      if (text) html.push(`<p>${processInline(text)}</p>`);
      paraLines = [];
    }
  };
  const openList = () => { if (!inList) { html.push('<ul>'); inList = true; } };
  const closeList = () => { if (inList) { html.push('</ul>'); inList = false; } };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^---+$/.test(trimmed)) {
      flushPara(); closeList();
      html.push('<hr />');
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara(); closeList();
      html.push(`<h1>${processInline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara(); closeList();
      html.push(`<h2>${processInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      flushPara(); closeList();
      html.push(`<h3>${processInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushPara(); openList();
      html.push(`<li>${processInline(line.slice(2))}</li>`);
      continue;
    }
    if (trimmed === '') {
      flushPara(); closeList();
      continue;
    }
    closeList();
    paraLines.push(processInline(line));
  }
  flushPara(); closeList();

  return html.join('\n');
}

export default function InfoPage({ slug }: InfoPageProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const config = PAGE_CONFIG[slug];

  useEffect(() => {
    setLoading(true);
    setError(false);
    setContent('');
    fetch(config.file)
      .then(res => { if (!res.ok) throw new Error(); return res.text(); })
      .then(text => { setContent(text); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [slug]);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダーバナー */}
      <div className="bg-gray-900 text-white py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[0.4em] text-gray-400 mb-3">LEGAL</p>
          <h1 className="text-2xl sm:text-3xl font-light tracking-[0.15em] mb-2">{config.title}</h1>
          <p className="text-sm text-gray-400">{config.titleJa}</p>
        </div>
      </div>

      {/* パンくずリスト */}
      <div className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-2 text-xs text-gray-400 tracking-wider">
          <Link to="/" className="hover:text-gray-700 transition-colors">HOME</Link>
          <span>/</span>
          <span className="text-gray-600">{config.title}</span>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-3xl mx-auto px-6 py-16">
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
        {!loading && !error && (
          <div
            className="prose-info"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </div>

      {/* 関連リンク */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-10 flex flex-wrap gap-6 text-xs tracking-widest">
          {slug !== 'terms' && (
            <Link to="/terms" className="text-gray-500 hover:text-gray-900 transition-colors uppercase">
              Terms of Service
            </Link>
          )}
          {slug !== 'privacy' && (
            <Link to="/privacy" className="text-gray-500 hover:text-gray-900 transition-colors uppercase">
              Privacy Policy
            </Link>
          )}
          <Link to="/contact" className="text-gray-500 hover:text-gray-900 transition-colors uppercase">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
