import { Instagram, Youtube, Mail, Menu, ExternalLink } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <ConceptSection />
      <InformationSection />
      <BrandSection />
      <StylingSection />
      <CTASection />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 py-4 flex justify-between items-center">
        <div className="text-sm tracking-[0.3em] font-light">
          WEAR INC.
        </div>

        <div className="flex items-center gap-8">
          <a href="#shop" className="text-[11px] tracking-[0.2em] text-gray-800 hover:text-gray-500 transition-colors uppercase">
            Online Shop
          </a>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:opacity-60 transition-opacity">
              <Instagram className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
            </a>
            <a href="#" className="hover:opacity-60 transition-opacity">
              <div className="w-4 h-4 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 text-gray-800">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
            </a>
            <a href="#" className="hover:opacity-60 transition-opacity">
              <Youtube className="w-4 h-4 text-gray-800" strokeWidth={1.5} />
            </a>
            <button className="hover:opacity-60 transition-opacity ml-2">
              <Menu className="w-5 h-5 text-gray-800" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="pt-16">
      <div className="relative">
        <div className="absolute top-8 right-8 md:right-16 z-10">
          <h1 className="text-2xl md:text-3xl tracking-[0.3em] font-light">
            WEAR THE FUTURE
          </h1>
        </div>

        <div className="grid md:grid-cols-2">
          <div className="relative aspect-[4/3] md:aspect-[3/2] overflow-hidden">
            <img
              src="/image.png"
              alt="Product"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="relative aspect-[4/3] md:aspect-[3/2] overflow-hidden">
            <img
              src="/image copy.png"
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
                少しの背伸びで、<br />
                明日が変わるローファー。
              </h3>
              <p className="text-gray-600">
                上質な素材と、端正なシルエット。<br />
                そして、日常でこそ実感できる履き心地。<br />
                一つひとつに理由のある「良いもの」を選び抜きながら、特別な日のためではなく、日常の延長線で、無理なく履ける一足を目指しました。
              </p>
              <p className="text-gray-600">
                誇張せず、主張しすぎず。<br />
                それでも確かに、「いつもより良い」と感じられること。<br />
                それが、この一足の目指した価値です。
              </p>
            </div>

            <div className="space-y-4 text-xs leading-loose text-gray-500 pt-6 border-t border-gray-200">
              <h4 className="text-xl font-light">
                Loafers that change tomorrow<br />
                with a little extra effort.
              </h4>
              <p>
                Premium materials and refined silhouettes. Comfort you feel in everyday life. While selecting quality items with purpose, we aimed for shoes you can wear comfortably as an extension of daily life, not just for special occasions.
              </p>
              <p>
                Not exaggerated, not overstated. Yet unmistakably "better than usual." That's the value we aimed for with these shoes.
              </p>
            </div>
          </div>

          <div className="lg:col-span-3 grid grid-cols-2 gap-6 mt-20">
            <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 rounded-sm overflow-hidden">
              <img
                src="/image copy copy copy.png"
                alt="Concept"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="aspect-[3/4] bg-gradient-to-br from-gray-800 to-gray-900 rounded-sm overflow-hidden">
              <img
                src="/image copy copy copy copy.png"
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
  const products = [
    {
      name: 'KEN',
      price: '¥33,000 (tax incl.)',
      colors: ['#2C2C2C', '#4A4A4A', '#1A1A1A', '#3C3C3C'],
      image: '/image copy copy copy copy copy copy copy copy.png',
    },
    {
      name: 'HIDE',
      price: '¥33,000 (tax incl.)',
      colors: ['#2C2C2C', '#4A4A4A', '#1A1A1A', '#3C3C3C', '#5A5A5A'],
      image: '/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png',
    },
  ];

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
          {products.map((product, index) => (
            <a
              key={index}
              href="#"
              className="group block"
            >
              <div className="relative aspect-[4/3] bg-[#E8E8E8] overflow-hidden mb-6">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />

                <button className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <button className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm tracking-wider font-light">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {product.price}
                </p>
                <div className="flex gap-2">
                  {product.colors.map((color, colorIndex) => (
                    <div
                      key={colorIndex}
                      className="w-5 h-5 border border-gray-300 cursor-pointer hover:border-gray-900 transition-colors"
                      style={{ backgroundColor: color }}
                    ></div>
                  ))}
                </div>
              </div>
            </a>
          ))}
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
      tagline: 'イルチアスエードがつくる、\nワンランク上の佇まい',
      taglineEn: 'Premium presence crafted by Ilcea suede',
      description: '足元に視線が集まったとき、自然と「きちんとしている」と感じさせる理由は、素材にあります。\n採用したのは、"某メゾン（世界トップブランド）"でも採用されている、イタリア・イルチア社の最高級スエード。\nしっとりとした質感と奥行きのある表情が、装い全体を一段引き上げ、静かな上質さを演出します。',
      descriptionEn: 'When eyes turn to your feet, the reason they naturally feel "refined" lies in the material. We\'ve chosen Italy\'s Ilcea finest suede, also used by world-leading luxury brands. Its supple texture and rich character elevate your entire outfit with quiet sophistication. Without bold statements, the difference is unmistakably communicated.',
      image: 'dark',
    },
    {
      name: '02',
      label: 'DESIGN',
      tagline: 'トップブランド研究から生まれた、\n日本人のためのラスト',
      taglineEn: 'A last for Japanese feet, born from top brand research',
      description: 'ただ細いだけ、ただシャープなだけでは、本当に美しいローファーにはなりません。\nトップブランドのシルエットを徹底的に研究し、日本人の足型で最もバランスよく見えるラインを追求しました。\n履いた瞬間に感じる安定感と、鏡に映ったときのかっこよさ。\n日常で履くからこそ、違いがわかるラストです。',
      descriptionEn: 'Just slim, just sharp alone doesn\'t make truly beautiful loafers. Through thorough research of top brand silhouettes, we pursued lines that appear most balanced on Japanese feet. Stability felt the moment you wear them, and natural elegance when reflected in the mirror. It\'s a last where the difference becomes clear through daily wear.',
      image: 'design',
    },
    {
      name: '03',
      label: 'PRICE',
      tagline: '背伸びしすぎないための、\n現実的な価格設計',
      taglineEn: 'Realistic pricing without overreaching',
      description: '上質な素材とシルエットを備えながら、この価格に収めることができたのには理由があります。\n製法やコスト構造を一から見直し、小規模事業者だからこそできる選択を積み重ねました。\n「本格的な靴は高いもの」という固定観念を少しだけ崩し、無理なく手に取り、日常で使い続けられる一足へ。\nこれは妥協ではなく、賢く選んだ結果です。',
      descriptionEn: 'There\'s a reason we could achieve this price while maintaining premium materials and silhouettes. We reviewed production methods and cost structures from scratch, making choices only small businesses can make. Gently challenging the notion that "genuine shoes must be expensive," we created shoes you can afford and continue wearing daily. This isn\'t compromise—it\'s a smart choice.',
      image: 'light',
    },
    {
      name: '04',
      label: 'DURABILITY',
      tagline: '雨にも長時間にも強い、\n安心して履ける設計',
      taglineEn: 'Rain-proof, enduring design you can rely on',
      description: '上質な一足であることと、「気兼ねなく履ける」ことは、どちらも同じくらい大切だと考えました。\n雨の日でも安心して歩けるオリジナルのラバーソールに、衝撃をやわらげるEVAクッションとスポンジ加工を組み合わせ、長時間の移動や立ち仕事でも負担を感じにくい履き心地を実現。\n仕事の日も、休日も、そして突然の予定変更のときも「今日はこれでいい」と迷わず手に取れる一足でありたいと思っています。',
      descriptionEn: 'We believe being premium and "worry-free to wear" are equally important. With our original rubber sole that handles rainy days confidently, combined with shock-absorbing EVA cushioning and sponge processing, we achieved comfort that reduces strain during long commutes or standing work. Regardless of weather or occasion—work days, weekends, or sudden plan changes—we want to be reliable shoes you reach for without hesitation, thinking "these are perfect for today."',
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
                      src="/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png"
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
          <button className="px-20 py-4 border border-gray-900 text-xs tracking-[0.2em] hover:bg-gray-900 hover:text-white transition-all duration-300 uppercase">
            View More
          </button>
        </div>
      </div>
    </section>
  );
}

function StylingSection() {
  const stylingImages = [
    {
      image: '/image copy copy copy copy copy copy copy copy copy copy copy copy.png',
      color: 'BLACK',
      size: '25.5cm(41)',
      height: '173cm',
    },
    {
      image: '/image copy copy copy copy copy copy copy copy copy copy copy copy copy.png',
      color: 'BROWN',
      size: '25.5cm(41)',
      height: '173cm',
    },
    {
      image: '/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png',
      color: 'CHECK',
      size: '25.5cm(41)',
      height: '173cm',
    },
    {
      image: '/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png',
      color: 'PURPLE',
      size: '25.5cm(41)',
      height: '171cm',
    },
    {
      image: '/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png',
      color: 'BLACK',
      size: '24.5cm(40)',
      height: '167cm',
    },
  ];

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
          {stylingImages.map((item, index) => (
            <div key={index} className="group cursor-pointer">
              <div className="relative aspect-[3/4] bg-[#E8E8E8] overflow-hidden mb-3">
                <img
                  src={item.image}
                  alt={`${item.color} styling`}
                  className="w-full h-full object-cover"
                />
                <button className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] tracking-wider font-light">
                  {item.color} / {item.size}
                </p>
                <p className="text-[10px] text-gray-600">
                  {item.height}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <a
            href="#contact"
            className="group relative aspect-[4/3] border-2 border-gray-900 flex flex-col items-center justify-center hover:bg-gray-900 transition-all duration-300 overflow-hidden"
          >
            <h3 className="text-2xl md:text-3xl tracking-[0.3em] mb-4 group-hover:text-white transition-colors font-light">
              CONTACT
            </h3>
            <p className="text-xs tracking-[0.2em] text-gray-600 group-hover:text-white/80 transition-colors">
              お問い合わせ / Inquiries
            </p>
            <div className="absolute bottom-8 w-6 h-6 border border-gray-900 group-hover:border-white rounded-full flex items-center justify-center">
              <Mail className="w-3 h-3 text-gray-900 group-hover:text-white" strokeWidth={1.5} />
            </div>
          </a>

          <a
            href="#shop"
            className="group relative aspect-[4/3] border-2 border-gray-200 flex flex-col items-center justify-center hover:border-gray-900 transition-all duration-300 overflow-hidden"
          >
            <h3 className="text-2xl md:text-3xl tracking-[0.3em] mb-4 group-hover:text-gray-900 transition-colors font-light">
              ONLINE SHOP
            </h3>
            <p className="text-xs tracking-[0.2em] text-gray-600 group-hover:text-gray-900 transition-colors">
              オンラインショップ / Shop Now
            </p>
            <div className="absolute bottom-8 w-6 h-6 border border-gray-300 group-hover:border-gray-900 rounded-full flex items-center justify-center">
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-900" strokeWidth={1.5} />
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <h3 className="text-sm tracking-[0.3em] mb-8 font-light">WEAR INC.</h3>
            <div className="text-xs leading-loose text-gray-400 space-y-2">
              <p>服を起点と、ブランドをつくる。<br />
              <span className="text-[11px]">Creating brands starting with clothing.</span></p>
              <p>あなたの世界観をカタチにします。<br />
              <span className="text-[11px]">We bring your vision to life.</span></p>
            </div>
            <div className="text-xs leading-loose text-gray-500 pt-8 space-y-1">
              <p>〒150-0001</p>
              <p>東京都渋谷区神宮前1-1-1 代表ビル 00-00</p>
              <p>TEL: 03-0000-0000</p>
            </div>
          </div>

          <div className="flex justify-between">
            <nav className="space-y-3 text-xs tracking-wider">
              <a href="#" className="block hover:text-gray-400 transition-colors uppercase">
                Home
              </a>
              <a href="#" className="block hover:text-gray-400 transition-colors uppercase">
                Brand
              </a>
              <a href="#" className="block hover:text-gray-400 transition-colors uppercase">
                Company
              </a>
              <a href="#" className="block hover:text-gray-400 transition-colors uppercase">
                Information
              </a>
              <a href="#" className="block hover:text-gray-400 transition-colors uppercase">
                Contact
              </a>
            </nav>

            <div className="flex gap-4">
              <a href="#" className="hover:opacity-60 transition-opacity">
                <Instagram className="w-4 h-4" strokeWidth={1.5} />
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity">
                <div className="w-4 h-4 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity">
                <Youtube className="w-4 h-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center">
          <p className="text-[10px] text-gray-600 tracking-widest">
            © WEAR INC.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default App;
