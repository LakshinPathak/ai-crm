import Link from 'next/link';
import { getGoogleSignInUrl } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthRedirectIfSignedIn } from '@/components/auth/AuthRedirectIfSignedIn';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return (
    <>
    <AuthRedirectIfSignedIn />
    <AuthCard
      title="Welcome back"
      description="Sign in to your AI-native presales workspace"
      googleUrl={getGoogleSignInUrl(invite)}
      footer={
        <>
          New here?{' '}
          <Link href={invite ? `/sign-up?invite=${encodeURIComponent(invite)}` : '/sign-up'} className="font-medium text-primary underline">
            Create an account
          </Link>
        </>
      }
    />
    </>
  );
}
