import { useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('お問い合わせを送信しました。担当者より折り返しご連絡いたします。');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('送信に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-32 pb-20 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-20">
            <h1 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
              CONTACT
            </h1>
            <p className="text-xs tracking-[0.15em] text-gray-500">
              お問い合わせ / Get in Touch
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-16">
            <div className="lg:col-span-2 space-y-12">
              <div>
                <h2 className="text-xl tracking-[0.1em] font-light mb-6">
                  お問い合わせフォーム<br />
                  <span className="text-sm text-gray-500">Contact Form</span>
                </h2>
                <p className="text-sm text-gray-600 leading-loose">
                  商品やサービスに関するご質問、ご意見、ご要望など、お気軽にお問い合わせください。
                  担当者より2営業日以内にご連絡させていただきます。<br />
                  <span className="text-xs text-gray-500">
                    Feel free to contact us with any questions, comments, or requests regarding our products or services.
                    We will get back to you within 2 business days.
                  </span>
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 border border-gray-300 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm tracking-wider font-light mb-1">Email</h3>
                    <p className="text-xs text-gray-600">info@thelonggame.com</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 border border-gray-300 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm tracking-wider font-light mb-1">Phone</h3>
                    <p className="text-xs text-gray-600">03-0000-0000</p>
                    <p className="text-xs text-gray-500 mt-1">平日 10:00 - 18:00 / Weekdays 10:00 - 18:00</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 border border-gray-300 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-gray-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-sm tracking-wider font-light mb-1">Address</h3>
                    <p className="text-xs text-gray-600">
                      〒000-0000<br />
                      東京都〇〇区〇〇 0-0-0
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="space-y-6 border border-gray-200 p-8">
                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                    お名前 / Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="山田 太郎 / Taro Yamada"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                    メールアドレス / Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="example@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                    件名 / Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="お問い合わせ件名 / Inquiry Subject"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                    メッセージ / Message *
                  </label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="お問い合わせ内容をご記入ください / Please enter your inquiry"
                  />
                </div>

                <div className="text-xs text-gray-500 leading-loose">
                  お客様の個人情報は、お問い合わせへの回答およびサービス向上のためにのみ使用します。
                  詳しくは<a href="#" className="underline hover:text-gray-900">プライバシーポリシー</a>をご確認ください。<br />
                  <span className="text-xs text-gray-400">
                    Your personal information will only be used to respond to your inquiry and improve our services.
                    Please see our <a href="#" className="underline hover:text-gray-900">Privacy Policy</a> for more details.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition disabled:opacity-50 uppercase"
                >
                  {submitting ? '送信中... / Sending...' : '送信する / Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-[1200px] mx-auto text-center">
          <h2 className="text-2xl md:text-3xl tracking-[0.3em] mb-6 font-light">
            よくある質問 / FAQ
          </h2>
          <p className="text-sm text-gray-300 leading-loose mb-12 max-w-2xl mx-auto">
            よくお問い合わせいただく内容をまとめました。
            お問い合わせの前にぜひご確認ください。
            <br />
            <span className="text-xs text-gray-400">
              We've compiled frequently asked questions.
              Please check before contacting us.
            </span>
          </p>
          <button className="inline-block px-12 py-4 border border-white text-xs tracking-[0.2em] hover:bg-white hover:text-gray-900 transition uppercase">
            よくある質問を見る / View FAQ
          </button>
        </div>
      </section>
    </div>
  );
}
