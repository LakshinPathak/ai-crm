import Link from 'next/link';
import { getGoogleSignInUrl } from '@/lib/auth';
import { AuthCard } from '@/components/auth/AuthCard';
import { AuthRedirectIfSignedIn } from '@/components/auth/AuthRedirectIfSignedIn';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  return (
    <>
    <AuthRedirectIfSignedIn />
    <AuthCard
      title="Get started"
      description="Create your AI-native presales workspace"
      googleUrl={getGoogleSignInUrl(invite)}
      footer={
        <>
          Already have an account?{' '}
          <Link href={invite ? `/sign-in?invite=${encodeURIComponent(invite)}` : '/sign-in'} className="font-medium text-primary underline">
            Sign in
          </Link>
        </>
      }
    />
    </>
  );
}
