import { Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-16 px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid md:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <h3 className="text-sm tracking-[0.3em] mb-8 font-light">THE LONG GAME</h3>
            <div className="text-xs leading-loose text-gray-400 space-y-2">
              <p>Built with discipline.<br />
              <span className="text-[11px]">日々の生活での使い方を前提に、規律ある設計を行うこと。</span></p>
              <p>Updated with time.<br />
              <span className="text-[11px]">ライフスタイルに合わせて、止まらず静かに更新していくこと。</span></p>
            </div>
            <div className="text-xs leading-loose text-gray-500 pt-8 space-y-1">
              <p>〒150-0001</p>
              <p>東京都渋谷区神宮前1-1-1 代表ビル 00-00</p>
              <p>TEL: 03-0000-0000</p>
            </div>
          </div>

          <div className="flex justify-between">
            <nav className="space-y-3 text-xs tracking-wider">
              <Link to="/" className="block hover:text-gray-400 transition-colors uppercase">
                Home
              </Link>
              <Link to="/shop" className="block hover:text-gray-400 transition-colors uppercase">
                Online Shop
              </Link>
              <Link to="/about" className="block hover:text-gray-400 transition-colors uppercase">
                About
              </Link>
              <Link to="/contact" className="block hover:text-gray-400 transition-colors uppercase">
                Contact
              </Link>
              <Link to="/login" className="block hover:text-gray-400 transition-colors uppercase">
                Log In
              </Link>
            </nav>

            <div className="flex gap-4">
              <a href="#" className="hover:opacity-60 transition-opacity">
                <Instagram className="w-4 h-4" strokeWidth={1.5} />
              </a>
              <a href="#" className="hover:opacity-60 transition-opacity">
                <Youtube className="w-4 h-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 text-center space-y-4">
          <img
            src="/image copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy copy.png"
            alt="THE LONG GAME Logo"
            className="h-12 w-auto mx-auto opacity-40"
          />
          <p className="text-[10px] text-gray-600 tracking-widest">
            © THE LONG GAME
          </p>
        </div>
      </div>
    </footer>
  );
}
