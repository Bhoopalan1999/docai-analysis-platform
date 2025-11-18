import { SignInForm } from '@/components/auth/SignInForm';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 mb-4"
          >
            <Logo />
            <span className="text-xl font-bold">DocAI</span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account to continue</p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}
