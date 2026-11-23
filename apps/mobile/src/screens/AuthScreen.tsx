import { useRef, useState, type ComponentProps, type ComponentRef, type ReactElement, type Ref } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff, House } from 'lucide-react-native';
import { api } from '../lib/api';
import { useSession } from '../session';
import { Btn, Field, Notice, colors, navShadow, cardShadow } from '../ui';

export type InputRef = ComponentRef<typeof TextInput>;

/** `Field` with a typed `ref` (React 19 passes it through to the TextInput), so forms can move focus between fields. */
export const RefField = Field as (props: ComponentProps<typeof Field> & { ref?: Ref<InputRef> }) => ReactElement;

type Mode = 'login' | 'register' | 'forgot' | 'reset';

const HEADINGS: Record<Mode, { title: string; subtitle: string }> = {
  login: { title: 'Welcome back', subtitle: 'Log in to your family account.' },
  register: { title: 'Create your account', subtitle: 'Start tracking your family spending.' },
  forgot: { title: 'Forgot password', subtitle: "We'll email you a code to choose a new password." },
  reset: { title: 'Choose a new password', subtitle: 'Enter the code from your email.' },
};

function getPasswordStrength(p: string): { label: string; bar: string; text: string; width: `${number}%` } {
  if (!p) return { label: '', bar: 'bg-slate-200', text: 'text-slate-400', width: '0%' };
  let score = 0;
  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (score <= 2) return { label: 'Weak (min 8 characters)', bar: 'bg-rose-500', text: 'text-rose-600', width: '33%' };
  if (score <= 3) return { label: 'Good', bar: 'bg-amber-500', text: 'text-amber-600', width: '66%' };
  return { label: 'Strong', bar: 'bg-emerald-500', text: 'text-emerald-600', width: '100%' };
}

/** Password input with a show/hide eye, like the web's. */
export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  inputRef,
  returnKeyType,
  onSubmitEditing,
  isNew = false,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  inputRef?: Ref<InputRef>;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  /** True when choosing a new password (enables the OS "suggest strong password" flow). */
  isNew?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View>
      {label ? <Text className="mb-1.5 text-xs font-medium text-slate-500">{label}</Text> : null}
      <View>
        <TextInput
          ref={inputRef}
          accessibilityLabel={label ?? 'Password'}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.faint}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={isNew ? 'new-password' : 'current-password'}
          textContentType={isNew ? 'newPassword' : 'password'}
          returnKeyType={returnKeyType ?? 'done'}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`rounded-xl border bg-white py-3 pl-3.5 pr-11 text-sm text-slate-900 ${
            focused ? 'border-primary-400' : 'border-slate-200'
          }`}
        />
        <Pressable
          onPress={() => setShow((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={show ? 'Hide password' : 'Show password'}
          className="absolute right-3 top-0 h-full justify-center"
        >
          {show ? <EyeOff size={18} color={colors.faint} /> : <Eye size={18} color={colors.faint} />}
        </Pressable>
      </View>
    </View>
  );
}

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
  const nameRef = useRef<InputRef>(null);
  const emailRef = useRef<InputRef>(null);
  const codeRef = useRef<InputRef>(null);
  const passRef = useRef<InputRef>(null);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  async function submit() {
    if (busy) return;
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
  const strength = getPasswordStrength(password);
  const head = HEADINGS[mode];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16, paddingTop: 32, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
        >
          <View className="mb-6 items-center">
            <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-primary-600" style={navShadow}>
              <House size={28} color={colors.white} />
            </View>
            <Text accessibilityRole="header" className="text-center text-xl font-bold text-primary-800">Family Expense Tracker</Text>
          </View>

          <View className="rounded-3xl border border-slate-200/70 bg-white p-5" style={cardShadow}>
            <Text accessibilityRole="header" className="text-xl font-bold tracking-tight text-slate-900">{head.title}</Text>
            <Text className="mt-1 text-sm text-slate-500">{head.subtitle}</Text>

            <View className="mt-5 gap-4">
              {expired && !error && !info && <Notice tone="warn">Your session expired. Please log in again.</Notice>}
              <Notice error={error} />
              {info ? <Notice tone="success">{info}</Notice> : null}

              {mode === 'register' && (
                <RefField
                  ref={nameRef}
                  label="Full name"
                  value={name}
                  onChangeText={setName}
                  placeholder="Priya Sharma"
                  autoComplete="name"
                  textContentType="name"
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              )}
              <RefField
                ref={emailRef}
                label={mode === 'forgot' ? undefined : 'Email'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel="Email"
                placeholder={mode === 'forgot' ? 'you@example.com' : 'priya@example.com'}
                returnKeyType={mode === 'forgot' ? 'done' : 'next'}
                onSubmitEditing={() => {
                  if (mode === 'forgot') submit();
                  else if (mode === 'reset') codeRef.current?.focus();
                  else passRef.current?.focus();
                }}
              />
              {mode === 'reset' && (
                <RefField
                  ref={codeRef}
                  label="Reset code from your email"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  placeholder="ABCD-2345"
                  returnKeyType="next"
                  onSubmitEditing={() => passRef.current?.focus()}
                />
              )}
              {mode !== 'forgot' && (
                <View>
                  <PasswordField
                    label={mode === 'reset' ? 'New password' : 'Password'}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
                    inputRef={passRef}
                    isNew={mode !== 'login'}
                    returnKeyType="done"
                    onSubmitEditing={submit}
                  />
                  {mode === 'register' && password.length > 0 && (
                    <View className="mt-2 gap-1" accessible accessibilityLabel={`Password strength: ${strength.label}`}>
                      <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <View className={`h-full ${strength.bar}`} style={{ width: strength.width }} />
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-[11px] text-slate-400">Password strength:</Text>
                        <Text className={`text-[11px] font-medium ${strength.text}`}>{strength.label}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}

              <Btn label={busy ? 'Please wait…' : label} onPress={submit} disabled={busy} />

              {mode === 'login' && (
                <Pressable
                  onPress={() => go('forgot')}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                  hitSlop={8}
                  className="items-center py-1"
                >
                  <Text className="text-sm font-medium text-primary-600">Forgot password?</Text>
                </Pressable>
              )}

              {(mode === 'login' || mode === 'register') && (
                <View className="flex-row flex-wrap items-center justify-center border-t border-slate-100 pt-4">
                  <Text className="text-sm text-slate-500">
                    {mode === 'login' ? 'New here? ' : 'Already have an account? '}
                  </Text>
                  <Pressable
                    onPress={() => go(mode === 'login' ? 'register' : 'login')}
                    accessibilityRole="button"
                    accessibilityLabel={mode === 'login' ? 'Create an account' : 'Log in'}
                    hitSlop={8}
                  >
                    <Text className="text-sm font-semibold text-primary-600">
                      {mode === 'login' ? 'Create an account' : 'Log in'}
                    </Text>
                  </Pressable>
                </View>
              )}
              {(mode === 'forgot' || mode === 'reset') && (
                <View className="items-center gap-2 border-t border-slate-100 pt-4">
                  {mode === 'forgot' && (
                    <Pressable onPress={() => go('reset')} accessibilityRole="button" accessibilityLabel="I already have a code" hitSlop={8}>
                      <Text className="text-sm font-medium text-primary-600">I already have a code</Text>
                    </Pressable>
                  )}
                  {mode === 'reset' && (
                    <Pressable onPress={() => go('forgot')} accessibilityRole="button" accessibilityLabel="Send me a new code" hitSlop={8}>
                      <Text className="text-sm font-medium text-primary-600">Send me a new code</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => go('login')} accessibilityRole="button" accessibilityLabel="Back to log in" hitSlop={8}>
                    <Text className="text-sm font-medium text-primary-600">Back to log in</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
