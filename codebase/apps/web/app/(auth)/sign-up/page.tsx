import Link from 'next/link';
import { getGoogleSignInUrl } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthRedirectIfSignedIn } from '@/components/auth/AuthRedirectIfSignedIn';

export default function SignUpPage() {
  return (
    <>
    <AuthRedirectIfSignedIn />
    <AuthCard
      title="Get started"
      description="Create your AI-native presales workspace"
      googleUrl={getGoogleSignInUrl()}
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="text-primary underline">Sign in</Link>
        </>
      }
    />
    </>
  );
}
