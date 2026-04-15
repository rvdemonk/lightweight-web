import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';

export function useGoogleSignIn(onSuccess: (credential: string) => void) {
  const [googleReady, setGoogleReady] = useState(false);
  const [clientId, setClientId] = useState('');
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onSuccess);
  callbackRef.current = onSuccess;

  useEffect(() => {
    api.getConfig().then(config => {
      if (config.google_client_id) setClientId(config.google_client_id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!clientId) return;

    const initGoogle = () => {
      const google = (window as any).google;
      if (google?.accounts?.id) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp: { credential: string }) => callbackRef.current(resp.credential),
        });
        setGoogleReady(true);
      }
    };

    // Script may already be loaded (HMR, multiple mounts)
    if ((window as any).google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogle;
    document.head.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    if (!googleReady || !buttonRef.current) return;
    const google = (window as any).google;
    google.accounts.id.renderButton(buttonRef.current, {
      theme: 'filled_black',
      size: 'large',
      width: 320,
      text: 'signin_with',
    });
  }, [googleReady]);

  return { buttonRef, googleReady };
}
