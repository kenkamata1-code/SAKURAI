import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Target, Heart, Leaf, Users } from 'lucide-react';

export default function About() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.substring(1);
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-white z-10" />
        <img
          src="https://images.pexels.com/photos/3935702/pexels-photo-3935702.jpeg"
          alt="THE LONG GAME"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 text-center px-4">
          <h1 className="text-5xl md:text-7xl tracking-[0.3em] font-light text-white mb-4">
            THE LONG GAME
          </h1>
          <p className="text-sm md:text-base tracking-[0.2em] text-white/90">
            Built with Discipline, Updated with Time.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-6 font-light">
              OUR MISSION
            </h2>
            <p className="text-lg md:text-xl tracking-[0.1em] text-gray-800 mb-12 font-light">
              ― 日常における、最適解をつくる ―
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-8 text-sm text-gray-600 leading-loose text-center">
            <p>
              私たちは、ビジネスの現場で日常的に革靴を履いてきました。<br />
              <span className="text-xs text-gray-500">We have worn dress shoes daily in business settings.</span>
            </p>

            <p>
              毎日の通勤や移動、天候の変化。革靴は本来、休ませ、回し、使い切る道具であるにもかかわらず、現実の選択肢は、その前提からずれていると感じてきました。<br />
              <span className="text-xs text-gray-500">Through daily commutes, travel, and changing weather, we've felt that despite dress shoes being tools meant to be rotated, rested, and fully utilized, the reality of available options has diverged from this principle.</span>
            </p>

            <p>
              その結果、一足を酷使せざるを得ず、靴が増える一方で使われないものが残り、高価であっても登板頻度が低いという状況が生まれている。コストパフォーマンスも、日常での満足度も、最適化されていません。<br />
              <span className="text-xs text-gray-500">As a result, we're forced to overuse one pair while others accumulate unused, and expensive shoes see little wear. Neither cost performance nor daily satisfaction is optimized.</span>
            </p>

            <p className="pt-4">
              Built with discipline.<br />
              日々の生活での使い方を前提に、規律ある設計を行うこと。<br />
              <span className="text-xs text-gray-500">Designed with discipline based on how they are used in daily life.</span>
            </p>

            <p>
              Updated with time.<br />
              ライフスタイルに合わせて、止まらず静かに更新していくこと。<br />
              <span className="text-xs text-gray-500">Continuously and quietly evolving to match changing lifestyles.</span>
            </p>

            <p className="pt-8 text-base">
              THE LONG GAME は、<br />
              ビジネスマン自身が設計に向き合うからこそ、日常の中で最も合理的に使われる一足をつくります。<br />
              <span className="text-xs text-gray-500">Because we are businessmen ourselves facing design challenges, we create shoes that are most rationally used in daily life.</span>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-20 md:py-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              OUR VALUES
            </h2>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              私たちの価値観 / Our Core Values
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 border border-gray-300 flex items-center justify-center mx-auto">
                <Target className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm tracking-wider font-light">
                規律ある設計<br />
                <span className="text-xs text-gray-500">Disciplined Design</span>
              </h3>
              <p className="text-xs text-gray-600 leading-loose">
                使う人の日常を深く理解し、妥協なく設計することで、本当に必要な機能だけを実装します。<br />
                <span className="text-[10px] text-gray-500 block mt-2">By deeply understanding the daily lives of users and designing without compromise, we implement only the truly necessary features.</span>
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 border border-gray-300 flex items-center justify-center mx-auto">
                <Leaf className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm tracking-wider font-light">
                継続的な改善<br />
                <span className="text-xs text-gray-500">Continuous Update</span>
              </h3>
              <p className="text-xs text-gray-600 leading-loose">
                働き方の変化に合わせて、静かに、しかし確実に製品を更新し続けます。<br />
                <span className="text-[10px] text-gray-500 block mt-2">We continuously update our products quietly yet steadily, adapting to changes in work styles.</span>
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 border border-gray-300 flex items-center justify-center mx-auto">
                <Heart className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm tracking-wider font-light">
                日常への最適化<br />
                <span className="text-xs text-gray-500">Daily Optimization</span>
              </h3>
              <p className="text-xs text-gray-600 leading-loose">
                特別な日のためではなく、毎日使うことを前提とした合理的な設計を追求します。<br />
                <span className="text-[10px] text-gray-500 block mt-2">We pursue rational design premised on daily use, not for special occasions.</span>
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 border border-gray-300 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-gray-800" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm tracking-wider font-light">
                使い手の視点<br />
                <span className="text-xs text-gray-500">User's Perspective</span>
              </h3>
              <p className="text-xs text-gray-600 leading-loose">
                ビジネスマン自身が設計に向き合うからこそ、現場の実態に即した製品を実現します。<br />
                <span className="text-[10px] text-gray-500 block mt-2">Because businessmen themselves engage in design, we realize products that match the reality of the field.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="our-approach" className="py-20 md:py-32 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              OUR APPROACH
            </h2>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              製品への取り組み / Our Approach to Craftsmanship
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-12">
            <div className="border-l-2 border-gray-900 pl-8">
              <h3 className="text-xl tracking-wider font-light mb-4 text-gray-800">
                厳選された素材<br />
                <span className="text-sm text-gray-500">Premium Materials</span>
              </h3>
              <p className="text-sm text-gray-600 leading-loose">
                イタリア・イルチア社の最高級スエードを採用。<br />
                高級感と実用性を両立し、日常使いに適した撥水性と手入れのしやすさを実現しています。<br />
                <span className="text-xs text-gray-500 block mt-4 leading-relaxed">
                  We use premium suede from Ilcea, Italy.<br />
                  It combines refined elegance with everyday practicality, offering water repellency and easy maintenance suitable for daily wear.
                </span>
              </p>
            </div>

            <div className="border-l-2 border-gray-900 pl-8">
              <h3 className="text-xl tracking-wider font-light mb-4 text-gray-800">
                日本人のためのラスト<br />
                <span className="text-sm text-gray-500">Japanese Last Design</span>
              </h3>
              <p className="text-sm text-gray-600 leading-loose">
                トップブランドのシルエット研究を重ね、日本人の足型で最もバランスよく見えるラインを追求。<br />
                履き心地と見た目の美しさを両立しています。<br />
                <span className="text-xs text-gray-500 block mt-4 leading-relaxed">
                  Through extensive study of top global brands, we refined a silhouette that best suits Japanese foot shapes.<br />
                  The result is a last that balances comfort with a clean, elegant appearance.
                </span>
              </p>
            </div>

            <div className="border-l-2 border-gray-900 pl-8">
              <h3 className="text-xl tracking-wider font-light mb-4 text-gray-800">
                合理的な価格設計<br />
                <span className="text-sm text-gray-500">Rational Pricing</span>
              </h3>
              <p className="text-sm text-gray-600 leading-loose">
                製法とコスト構造を見直し、上質な素材と設計を保ちながら、<br />
                日常で使い続けられる現実的な価格を実現しています。<br />
                <span className="text-xs text-gray-500 block mt-4 leading-relaxed">
                  By rethinking construction methods and cost structure,<br />
                  we maintain premium materials and design while achieving a realistic price point for everyday use.
                </span>
              </p>
            </div>

            <div className="border-l-2 border-gray-900 pl-8">
              <h3 className="text-xl tracking-wider font-light mb-4 text-gray-800">
                耐久性と快適性<br />
                <span className="text-sm text-gray-500">Durability & Comfort</span>
              </h3>
              <p className="text-sm text-gray-600 leading-loose">
                オリジナルラバーソールとEVAクッションの組み合わせにより、<br />
                雨天時も安心して歩け、長時間の移動でも疲れにくい設計です。<br />
                <span className="text-xs text-gray-500 block mt-4 leading-relaxed">
                  The combination of an original rubber sole and EVA cushioning<br />
                  provides stability in wet conditions and comfort that lasts through long hours of walking.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 text-white py-20 md:py-32 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-6 font-light">
            EXPERIENCE THE DIFFERENCE
          </h2>
          <p className="text-xs tracking-[0.15em] text-gray-400 mb-8">
            違いを体験する / Feel the Difference
          </p>
          <p className="text-sm text-gray-300 leading-loose mb-12 max-w-2xl mx-auto">
            日常で使うことを前提に設計された、本当に合理的な一足。<br />
            THE LONG GAMEは、働く人の現実に寄り添い続けます。<br />
            <span className="text-xs text-gray-400 mt-4 block">
              Truly rational shoes designed for daily use.<br />
              THE LONG GAME continues to stay close to the reality of working professionals.
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
