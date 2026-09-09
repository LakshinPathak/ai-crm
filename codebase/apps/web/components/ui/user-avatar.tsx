import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarGradient } from '@/lib/colors';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[10px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
} as const;

export function UserAvatar({
  name,
  size = 'sm',
  className,
}: {
  name: string;
  className?: string;
  size?: keyof typeof SIZE_CLASS;
}) {
  const [from, to] = avatarGradient(name);

  return (
    <Avatar className={cn(SIZE_CLASS[size], className)}>
      <AvatarFallback
        className="font-semibold text-white"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
