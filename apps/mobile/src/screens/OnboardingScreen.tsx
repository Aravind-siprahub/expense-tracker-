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
  const join = useMutation({ mutationFn: () => api('POST', '/invites/accept', { token: code.trim() }), onSuccess: done });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Screen>
        <Text className="mt-4 text-2xl font-bold text-gray-900">Welcome, {name}</Text>
        <Text className="text-gray-500">Create your family group, or join one with an invite code.</Text>
        <Panel title="Create a family">
          <Notice error={create.error} />
          <Field value={familyName} onChangeText={setFamilyName} placeholder="e.g. Sharma Family" />
          <Text />
          <Btn label="Create Family" onPress={() => create.mutate()} disabled={create.isPending || familyName.trim().length < 2} />
        </Panel>
        <Panel title="Join with an invite code">
          <Notice error={join.error} />
          <Field value={code} onChangeText={setCode} placeholder="Paste invite code" autoCapitalize="none" />
          <Text />
          <Btn variant="ghost" label="Join Family" onPress={() => join.mutate()} disabled={join.isPending || code.trim().length < 10} />
        </Panel>
        <Btn variant="ghost" label="Log out" onPress={signOut} />
      </Screen>
    </SafeAreaView>
  );
}
