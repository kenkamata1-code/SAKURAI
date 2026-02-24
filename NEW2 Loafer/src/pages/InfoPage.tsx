import { Link } from 'react-router-dom';
// Vite の ?raw インポートでビルド時にバンドル（fetchしない）
import termsRaw from '../content/terms.md?raw';
import privacyRaw from '../content/privacy.md?raw';

interface InfoPageProps {
  slug: 'terms' | 'privacy';
}

const PAGE_CONFIG = {
  terms: {
    content: termsRaw,
    title: 'TERMS OF SERVICE',
    titleJa: '利用規約',
  },
  privacy: {
    content: privacyRaw,
    title: 'PRIVACY POLICY',
    titleJa: 'プライバシーポリシー',
  },
} as const;

// Markdown の1行をインライン要素としてJSXにレンダリング
function InlineText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    const italicMatch = remaining.match(/^(.*?)\*([^*]+?)\*(.*)/s);
    const linkMatch = remaining.match(/^(.*?)\[(.+?)\]\((.+?)\)(.*)/s);

    if (!boldMatch && !italicMatch && !linkMatch) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const boldPos = boldMatch ? boldMatch[1].length : Infinity;
    const italicPos = italicMatch ? italicMatch[1].length : Infinity;
    const linkPos = linkMatch ? linkMatch[1].length : Infinity;

    if (boldPos <= italicPos && boldPos <= linkPos && boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(<strong key={key++} className="font-semibold text-gray-800">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
    } else if (italicPos <= boldPos && italicPos <= linkPos && italicMatch) {
      if (italicMatch[1]) parts.push(<span key={key++}>{italicMatch[1]}</span>);
      parts.push(<em key={key++}>{italicMatch[2]}</em>);
      remaining = italicMatch[3];
    } else if (linkMatch) {
      if (linkMatch[1]) parts.push(<span key={key++}>{linkMatch[1]}</span>);
      parts.push(
        <a key={key++} href={linkMatch[3]} className="text-gray-800 underline underline-offset-2 hover:opacity-60 transition-opacity">
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
    } else {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }
  }

  return <>{parts}</>;
}

// Markdown → React要素の配列に変換
function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let paraLines: string[] = [];
  let listItems: string[] = [];
  let key = 0;

  const flushPara = () => {
    if (paraLines.length > 0) {
      const text = paraLines.join(' ').trim();
      if (text) {
        elements.push(
          <p key={key++} className="text-sm text-gray-600 leading-loose mb-4">
            <InlineText text={text} />
          </p>
        );
      }
      paraLines = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={key++} className="space-y-2 mb-6 pl-4 list-disc list-inside">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm text-gray-600 leading-relaxed">
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    if (/^---+$/.test(line.trim())) {
      flushPara(); flushList();
      elements.push(<hr key={key++} className="border-gray-200 my-8" />);
      continue;
    }
    if (line.startsWith('# ')) {
      flushPara(); flushList();
      elements.push(
        <h1 key={key++} className="text-2xl font-light tracking-widest mb-10 pb-4 border-b border-gray-200">
          <InlineText text={line.slice(2)} />
        </h1>
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushPara(); flushList();
      elements.push(
        <h2 key={key++} className="text-base font-medium tracking-wider mt-12 mb-5 pt-8 border-t border-gray-100">
          <InlineText text={line.slice(3)} />
        </h2>
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushPara(); flushList();
      elements.push(
        <h3 key={key++} className="text-sm font-medium tracking-wider mt-6 mb-3">
          <InlineText text={line.slice(4)} />
        </h3>
      );
      continue;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushPara();
      listItems.push(line.slice(2));
      continue;
    }
    if (line.trim() === '') {
      flushPara(); flushList();
      continue;
    }
    flushList();
    paraLines.push(line);
  }
  flushPara(); flushList();

  return elements;
}

export default function InfoPage({ slug }: InfoPageProps) {
  const config = PAGE_CONFIG[slug];

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
        <div className="space-y-0">
          {renderMarkdown(config.content)}
        </div>
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
