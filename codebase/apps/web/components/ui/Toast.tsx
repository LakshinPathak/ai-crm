'use client';

import { toast as sonnerToast } from 'sonner';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info';

function showToast(message: string, type: ToastType = 'info') {
  switch (type) {
    case 'success':
      sonnerToast.success(message);
      break;
    case 'error':
      sonnerToast.error(message);
      break;
    case 'info':
    default:
      sonnerToast.info(message);
      break;
  }
}

/** @deprecated Passthrough kept for routes not yet on Sonner Toaster. Prefer `@/components/ui/sonner`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

/** @deprecated Prefer `import { toast } from 'sonner'` directly. Maps to Sonner under the hood. */
export function useToast() {
  return { toast: showToast };
}
