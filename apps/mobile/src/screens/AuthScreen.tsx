import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { useSession } from '../session';
import { Btn, Field, Notice, Screen } from '../ui';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  login: 'Log in to your family account.',
  register: 'Create your account.',
  forgot: 'Enter your email and we will send you a reset code.',
  reset: 'Enter the code from your email and choose a new password.',
};

export function AuthScreen() {
  const { signIn, expired } = useSession();
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  async function submit() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === 'forgot') {
        await api('POST', '/auth/forgot', { email: email.trim() });
        setMode('reset');
        setInfo(`If an account exists for ${email.trim()}, we emailed a reset code. It expires in 30 minutes.`);
      } else if (mode === 'reset') {
        await api('POST', '/auth/reset', { email: email.trim(), code: code.trim(), newPassword: password });
        setPassword('');
        setCode('');
        setMode('login');
        setInfo('Your password has been changed. Log in with the new password.');
      } else {
        const res = await api<{ token: string }>(
          'POST',
          mode === 'login' ? '/auth/login' : '/auth/register',
          mode === 'login' ? { email: email.trim(), password } : { name: name.trim(), email: email.trim(), password },
        );
        await signIn(res.token);
        return; // the screen unmounts once signed in
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setBusy(false);
  }

  const label = { login: 'Log In', register: 'Create Account', forgot: 'Send reset code', reset: 'Change password' }[mode];

  return (
    <SafeAreaView className="flex-1 bg-primary-50">
      <Screen>
        <View className="mb-4 mt-10">
          <Text className="text-3xl font-bold text-primary-700">Family Expense Tracker</Text>
          <Text className="mt-1 text-gray-500">{TITLES[mode]}</Text>
        </View>
        {expired && !error && !info && <Notice tone="warn">Your session expired. Please log in again.</Notice>}
        <Notice error={error} />
        {info &&<Notice tone="success">{info}</Notice>}
        {mode === 'register' && <Field label="Full name" value={name} onChangeText={setName} placeholder="Priya Sharma" />}
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="priya@example.com" />
        {mode === 'reset' && <Field label="Reset code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="ABCD-2345" />}
        {mode !== 'forgot' && (
          <Field
            label={mode === 'reset' ? 'New password' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 8 characters"
          />
        )}
        <Btn label={busy ? 'Please wait…' : label} onPress={submit} disabled={busy} />

        {mode === 'login' && (
          <Pressable onPress={() => go('forgot')} className="items-center py-2">
            <Text className="text-sm text-primary-700">Forgot password?</Text>
          </Pressable>
        )}
        {(mode === 'login' || mode === 'register') && (
          <Pressable onPress={() => go(mode === 'login' ? 'register' : 'login')} className="items-center py-3">
            <Text className="font-semibold text-primary-700">
              {mode === 'login' ? 'Create a new account' : 'I already have an account'}
            </Text>
          </Pressable>
        )}
        {(mode === 'forgot' || mode === 'reset') && (
          <View className="items-center gap-2 py-2">
            {mode === 'forgot' && (
              <Text className="text-sm text-primary-700" onPress={() => go('reset')}>I already have a code</Text>
            )}
            <Text className="text-sm text-primary-700" onPress={() => go('login')}>Back to log in</Text>
          </View>
        )}
      </Screen>
    </SafeAreaView>
  );
}
