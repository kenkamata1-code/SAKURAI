import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Styling, getImageUrl } from '../lib/api-client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePageTracking } from '../hooks/usePageTracking';

export default function StylingList() {
  usePageTracking('/styling', 'Styling List');

  const [stylings, setStyleings] = useState<Styling[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadStyleings();
  }, []);

  async function loadStyleings() {
    try {
      const data = await api.styling.list();
      setStyleings(data);
    } catch (error) {
      console.error('Error loading stylings:', error);
    } finally {
      setLoading(false);
    }
  }

  function getAllImages(styling: Styling) {
    const images = [styling.image_url];
    if (styling.styling_images && styling.styling_images.length > 0) {
      const additionalImages = styling.styling_images
        .sort((a, b) => a.display_order - b.display_order)
        .map(img => img.url);
      images.push(...additionalImages);
    }
    return images.filter(url => url);
  }

  function nextImage(stylingId: string, totalImages: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [stylingId]: ((prev[stylingId] || 0) + 1) % totalImages
    }));
  }

  function prevImage(stylingId: string, totalImages: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(prev => ({
      ...prev,
      [stylingId]: ((prev[stylingId] || 0) - 1 + totalImages) % totalImages
    }));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <div className="text-gray-800">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-20">
            <h1 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              STYLING
            </h1>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              スタイリング一覧 / All Stylings
            </p>
          </div>

          {stylings.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm text-gray-600">スタイリングはまだ登録されていません。</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {stylings.map((item) => {
                const allImages = getAllImages(item);
                const currentIndex = currentImageIndex[item.id] || 0;
                const hasMultipleImages = allImages.length > 1;

                return (
                  <Link key={item.id} to={`/styling/${item.slug}`} className="group cursor-pointer">
                    <div className="relative aspect-[3/4] bg-[#E8E8E8] overflow-hidden mb-3">
                      <img
                        src={allImages[currentIndex]}
                        alt={item.title || `${item.color} styling`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />

                      {hasMultipleImages && (
                        <>
                          <button
                            onClick={(e) => prevImage(item.id, allImages.length, e)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={(e) => nextImage(item.id, allImages.length, e)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                          >
                            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                          </button>

                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {allImages.map((_, index) => (
                              <div
                                key={index}
                                className={`w-1.5 h-1.5 rounded-full transition ${
                                  index === currentIndex ? 'bg-white' : 'bg-white/40'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="space-y-1">
                      {item.title && (
                        <p className="text-xs tracking-wider font-light text-gray-800">
                          {item.title}
                        </p>
                      )}
                      <p className="text-[10px] tracking-wider font-light text-gray-600">
                        {item.color} / {item.size}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        {item.height}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
