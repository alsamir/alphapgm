'use client';

import { Turnstile as TurnstileWidget } from '@marsidev/react-turnstile';

interface TurnstileProps {
  onSuccess: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function Turnstile({ onSuccess, onError, onExpire }: TurnstileProps) {
  if (!SITE_KEY) return null;

  return (
    <div className="flex justify-center">
      <TurnstileWidget
        siteKey={SITE_KEY}
        onSuccess={onSuccess}
        onError={onError}
        onExpire={onExpire}
        options={{
          theme: 'dark',
          size: 'flexible',
        }}
      />
    </div>
  );
}
