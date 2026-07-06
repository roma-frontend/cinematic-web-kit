'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setPref } from '@/hooks/use-user-prefs';
import { useMounted } from '@/hooks/use-mounted';

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = resolvedTheme === 'dark';
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      className={className}
      onClick={() => {
        const next = isDark ? 'light' : 'dark';
        setTheme(next);
        setPref('theme', next); // follows the account across browsers
      }}
    >
      {mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
