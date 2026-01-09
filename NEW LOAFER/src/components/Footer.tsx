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
              <Link to="/" className="block hover:text-gray-400 transition-colors uppercase">
                Home
              </Link>
              <Link to="/about" className="block hover:text-gray-400 transition-colors uppercase">
                About
              </Link>
              <Link to="/shop" className="block hover:text-gray-400 transition-colors uppercase">
                Shop
              </Link>
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
