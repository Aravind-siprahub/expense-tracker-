import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { inr, openHistory } from '../lib/format';
import type { FamilyInfo } from '../lib/types';
import { Btn, Field, Loading, Notice, Panel, Screen, useMe } from '../ui';

interface Invite {
  id: string;
  email: string;
  expiresAt: string;
}

export function FamilyScreen() {
  const nav = useNavigation<any>();
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [fresh, setFresh] = useState<{ email: string; token: string; emailSent: boolean } | null>(null);

  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });
  const invites = useQuery({ queryKey: ['invites'], queryFn: () => api<Invite[]>('GET', '/family/invites'), enabled: isAdmin });
  const invite = useMutation({
    mutationFn: () =>
      api<{ token: string; email: string; emailSent: boolean }>('POST', '/family/invites', { email: email.trim() }),
    onSuccess: (r) => {
      setFresh({ email: r.email, token: r.token, emailSent: r.emailSent });
      setEmail('');
      qc.invalidateQueries({ queryKey: ['invites'] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api('DELETE', `/family/invites/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => api('DELETE', `/family/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
  const confirmRemove = (userId: string, name: string) =>
    Alert.alert(`Remove ${name}?`, 'Their past expenses stay in the family records.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => remove.mutate(userId) },
    ]);

  return (
    <Screen onRefresh={() => fam.refetch()} refreshing={fam.isRefetching}>
      <Notice error={fam.error ?? remove.error} />
      {fam.isLoading ? (
        <Loading />
      ) : (
        <Panel title={`${fam.data?.name ?? ''} · members this month`}>
          {fam.data?.members.map((m) => (
            <View key={m.userId} className="flex-row items-center justify-between border-b border-gray-100 py-3">
              <Pressable className="flex-1 pr-3" onPress={() => openHistory(nav, { userId: m.userId })}>
                <Text className="font-medium text-gray-900">{m.name} ›</Text>
                <Text className="text-xs text-gray-500">
                  {m.role === 'ADMIN' ? 'Admin' : 'Member'} · {m.email} · {inr(m.spentPaise)} · tap to view expenses
                </Text>
              </Pressable>
              {isAdmin && m.userId !== me.data?.user.id && (
                <Text className="text-sm text-red-600" onPress={() => confirmRemove(m.userId, m.name)}>Remove</Text>
              )}
            </View>
          ))}
        </Panel>
      )}

      {isAdmin && (
        <Panel title="Invite a member">
          <Notice error={invite.error} />
          <View className="gap-3">
            <Field value={email} onChangeText={setEmail} placeholder="member@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Btn label="Create invite" onPress={() => invite.mutate()} disabled={invite.isPending || !email.includes('@')} />
          </View>
          {fresh && (
            <View className="mt-3 gap-2">
              {fresh.emailSent ? (
                <Notice tone="success">Invite emailed to {fresh.email}. It expires in 7 days.</Notice>
              ) : (
                <>
                  <Notice tone="warn">The email could not be sent. Share the code below with {fresh.email} yourself.</Notice>
                  <View className="mt-1 rounded-lg bg-primary-50 p-3">
                    <Text className="mb-1 text-xs font-semibold text-gray-700">Invite code for {fresh.email}</Text>
                    <Text selectable className="rounded bg-white p-2 text-xs text-gray-900">{fresh.token}</Text>
                    <Text className="mt-2 text-xs text-gray-500">
                      Share this code with them. They sign up with this email, then paste the code to join. It expires in 7 days.
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}
          {invites.data && invites.data.length > 0 && (
            <View className="mt-4">
              <Text className="mb-1 text-xs font-medium text-gray-500">Pending invites</Text>
              {invites.data.map((i) => (
                <View key={i.id} className="flex-row justify-between py-1">
                  <Text className="flex-1 text-sm text-gray-700">{i.email}</Text>
                  <Text className="text-sm text-red-600" onPress={() => revoke.mutate(i.id)}>Revoke</Text>
                </View>
              ))}
            </View>
          )}
        </Panel>
      )}
    </Screen>
  );
}
