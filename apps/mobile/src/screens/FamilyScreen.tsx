import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import {
  Check,
  ChevronRight,
  Copy,
  Mail,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { inr, openHistory } from '../lib/format';
import type { FamilyInfo } from '../lib/types';
import {
  Avatar,
  Btn,
  Loading,
  Notice,
  Panel,
  Screen,
  colors,
  useMe,
} from '../ui';
import { RefField } from './AuthScreen';

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
  const [fresh, setFresh] = useState<{
    email: string;
    code: string;
    emailSent: boolean;
  } | null>(null);
  // Copy-code button: shows "Copied" for a couple of seconds, or a message if the phone refuses.
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle'
  );
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );
  const copyCode = async (code: string) => {
    let next: 'copied' | 'failed' = 'copied';
    try {
      await Clipboard.setStringAsync(code);
    } catch {
      next = 'failed';
    }
    setCopyState(next);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState('idle'), 2500);
  };

  const fam = useQuery({
    queryKey: ['family'],
    queryFn: () => api<FamilyInfo>('GET', '/family'),
  });
  const invites = useQuery({
    queryKey: ['invites'],
    queryFn: () => api<Invite[]>('GET', '/family/invites'),
    enabled: isAdmin,
  });
  const invite = useMutation({
    mutationFn: () =>
      api<{ code: string; email: string; emailSent: boolean }>(
        'POST',
        '/family/invites',
        { email: email.trim() }
      ),
    onSuccess: (r) => {
      setFresh({ email: r.email, code: r.code, emailSent: r.emailSent });
      setCopyState('idle');
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
    Alert.alert(
      `Remove ${name}?`,
      'Their past expenses stay in the family records.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => remove.mutate(userId),
        },
      ]
    );

  const confirmRevoke = (id: string, inviteEmail: string) =>
    Alert.alert(
      'Revoke invite?',
      `${inviteEmail} will no longer be able to join with this code.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => revoke.mutate(id),
        },
      ]
    );
  const sendInvite = () => {
    if (!invite.isPending && email.includes('@')) invite.mutate();
  };

  return (
    <Screen
      title="Family Members"
      subtitle={fam.data?.name}
      onRefresh={() => fam.refetch()}
      refreshing={fam.isRefetching}
    >
      <Notice error={fam.error ?? remove.error} />
      {fam.isLoading ? (
        <Loading />
      ) : (
        <Panel title="Members (this month)" icon={Users} tone="blue">
          {fam.data?.members.map((m, idx) => (
            <View
              key={m.userId}
              className={`flex-row items-center gap-2 py-3 ${idx > 0 ? 'border-t border-slate-100' : ''}`}
            >
              <Pressable
                className="min-w-0 flex-1 flex-row items-center gap-3 rounded-xl p-1 active:bg-slate-50"
                accessibilityRole="button"
                accessibilityLabel={`View expenses for ${m.name}, ${m.role === 'ADMIN' ? 'Admin' : 'Member'}, spent ${inr(m.spentPaise)} this month`}
                onPress={() => openHistory(nav, { userId: m.userId })}
              >
                <Avatar name={m.name} size={42} />
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      numberOfLines={1}
                      className="shrink text-sm font-semibold text-slate-800"
                    >
                      {m.name}
                    </Text>
                    <View
                      className={`rounded-full px-2 py-0.5 ${m.role === 'ADMIN' ? 'bg-primary-50' : 'bg-slate-100'}`}
                    >
                      <Text
                        className={`text-[11px] font-medium ${m.role === 'ADMIN' ? 'text-primary-700' : 'text-slate-500'}`}
                      >
                        {m.role === 'ADMIN' ? 'Admin' : 'Member'}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} className="text-xs text-slate-500">
                    {m.email}
                  </Text>
                </View>
                <View className="shrink-0 items-end">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-semibold text-slate-800"
                  >
                    {inr(m.spentPaise)}
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-[11px] text-slate-400">
                      View expenses
                    </Text>
                    <ChevronRight size={12} color={colors.faint} />
                  </View>
                </View>
              </Pressable>
              {isAdmin && m.userId !== me.data?.user.id && (
                <Pressable
                  className="rounded-lg p-2 active:bg-rose-50"
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove member ${m.name}`}
                  onPress={() => confirmRemove(m.userId, m.name)}
                >
                  <X size={16} color={colors.faint} />
                </Pressable>
              )}
            </View>
          ))}
        </Panel>
      )}

      {isAdmin ? (
        <Panel title="Invite a member" icon={UserPlus} tone="green">
          <Notice error={invite.error} />
          <View className="gap-3">
            <View>
              <RefField
                label="Member's email"
                value={email}
                onChangeText={setEmail}
                placeholder="member@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="done"
                onSubmitEditing={sendInvite}
              />
            </View>
            <Btn
              label={invite.isPending ? 'Sending…' : 'Create invite'}
              icon={Mail}
              onPress={() => invite.mutate()}
              disabled={invite.isPending || !email.includes('@')}
            />
          </View>
          {fresh && (
            <View className="mt-4 gap-3">
              <Notice tone="success">Invitation created successfully.</Notice>
              <View className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <Text className="text-center text-xs font-medium text-slate-500">
                  Invitation code for
                </Text>
                <Text
                  selectable
                  className="mt-1 text-center text-xs font-semibold text-slate-700"
                >
                  {fresh.email}
                </Text>

                <View className="mt-3 flex-row items-stretch overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <View className="min-w-0 flex-1 justify-center px-3 py-3.5">
                    <Text
                      selectable
                      accessibilityLabel={`Invitation code ${fresh.code.split('').join(' ')}`}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      minimumFontScale={0.75}
                      className="text-center text-2xl font-extrabold tracking-wider text-slate-900"
                    >
                      {fresh.code}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Copy invitation code ${fresh.code}`}
                    accessibilityState={{ disabled: copyState === 'copied' }}
                    accessibilityLiveRegion="polite"
                    className="min-w-[88px] flex-row items-center justify-center gap-1.5 border-l border-slate-200 px-3 active:bg-slate-50"
                    onPress={() => copyCode(fresh.code)}
                    disabled={copyState === 'copied'}
                  >
                    {copyState === 'copied' ? (
                      <Check size={17} color={colors.success} />
                    ) : (
                      <Copy size={17} color={colors.text2} />
                    )}
                    <Text
                      className={`text-xs font-semibold ${copyState === 'copied' ? 'text-emerald-600' : 'text-slate-700'}`}
                    >
                      {copyState === 'copied' ? 'Copied' : 'Copy'}
                    </Text>
                  </Pressable>
                </View>
                {copyState === 'failed' ? (
                  <Text
                    accessibilityLiveRegion="polite"
                    className="mt-2 text-center text-xs text-rose-600"
                  >
                    Could not copy. Press and hold the code to select and copy
                    it.
                  </Text>
                ) : null}
                <Text className="mt-3 text-left text-xs leading-5 text-slate-500">
                  Create an account or log in with the invited email, then
                  choose &quot;Join with a verification code&quot; and enter
                  this code.
                </Text>
                <Text className="mt-1 text-left text-[11px] font-medium text-slate-400">
                  Valid for 7 days · One use only
                </Text>
              </View>
            </View>
          )}
          {invites.data && invites.data.length > 0 && (
            <View className="mt-5">
              <Text className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Pending invites
              </Text>
              <View className="gap-1.5">
                {invites.data.map((i) => (
                  <View
                    key={i.id}
                    className="flex-row items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <Text
                      numberOfLines={1}
                      className="min-w-0 flex-1 text-sm text-slate-700"
                    >
                      {i.email}
                    </Text>
                    <Pressable
                      onPress={() => confirmRevoke(i.id, i.email)}
                      disabled={revoke.isPending}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Revoke invite for ${i.email}`}
                      className="py-1"
                    >
                      <Text className="text-xs font-medium text-rose-600">
                        Revoke
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}
        </Panel>
      ) : (
        <Panel title="Your family" icon={Users}>
          <Text className="text-sm text-slate-500">
            Only the family admin can invite or remove members.
          </Text>
        </Panel>
      )}
    </Screen>
  );
}
