import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { House, LogOut, Users } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from '../session';
import { Btn, Notice, Panel, Screen, colors } from '../ui';
import { RefField, type InputRef } from './AuthScreen';

export function OnboardingScreen({ name }: { name: string }) {
  const qc = useQueryClient();
  const { signOut } = useSession();
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const codeRef = useRef<InputRef>(null);
  const done = () => qc.invalidateQueries();
  const create = useMutation({ mutationFn: () => api('POST', '/family', { name: familyName.trim() }), onSuccess: done });
  const join = useMutation({ mutationFn: () => api('POST', '/invites/accept', { code: code.trim() }), onSuccess: done });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }}>
      <Screen title={`Welcome, ${name}`} subtitle="Create your family group, or join one with the verification code from your invite email.">
        <Panel title="Create a family" icon={House}>
          <View className="gap-3">
            <Notice error={create.error} />
            <RefField
              label="Family name"
              value={familyName}
              onChangeText={setFamilyName}
              placeholder="e.g. Sharma Family"
              autoCapitalize="words"
              maxLength={60}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!create.isPending && familyName.trim().length >= 2) create.mutate();
              }}
            />
            <Btn
              label={create.isPending ? 'Creating…' : 'Create Family'}
              onPress={() => create.mutate()}
              disabled={create.isPending || familyName.trim().length < 2}
            />
          </View>
        </Panel>
        <Panel title="Join with a verification code" icon={Users} tone="green">
          <View className="gap-3">
            <Notice error={join.error} />
            <RefField
              ref={codeRef}
              label="Verification code"
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="ABCD-2345"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (!join.isPending && code.trim().length >= 6) join.mutate();
              }}
            />
            <Text className="text-xs text-slate-500">
              Use the 8-character code from the email, and sign in with the same email address the invite was sent to.
            </Text>
            <Btn
              variant="ghost"
              label={join.isPending ? 'Checking…' : 'Join Family'}
              onPress={() => join.mutate()}
              disabled={join.isPending || code.trim().length < 6}
            />
          </View>
        </Panel>
        <Btn variant="ghost" label="Log out" icon={LogOut} onPress={signOut} />
      </Screen>
    </SafeAreaView>
  );
}
