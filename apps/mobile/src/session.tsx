import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { loadToken, saveToken, setUnauthorizedHandler } from './lib/api';

interface Session {
  ready: boolean;
  signedIn: boolean;
  /** True when the user was logged out because the session ended (not by choosing to log out). */
  expired: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    loadToken().then((t) => {
      setSignedIn(!!t);
      setReady(true);
    });
  }, []);

  const signOut = useCallback(async () => {
    await saveToken(null);
    qc.clear();
    setExpired(false);
    setSignedIn(false);
  }, [qc]);

  const signIn = useCallback(
    async (token: string) => {
      await saveToken(token);
      qc.clear();
      setExpired(false);
      setSignedIn(true);
    },
    [qc],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => {
      signOut().then(() => setExpired(true));
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(
    () => ({ ready, signedIn, expired, signIn, signOut }),
    [ready, signedIn, expired, signIn, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
