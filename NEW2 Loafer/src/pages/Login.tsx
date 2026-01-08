import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { SignUpData } from '../contexts/AuthContext';
import { Lock, ArrowLeft, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [address, setAddress] = useState('');
  const [gender, setGender] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        const userInfo: SignUpData = {
          firstName,
          lastName,
          phone,
          postalCode,
          address,
          gender,
          birthDate,
        };
        await signUp(email, password, userInfo);
        navigate('/');
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      if (isSignUp) {
        setError('登録に失敗しました。入力内容を確認してください。');
      } else {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      }
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMessage('');
    setResetLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setResetMessage('パスワードリセットのメールを送信しました。メールをご確認ください。');
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetMessage('');
      }, 3000);
    } catch (err) {
      setResetMessage('メール送信に失敗しました。メールアドレスを確認してください。');
      console.error('Reset password error:', err);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs tracking-wider text-gray-600 hover:text-gray-900 transition uppercase"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            ホームに戻る
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-gray-300 mb-6">
            <Lock className="w-6 h-6 text-gray-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-3xl tracking-[0.3em] mb-3 font-light">
            {isSignUp ? 'SIGN UP' : 'LOGIN'}
          </h1>
          <p className="text-xs tracking-[0.15em] text-gray-500">
            {isSignUp ? 'アカウント作成 / Create Account' : 'ログイン / Sign In'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 border border-gray-200 p-8">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
              placeholder="your@example.com"
            />
          </div>

          <div>
            <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          {isSignUp && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2">
                    姓 / Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="山田"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-wider text-gray-600 mb-2">
                    名 / First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                    placeholder="太郎"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2">
                  電話番号 / Phone
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  placeholder="090-1234-5678"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2">
                  郵便番号 / Postal Code
                </label>
                <input
                  type="text"
                  required
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  placeholder="123-4567"
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2">
                  住所 / Address
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  placeholder="東京都渋谷区..."
                />
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2">
                  性別 / Gender
                </label>
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm bg-white"
                >
                  <option value="">選択してください</option>
                  <option value="male">男性 / Male</option>
                  <option value="female">女性 / Female</option>
                  <option value="other">その他 / Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-wider text-gray-600 mb-2">
                  生年月日 / Birth Date
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition disabled:opacity-50 uppercase"
          >
            {loading ? (isSignUp ? 'Creating Account...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Login')}
          </button>

          {!isSignUp && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-xs tracking-wider text-gray-600 hover:text-gray-900 transition"
              >
                パスワードをお忘れですか？
              </button>
            </div>
          )}

          <div className="text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs tracking-wider text-gray-600 hover:text-gray-900 transition uppercase"
            >
              {isSignUp ? 'すでにアカウントをお持ちですか？ログイン' : 'アカウントをお持ちでない方は登録'}
            </button>
          </div>
        </form>
      </div>

      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-6 z-50">
          <div className="bg-white w-full max-w-md border border-gray-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg tracking-wider font-light">パスワードリセット</h2>
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetEmail('');
                  setResetMessage('');
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordReset} className="p-6">
              {resetMessage && (
                <div className={`p-4 mb-4 border text-sm ${
                  resetMessage.includes('送信しました')
                    ? 'bg-green-50 border-green-200 text-green-600'
                    : 'bg-red-50 border-red-200 text-red-600'
                }`}>
                  {resetMessage}
                </div>
              )}

              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                登録されているメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
              </p>

              <div className="mb-6">
                <label className="block text-xs tracking-wider text-gray-600 mb-2 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:border-gray-900 focus:outline-none text-sm"
                  placeholder="your@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={resetLoading}
                className="w-full py-3 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition disabled:opacity-50 uppercase"
              >
                {resetLoading ? '送信中...' : 'リセットメールを送信'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
