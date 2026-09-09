import Link from 'next/link';
import { getGoogleSignInUrl } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';

export default function SignInPage() {
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your AI-native presales workspace"
      googleUrl={getGoogleSignInUrl()}
      footer={
        <>
          Dev mode: use POST /api/v1/auth/dev-login, then paste token at{' '}
          <Link href="/auth/callback" className="text-primary underline">
            /auth/callback
          </Link>
        </>
      }
    />
  );
}
