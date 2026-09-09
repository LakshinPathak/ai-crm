import { avatarGradient } from '@/lib/colors';
import { initials } from '@/lib/format';

type Props = {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZES = { xs: 20, sm: 28, md: 36, lg: 44 };

export function Avatar({ name, size = 'sm', className = '' }: Props) {
  const [from, to] = avatarGradient(name);
  const px = SIZES[size];
  return (
    <div
      className={`ui-avatar ui-avatar--${size} ${className}`}
      style={{
        width: px,
        height: px,
        background: `linear-gradient(135deg, ${from}, ${to})`,
      }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
