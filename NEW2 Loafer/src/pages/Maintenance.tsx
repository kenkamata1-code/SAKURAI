import { Link } from 'react-router-dom';
import { usePageTracking } from '../hooks/usePageTracking';

export default function Maintenance() {
  usePageTracking('/maintenance', 'Maintenance');

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
            MAINTENANCE
          </h1>
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
      </section>

      {/* Maintenance Steps */}
      <section className="bg-gray-50 pb-20 md:pb-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center py-16 mb-8">
            <h2 className="text-lg tracking-[0.2em] font-light text-gray-800">
              基本のメンテナンスステップ
            </h2>
            <p className="text-xs tracking-[0.15em] text-gray-500 mt-2">
              Basic Maintenance Steps
            </p>
          </div>

          <div className="space-y-16">
            {maintenanceSteps.map((item, index) => (
              <div
                key={item.step}
                className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
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
                    <h3 className="text-lg md:text-xl font-light leading-relaxed text-gray-800">
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
          <Link
            to="/shop"
            className="inline-block px-12 py-4 border border-white text-xs tracking-[0.2em] hover:bg-white hover:text-gray-900 transition uppercase"
          >
            Shop Now
          </Link>
        </div>
      </section>
    </div>
  );
}


