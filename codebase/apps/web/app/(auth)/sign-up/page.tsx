import Link from 'next/link';
import { getGoogleSignInUrl } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';

export default function SignUpPage() {
  return (
    <AuthCard
      title="Get started"
      description="Create your AI-native presales workspace"
      googleUrl={getGoogleSignInUrl()}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary underline">Sign in</Link>
          <br />
          <span className="mt-2 inline-block">
            Dev mode: use POST /api/v1/auth/dev-login, then paste token at{' '}
            <Link href="/auth/callback" className="text-primary underline">
              /auth/callback
            </Link>
          </span>
        </>
      }
    />
  );
}
