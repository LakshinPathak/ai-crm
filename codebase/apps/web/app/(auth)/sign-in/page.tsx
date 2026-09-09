import Link from 'next/link';
import { getGoogleSignInUrl } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthRedirectIfSignedIn } from '@/components/auth/AuthRedirectIfSignedIn';

export default function SignInPage() {
  return (
    <>
    <AuthRedirectIfSignedIn />
    <AuthCard
      title="Welcome back"
      description="Sign in to your AI-native presales workspace"
      googleUrl={getGoogleSignInUrl()}
      footer={
        <>
          New here?{' '}
          <Link href="/sign-up" className="text-primary underline">Create an account</Link>
        </>
      }
    />
    </>
  );
}
