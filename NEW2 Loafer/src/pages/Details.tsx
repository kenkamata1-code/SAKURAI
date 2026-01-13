import { usePageTracking } from '../hooks/usePageTracking';

export default function Details() {
  usePageTracking('/details', 'Details');

  const designPhilosophies = [
    {
      number: '01',
      title: '日常で選ばれる、合理的なローファー設計',
      titleEn: 'Rational loafer design chosen for daily use',
      description: '主張しすぎないコインローファーの佇まいを軸に、仕事にも休日にも自然に馴染むことを前提に設計しています。',
      descriptionEn: 'Centered on the understated presence of a coin loafer, designed to naturally fit both work and weekends.',
      image: '/details-01.jpg',
    },
    {
      number: '02',
      title: '軽快さと端正さを両立するモカ縫いとシルエット',
      titleEn: 'Moc stitching and silhouette balancing lightness and refinement',
      description: '重厚になりすぎないモカ縫いの表情と、縫い位置を内寄りにした設計により、足先が大きく見えない、すっきりとした印象を実現しました。',
      descriptionEn: 'With moc stitching that avoids being too heavy and inward-positioned seams, we achieved a clean impression that doesn\'t make your feet look large.',
      image: '/details-02.jpg',
    },
    {
      number: '03',
      title: '日本人の足に合う幅感と安定感',
      titleEn: 'Width and stability suited for Japanese feet',
      description: '細さだけを追求せず、外側のラインで包み込むように設計。見た目の美しさと、履いたときの安定感を両立しています。',
      descriptionEn: 'Rather than just pursuing slimness, we designed the outer lines to wrap around the foot. Achieving both visual beauty and stability when worn.',
      image: '/details-03.jpg',
    },
    {
      number: '04',
      title: '後ろ姿まで考えた、無駄のない縫製',
      titleEn: 'Streamlined stitching, designed from every angle',
      description: 'トップラインからヒールまで一体感のある仕上げとし、装飾を抑えたクリーンなバックスタイルに。長く履いても印象が古くなりません。',
      descriptionEn: 'With cohesive finishing from top line to heel and minimal decoration for a clean back style. The impression stays fresh even after long wear.',
      image: '/details-04.jpg',
    },
    {
      number: '05',
      title: '気兼ねなく履ける、雨対応ソール設計',
      titleEn: 'Rain-ready sole design for worry-free wear',
      description: 'グリップ力と耐久性を考慮したラバーソールを採用。天候を気にせず、日常の移動に対応します。',
      descriptionEn: 'Rubber soles designed for grip and durability. Ready for daily commutes regardless of weather.',
      image: '/details-05.jpg',
    },
    {
      number: '06',
      title: '長時間を想定したクッション構造',
      titleEn: 'Cushion structure designed for long hours',
      description: '中底にクッション材を組み込み、その上にレザーを重ねることで、長時間の移動や立ち仕事でも負担を感じにくい履き心地を実現しました。',
      descriptionEn: 'With cushion material built into the midsole and leather layered on top, we achieved comfort that reduces strain during long hours of travel or standing work.',
      image: '/details-06.jpg',
    },
  ];

  const maintenanceSteps = [
    {
      step: '01',
      title: '履いたあとは、軽くブラッシング',
      titleEn: 'Light brushing after wear',
      description: '一日の終わりに、全体を軽くブラッシング。ホコリや表面の汚れを落とすだけで、風合いを保ちやすくなります。',
      descriptionEn: 'At the end of each day, lightly brush the entire surface. Simply removing dust and surface dirt helps maintain the texture.',
      image: '/maintenance-01.jpg',
    },
    {
      step: '02',
      title: '防水スプレーで、事前にひと手間（任意）',
      titleEn: 'Water-repellent spray preparation (optional)',
      description: '履き始める前、または定期的に防水スプレーを使用すると、雨や汚れを弾きやすくなり、日常使いでの安心感が高まります。かけすぎず、全体に軽く吹きかける程度で十分です。',
      descriptionEn: 'Using water-repellent spray before first wear or periodically helps repel rain and dirt, adding peace of mind for daily use. A light application is sufficient—don\'t overdo it.',
      image: '/maintenance-02.jpg',
    },
    {
      step: '03',
      title: '汚れが気になったら、部分ケア',
      titleEn: 'Spot care when dirt is noticeable',
      description: '軽い汚れは、ブラッシングで対応可能。必要に応じて、スエード用のケア用品で部分的に整えてください。',
      descriptionEn: 'Light dirt can be addressed with brushing. Use suede care products for spot treatment as needed.',
      image: '/maintenance-03.jpg',
    },
    {
      step: '04',
      title: '濡れた場合は、自然乾燥',
      titleEn: 'Air dry when wet',
      description: '雨に濡れたときは、風通しのよい場所で自然乾燥。直射日光やドライヤーなどの強い熱は避けてください。',
      descriptionEn: 'When wet from rain, air dry in a well-ventilated area. Avoid direct sunlight and strong heat sources like hair dryers.',
      image: '/maintenance-04.jpg',
    },
    {
      step: '05',
      title: '定期的に休ませる',
      titleEn: 'Regular rest periods',
      description: '毎日続けて履かず、1日休ませることで、形崩れや劣化を防ぎ、長く履き続けられます。',
      descriptionEn: 'Instead of wearing daily, rest them for a day to prevent shape loss and deterioration, enabling longer wear.',
      image: '/maintenance-05.jpg',
    },
  ];

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <h1 className="text-3xl md:text-4xl tracking-[0.3em] mb-6 font-light">
            DESIGN PHILOSOPHY
          </h1>
          <p className="text-xs tracking-[0.15em] text-gray-500 mb-8">
            日常を前提にした、6つの設計思想 / Six Design Principles for Daily Use
          </p>
        </div>
      </section>

      {/* Design Philosophies */}
      <section className="pb-20 md:pb-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="space-y-24 md:space-y-32">
            {designPhilosophies.map((item, index) => (
              <div
                key={item.number}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-8xl font-light text-gray-300">{item.number}</span>
                    </div>
                  </div>
                </div>

                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] text-gray-400 mb-2">
                      PHILOSOPHY {item.number}
                    </p>
                    <h3 className="text-xl md:text-2xl font-light leading-relaxed text-gray-800">
                      {item.title}
                    </h3>
                  </div>

                  <p className="text-sm text-gray-600 leading-loose">
                    {item.description}
                  </p>

                  <div className="pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-light text-gray-500 mb-2 leading-relaxed">
                      {item.titleEn}
                    </h4>
                    <p className="text-xs text-gray-400 leading-loose">
                      {item.descriptionEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Maintenance Section */}
      <section className="bg-gray-50 py-20 md:py-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-4xl tracking-[0.3em] mb-6 font-light">
              MAINTENANCE
            </h2>
            <p className="text-xs tracking-[0.15em] text-gray-500 mb-8">
              日常で使い続けるための、シンプルなケア / Simple Care for Daily Use
            </p>
            <div className="max-w-2xl mx-auto">
              <p className="text-sm text-gray-600 leading-loose mb-4">
                この靴は、特別な手間をかけなくても、<br />
                日常の中で無理なく付き合えることを前提に設計しています。
              </p>
              <p className="text-sm text-gray-600 leading-loose mb-4">
                必要なのは、最低限のケアだけ。<br />
                それでも、佇まいと履き心地はきちんと保たれます。
              </p>
              <p className="text-xs text-gray-400 leading-loose mt-6">
                These shoes are designed to require minimal effort, allowing you to enjoy them naturally in your daily life.
                All you need is basic care—yet the appearance and comfort will be properly maintained.
              </p>
            </div>
          </div>

          <div className="text-center mb-16">
            <h3 className="text-lg tracking-[0.2em] font-light text-gray-800">
              基本のメンテナンスステップ
            </h3>
            <p className="text-xs tracking-[0.15em] text-gray-500 mt-2">
              Basic Maintenance Steps
            </p>
          </div>

          <div className="space-y-16">
            {maintenanceSteps.map((item, index) => (
              <div
                key={item.step}
                className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                  index % 2 === 1 ? '' : ''
                }`}
              >
                <div className={`${index % 2 === 1 ? 'lg:order-2' : ''}`}>
                  <div className="aspect-[4/3] bg-white border border-gray-200 overflow-hidden">
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl font-light text-gray-200">Step {item.step}</span>
                    </div>
                  </div>
                </div>

                <div className={`space-y-6 ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] text-gray-400 mb-2">
                      STEP {item.step}
                    </p>
                    <h4 className="text-lg md:text-xl font-light leading-relaxed text-gray-800">
                      {item.title}
                    </h4>
                  </div>

                  <p className="text-sm text-gray-600 leading-loose">
                    {item.description}
                  </p>

                  <div className="pt-6 border-t border-gray-200">
                    <h5 className="text-sm font-light text-gray-500 mb-2 leading-relaxed">
                      {item.titleEn}
                    </h5>
                    <p className="text-xs text-gray-400 leading-loose">
                      {item.descriptionEn}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-6 bg-gray-900 text-white">
        <div className="max-w-[1200px] mx-auto text-center">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-6 font-light">
            EXPLORE OUR COLLECTION
          </h2>
          <p className="text-xs tracking-[0.15em] text-gray-400 mb-8">
            コレクションを見る / View Our Products
          </p>
          <p className="text-sm text-gray-300 leading-loose mb-12 max-w-2xl mx-auto">
            日常で使うことを前提に設計された、本当に合理的な一足。<br />
            <span className="text-xs text-gray-400 mt-2 block">
              Truly rational shoes designed for daily use.
            </span>
          </p>
          <a
            href="/shop"
            className="inline-block px-12 py-4 border border-white text-xs tracking-[0.2em] hover:bg-white hover:text-gray-900 transition uppercase"
          >
            Shop Now
          </a>
        </div>
      </section>
    </div>
  );
}

