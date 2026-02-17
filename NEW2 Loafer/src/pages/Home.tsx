import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ChevronLeft, ChevronRight, Sparkles, Wrench } from 'lucide-react';
import { api, type Product, type Styling, getImageUrl } from '../lib/api-client';
import { usePageTracking } from '../hooks/usePageTracking';

export default function Home() {
  usePageTracking('/', 'Home');

  return (
    <div>
      <HeroSection />
      <ConceptSection />
      <InformationSection />
      <BrandSection />
      <StylingSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="pt-16">
      <div className="relative">
        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-[3/2] overflow-hidden">
            <img
              src="/hero-left.png"
              alt="Product"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative aspect-[4/3] md:aspect-[3/2] overflow-hidden">
            <img
              src="/hero-right.png"
              alt="Product"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ConceptSection() {
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
            CONCEPT
          </h2>
          <p className="text-xs tracking-[0.15em] text-gray-500">私たちが目指すもの / What We Aim For</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-6 text-sm leading-loose">
              <h3 className="text-2xl md:text-3xl leading-relaxed font-light text-gray-800">
                毎日の装いに、<br />
                最も合理的な一足。
              </h3>
              <p className="text-gray-600">
                上質な素材と、端正なシルエット。<br />
                すべては、日常遣いを前提に、所有する満足感と、使う実感のどちらも満たす革靴とは何か。その問いから、この一足は生まれました。<br />
                特別な日のためではなく、日常の延長線で、無理なく履けること。だからこそ、履くほどに実感できる履き心地があります。<br />
                一つひとつに理由のある「良いもの」を選び抜きながら、誇張せず、主張しすぎない佇まいを大切にしました。<br />
                それが、長く履き続けたいという気持ちを生むと考えています。<br />
                それでも確かに、「いつもより良い」と感じられること。<br />
                それが、この一足の目指した価値です。
              </p>
            </div>

            <div className="space-y-4 text-xs leading-loose text-gray-500 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-light">
                The most rational choice<br />
                for your daily attire.
              </h4>
              <p>
                Premium materials and refined silhouettes. This shoe was born from a single question: what makes a leather shoe that satisfies both the pride of ownership and the reality of daily use?
              </p>
              <p>
                Not for special occasions, but as a natural extension of everyday life—shoes you can wear effortlessly. That's why the comfort becomes more apparent the more you wear them.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 gap-6 mt-20">
            <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-sm overflow-hidden">
              <img
                src="/concept-left.png"
                alt="Concept"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm overflow-hidden">
              <img
                src="/concept-right.png"
                alt="Concept"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InformationSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedProducts();
  }, []);

  async function loadFeaturedProducts() {
    try {
      const data = await api.products.list({ featured: true });
      setProducts(data);
    } catch (error) {
      console.error('Error loading featured products:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              OUR PRODUCT
            </h2>
            <p className="text-xs tracking-[0.15em] text-gray-500">私たちのプロダクト / Our Products</p>
          </div>
          <p className="text-center text-sm text-gray-600">注目商品はまだ登録されていません。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
            OUR PRODUCT
          </h2>
          <p className="text-xs tracking-[0.15em] text-gray-500">私たちのプロダクト / Our Products</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/shop/${product.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] bg-[#E8E8E8] overflow-hidden mb-6 p-8">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain group-hover:scale-105 transition duration-500"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm tracking-wider font-light">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600">
                  ¥{Math.floor(product.price).toLocaleString()} (tax incl.)
                </p>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/shop"
            className="inline-block px-12 py-3 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition uppercase"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}

function BrandSection() {
  const brands = [
    {
      name: '01',
      label: 'QUALITY',
      tagline: 'イルチアスエードが叶える、\n上質な佇まいと"簡単メンテナンス"',
      taglineEn: 'Premium presence and easy maintenance with Ilcea suede',
      description: '世界トップブランドも採用するイタリア・イルチア社の最高級スエード。確かな質感と奥行きのある発色が、足元から装いを静かに格上げします。\n撥水性が高く、汚れもブラッシングで手軽にケアできるため、驚くほど扱いやすいのも特徴です。\n「高級素材＝デリケート」というイメージを覆す、日常に寄り添う実用性を備えています。',
      descriptionEn: 'Italy\'s finest suede from Ilcea, trusted by world\'s top luxury brands. Its assured texture and rich depth of color quietly elevate your outfit from the ground up. With excellent water resistance and easy care through simple brushing, it\'s surprisingly practical. Defying the "luxury material = delicate" stereotype, it offers practicality that supports your daily life.',
      image: 'dark',
    },
    {
      name: '02',
      label: 'DESIGN',
      tagline: 'トップブランド研究から生まれた、\n日本人のためのラスト',
      taglineEn: 'A last for Japanese feet, born from top brand research',
      description: 'ただ細いだけ、ただシャープなだけでは、本当に美しいローファーにはなりません。\nトップブランドのシルエットを徹底的に研究し、日本人の足型で最もバランスよく見えるラインを追求しました。\n履いた瞬間に感じる安定感と、鏡に映ったときのかっこよさ。日常で履くからこそ、違いがわかるラストです。',
      descriptionEn: 'Just slim, just sharp alone doesn\'t make truly beautiful loafers. Through thorough research of top brand silhouettes, we pursued lines that appear most balanced on Japanese feet. Stability felt the moment you wear them, and natural elegance when reflected in the mirror. It\'s a last where the difference becomes clear through daily wear.',
      image: 'design',
    },
    {
      name: '03',
      label: 'PRICE',
      tagline: '現実的な価格設計',
      taglineEn: 'Realistic pricing',
      description: '上質な素材とシルエットを備えながら、この価格に収めることができたのには理由があります。\n製法やコスト構造を一から見直し、小規模事業者だからこそできる選択を積み重ねました。\n「本格的な靴は高いもの」という固定観念を少しだけ崩し、無理なく手に取り、日常で使い続けられる一足へ。\nこれは妥協ではなく、賢く選んだ結果です。「足元こそ、おしゃれに。」その想いを実現するために、細部までこだわりました。',
      descriptionEn: 'There\'s a reason we could achieve this price while maintaining premium materials and silhouettes. We reviewed production methods and cost structures from scratch, making choices only small businesses can make. This isn\'t compromise—it\'s a smart choice. To realize our belief that "style starts from the ground up," we paid attention to every detail.',
      image: 'light',
    },
    {
      name: '04',
      label: 'VERSATILITY',
      tagline: '迷わず履ける、その理由。',
      taglineEn: 'Designed to be your go-to choice',
      description: '上質であること。そして、気兼ねなく履けること。その両立を、私たちは最優先に考えました。\nスラックスにもデニムにも自然に馴染み、仕事の日も休日も、装いを選ばない一足であること。そのために、モカ縫いの表情やコインスロットの輪郭、幅感に至るまで、バランスを徹底的に検証しています。\n雨の日でも安心して歩けるオリジナルのラバーソールに、EVAクッションとスポンジ加工を組み合わせ、長時間の移動でも負担を感じにくい履き心地を実現しました。\n仕事の日も、休日も。「今日はこれでいい」と、迷わず手に取れる一足。その答えが、この設計です。',
      descriptionEn: 'Being premium yet worry-free to wear. We prioritized achieving both. Shoes that naturally complement both slacks and denim, suitable for work days and weekends alike. We meticulously examined every detail—the moc toe stitching, coin slot contours, and width balance. With our original rubber sole for rainy days, combined with EVA cushioning and sponge processing, we achieved comfort that lasts through long hours. Work or weekend, these are shoes you reach for without hesitation.',
      image: 'sole',
    },
  ];

  return (
    <section className="py-20 md:py-32 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
            DETAILS
          </h2>
          <p className="text-xs tracking-[0.15em] text-gray-500">こだわりの4つのポイント / Four Key Features</p>
        </div>

        <div className="space-y-32">
          {brands.map((brand, index) => (
            <div key={brand.name} className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
              <div className={`lg:col-span-2 ${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-gray-400 mb-4 uppercase">
                      {brand.label}
                    </p>
                    <h3 className="text-3xl md:text-4xl tracking-[0.1em] mb-8 font-light">
                      {brand.name}
                    </h3>
                  </div>

                  <div className="pt-8 border-t border-gray-200 space-y-8">
                    <div className="space-y-6 text-sm leading-loose">
                      <h4 className="text-xl md:text-2xl leading-relaxed font-light text-gray-800 whitespace-pre-line">
                        {brand.tagline}
                      </h4>
                      <p className="text-gray-600 whitespace-pre-line">
                        {brand.description}
                      </p>
                    </div>

                    <div className="space-y-4 text-xs leading-loose text-gray-500 pt-6 border-t border-gray-200">
                      <h5 className="text-base md:text-lg leading-relaxed font-light whitespace-pre-line">
                        {brand.taglineEn}
                      </h5>
                      <p className="whitespace-pre-line">
                        {brand.descriptionEn}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`lg:col-span-3 mt-32 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className={`aspect-[16/10] rounded-sm overflow-hidden ${
                  brand.image === 'dark'
                    ? 'bg-gradient-to-br from-gray-800 to-gray-900'
                    : brand.image === 'design'
                    ? 'bg-gradient-to-br from-[#87CEEB] to-[#5BA3C7]'
                    : brand.image === 'sole'
                    ? 'bg-white'
                    : 'bg-gradient-to-br from-gray-100 to-gray-200'
                }`}>
                  {brand.image === 'dark' ? (
                    <img
                      src="/image copy copy copy copy copy.png"
                      alt={brand.label}
                      className="w-full h-full object-cover"
                    />
                  ) : brand.image === 'design' ? (
                    <img
                      src="/design-02.png"
                      alt={brand.label}
                      className="w-full h-full object-cover"
                    />
                  ) : brand.image === 'light' ? (
                    <img
                      src="/image copy copy copy copy copy copy.png"
                      alt={brand.label}
                      className="w-full h-full object-cover"
                    />
                  ) : brand.image === 'sole' ? (
                    <img
                      src="/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png"
                      alt={brand.label}
                      className="w-full h-full object-contain p-8"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-16">
                      <div className="text-6xl text-white/10 font-light tracking-widest">
                        {brand.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-20">
          <Link
            to="/design-philosophy"
            className="inline-block px-20 py-4 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition-all duration-300 uppercase"
          >
            View More
          </Link>
        </div>
      </div>
    </section>
  );
}

function StylingSection() {
  const [stylings, setStyleings] = useState<Styling[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    loadStyleings();
  }, []);

  async function loadStyleings() {
    try {
      const data = await api.styling.list();
      // 最初の5件のみ取得
      setStyleings(data.slice(0, 5));
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
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto text-center">
          <p className="text-sm text-gray-600">読み込み中...</p>
        </div>
      </section>
    );
  }

  if (stylings.length === 0) {
    return (
      <section className="py-20 px-6 bg-white">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              STYLING
            </h2>
            <p className="text-xs tracking-[0.15em] text-gray-500">スタイリングのご提案 / Styling Suggestions</p>
          </div>
          <p className="text-center text-sm text-gray-600">スタイリングはまだ登録されていません。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
            STYLING
          </h2>
          <p className="text-xs tracking-[0.15em] text-gray-500">スタイリングのご提案 / Styling Suggestions</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={(e) => nextImage(item.id, allImages.length, e)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
                      </button>

                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
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
                <div className="space-y-0.5">
                  <p className="text-[10px] tracking-wider font-light">
                    {item.color} / {item.size}
                  </p>
                  <p className="text-[10px] text-gray-600">
                    {item.height}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/styling"
            className="inline-block px-12 py-3 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition uppercase"
          >
            View More
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <Link
            to="/design-philosophy"
            className="group relative aspect-[4/3] border-2 border-gray-900 flex flex-col items-center justify-center hover:bg-gray-900 transition-all duration-300 overflow-hidden"
          >
            <h3 className="text-xl md:text-2xl tracking-[0.2em] mb-4 group-hover:text-white transition-colors font-light text-center">
              DESIGN<br />PHILOSOPHY
            </h3>
            <p className="text-xs tracking-[0.15em] text-gray-600 group-hover:text-white/80 transition-colors text-center">
              設計思想 / Design Philosophy
            </p>
            <div className="absolute bottom-8 w-6 h-6 border border-gray-900 group-hover:border-white rounded-full flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-gray-900 group-hover:text-white" strokeWidth={1.5} />
            </div>
          </Link>

          <Link
            to="/maintenance"
            className="group relative aspect-[4/3] border-2 border-gray-200 flex flex-col items-center justify-center hover:border-gray-900 hover:bg-gray-900 transition-all duration-300 overflow-hidden"
          >
            <h3 className="text-xl md:text-2xl tracking-[0.2em] mb-4 group-hover:text-white transition-colors font-light">
              MAINTENANCE
            </h3>
            <p className="text-xs tracking-[0.15em] text-gray-600 group-hover:text-white/80 transition-colors text-center">
              メンテナンス / Care Guide
            </p>
            <div className="absolute bottom-8 w-6 h-6 border border-gray-300 group-hover:border-white rounded-full flex items-center justify-center">
              <Wrench className="w-3 h-3 text-gray-400 group-hover:text-white" strokeWidth={1.5} />
            </div>
          </Link>

          <Link
            to="/contact"
            className="group relative aspect-[4/3] border-2 border-gray-200 flex flex-col items-center justify-center hover:border-gray-900 hover:bg-gray-900 transition-all duration-300 overflow-hidden"
          >
            <h3 className="text-xl md:text-2xl tracking-[0.2em] mb-4 group-hover:text-white transition-colors font-light">
              CONTACT
            </h3>
            <p className="text-xs tracking-[0.15em] text-gray-600 group-hover:text-white/80 transition-colors text-center">
              お問い合わせ / Inquiries
            </p>
            <div className="absolute bottom-8 w-6 h-6 border border-gray-300 group-hover:border-white rounded-full flex items-center justify-center">
              <Mail className="w-3 h-3 text-gray-400 group-hover:text-white" strokeWidth={1.5} />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
