import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, type Styling, getImageUrl } from '../lib/api-client';
import { ArrowLeft } from 'lucide-react';
import { usePageTracking } from '../hooks/usePageTracking';

export default function StylingDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [styling, setStyling] = useState<Styling | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // ページビュートラッキング
  usePageTracking(`/styling/${slug}`, styling?.title || 'スタイリング詳細');

  useEffect(() => {
    if (slug) {
      loadStyling();
    }
  }, [slug]);

  async function loadStyling() {
    try {
      const data = await api.styling.get(slug!);
      setStyling(data);
    } catch (error) {
      console.error('Error loading styling:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-gray-800">読み込み中...</div>
      </div>
    );
  }

  if (!styling) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-center text-gray-800">
          <h2 className="text-2xl mb-4 font-light">スタイリングが見つかりませんでした</h2>
          <Link to="/" className="text-gray-600 hover:text-gray-900 underline text-sm">
            ホームに戻る
          </Link>
        </div>
      </div>
    );
  }

  const allImages = styling ? [
    styling.image_url,
    ...(styling.styling_images?.sort((a, b) => a.display_order - b.display_order).map(img => img.url) || [])
  ].filter(url => url) : [];

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-12 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            戻る
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-4">
              <div className="aspect-[3/4] bg-[#E8E8E8] overflow-hidden">
                <img
                  src={allImages[selectedImageIndex]}
                  alt={styling.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {allImages.length > 1 && (
                <div className="grid grid-cols-6 gap-2">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`aspect-square bg-[#E8E8E8] overflow-hidden border-2 transition ${
                        selectedImageIndex === index ? 'border-gray-900' : 'border-transparent hover:border-gray-400'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${styling.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-8">
              {styling.title && (
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl tracking-[0.1em] font-light text-gray-800">
                    {styling.title}
                  </h1>
                </div>
              )}

              <div className="border-t border-b border-gray-200 py-8 space-y-6">
                {styling.description && (
                  <p className="text-sm text-gray-600 leading-loose">
                    {styling.description}
                  </p>
                )}

                <div className="space-y-3 text-sm">
                  {styling.color && (
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 w-24">カラー:</span>
                      <span className="text-gray-800">{styling.color}</span>
                    </div>
                  )}
                  {styling.size && (
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 w-24">サイズ:</span>
                      <span className="text-gray-800">{styling.size}</span>
                    </div>
                  )}
                  {styling.height && (
                    <div className="flex items-center gap-4">
                      <span className="text-gray-500 w-24">身長:</span>
                      <span className="text-gray-800">{styling.height}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <Link
                  to="/shop"
                  className="block w-full py-4 bg-gray-900 text-white text-sm tracking-[0.2em] hover:bg-gray-800 transition text-center uppercase"
                >
                  Shop Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
