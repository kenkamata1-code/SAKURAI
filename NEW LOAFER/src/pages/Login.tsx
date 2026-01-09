import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        navigate('/');
      } else {
        await signIn(email, password);
        navigate('/');
      }
    } catch (err) {
      if (isSignUp) {
        setError('登録に失敗しました。メールアドレスとパスワードを確認してください。');
      } else {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
      }
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gray-900 text-white text-xs tracking-[0.2em] hover:bg-gray-800 transition disabled:opacity-50 uppercase"
          >
            {loading ? (isSignUp ? 'Creating Account...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Login')}
          </button>

          <div className="text-center pt-4">
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
    </div>
  );
}
