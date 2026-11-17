import { useState } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from '../session';
import { Btn, Field, Notice, Panel, Screen } from '../ui';

export function OnboardingScreen({ name }: { name: string }) {
  const qc = useQueryClient();
  const { signOut } = useSession();
  const [familyName, setFamilyName] = useState('');
  const [code, setCode] = useState('');
  const done = () => qc.invalidateQueries();
  const create = useMutation({ mutationFn: () => api('POST', '/family', { name: familyName.trim() }), onSuccess: done });
  const join = useMutation({ mutationFn: () => api('POST', '/invites/accept', { code: code.trim() }), onSuccess: done });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Screen>
        <Text className="mt-4 text-2xl font-bold text-gray-900">Welcome, {name}</Text>
        <Text className="text-gray-500">Create your family group, or join one with the verification code from your invite email.</Text>
        <Panel title="Create a family">
          <Notice error={create.error} />
          <Field value={familyName} onChangeText={setFamilyName} placeholder="e.g. Sharma Family" />
          <Text />
          <Btn label="Create Family" onPress={() => create.mutate()} disabled={create.isPending || familyName.trim().length < 2} />
        </Panel>
        <Panel title="Join with a verification code">
          <Notice error={join.error} />
          <Field
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABCD-2345"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />
          <Text className="mt-2 text-xs text-gray-500">
            Use the 8-character code from the email, and sign in with the same email address the invite was sent to.
          </Text>
          <Text />
          <Btn variant="ghost" label={join.isPending ? 'Checking…' : 'Join Family'} onPress={() => join.mutate()} disabled={join.isPending || code.trim().length < 6} />
        </Panel>
        <Btn variant="ghost" label="Log out" onPress={signOut} />
      </Screen>
    </SafeAreaView>
  );
}
