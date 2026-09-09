type Props = {
  size?: number;
  className?: string;
};

/** Gradient mark — connected context nodes (brand identity) */
export function LogoMark({ size = 32, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-grad" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7c3aed" />
          <stop offset="0.5" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="logo-grad-inner" x1="12" y1="12" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#logo-grad)" />
      <circle cx="20" cy="20" r="5.5" fill="url(#logo-grad-inner)" />
      <circle cx="11" cy="13" r="3" fill="white" fillOpacity="0.9" />
      <circle cx="29" cy="13" r="3" fill="white" fillOpacity="0.9" />
      <circle cx="11" cy="27" r="3" fill="white" fillOpacity="0.9" />
      <circle cx="29" cy="27" r="3" fill="white" fillOpacity="0.9" />
      <path
        d="M14 13.5L17.2 17M22.8 17L26 13.5M14 26.5L17.2 23M22.8 23L26 26.5"
        stroke="white"
        strokeOpacity="0.55"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
