"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  defaultTheme = "light",
  enableSystem = false,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider defaultTheme={defaultTheme} enableSystem={enableSystem} {...props}>
      {children}
    </NextThemesProvider>
  );
}
