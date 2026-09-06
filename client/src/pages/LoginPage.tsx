import { FC, useState, FormEvent } from 'react';
import { Mail, Lock, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('harvinder@reachinbox.ai');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans text-gray-900 select-none">
      {/* Top Branding Header */}
      <div className="mb-6 flex items-center gap-2">
        <div className="w-8 h-8 bg-black text-white font-extrabold text-sm rounded flex items-center justify-center tracking-tighter shadow-xs">
          ONE
        </div>
        <span className="font-extrabold text-xl text-gray-900 tracking-tight">ONE</span>
        <span className="text-xs text-gray-400 font-semibold px-2 py-0.5 rounded bg-gray-200/60 ml-1">
          ReachInbox Email Scheduler
        </span>
      </div>

      {/* Centered Login Card */}
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-sm p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Login</h1>
          <p className="text-xs text-gray-500 mt-1">
            Welcome back! Access your ReachInbox email scheduler workspace.
          </p>
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={onLoginSuccess}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2.5 px-4 rounded-md text-sm transition-colors shadow-2xs mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.2.0 10.04.0 12s.47 3.8 1.29 5.42l3.99-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-xs text-gray-400 font-medium whitespace-nowrap">
            or sign up through email
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email ID"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            icon={<Mail className="w-4 h-4 text-gray-400" />}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            icon={<Lock className="w-4 h-4 text-gray-400" />}
            required
          />

          <div className="pt-2">
            <Button variant="primary" fullWidth type="submit" size="md">
              Login
            </Button>
          </div>
        </form>
      </div>

      {/* Bottom Footer Text */}
      <div className="mt-8 text-center text-xs text-gray-400 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-green-600" />
        <span>Powered by ReachInbox Email Scheduler Core Engine</span>
      </div>
    </div>
  );
};
