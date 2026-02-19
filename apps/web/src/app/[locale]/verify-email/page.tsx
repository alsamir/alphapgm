'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'no-token'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('no-token');
      return;
    }

    const verify = async () => {
      try {
        const res = await api.verifyEmail(token);
        setStatus('success');
        setMessage(res.data?.message || 'Email verified successfully');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Verification failed');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-32 pb-20 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
                <p className="text-sm text-muted-foreground">Please wait a moment</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <h2 className="text-xl font-semibold mb-2">Email Verified!</h2>
                <p className="text-sm text-muted-foreground mb-6">{message}</p>
                <p className="text-sm text-muted-foreground mb-6">Your account is now fully activated. You can start using all features.</p>
                <Button asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                <h2 className="text-xl font-semibold mb-2">Verification Failed</h2>
                <p className="text-sm text-muted-foreground mb-6">{message}</p>
                <p className="text-sm text-muted-foreground mb-6">The verification link may have expired or already been used.</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" asChild>
                    <Link href="/login">Sign In</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/register">Register Again</Link>
                  </Button>
                </div>
              </>
            )}

            {status === 'no-token' && (
              <>
                <Mail className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We sent a verification link to your email address.
                  Click the link to verify your account.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/login">Back to Sign In</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
