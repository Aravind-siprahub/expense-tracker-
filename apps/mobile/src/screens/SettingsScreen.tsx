import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Check, LogOut, User } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from '../session';
import { Btn, Loading, Notice, Panel, Screen, useMe } from '../ui';
import { PaymentMethodsSection } from '../PaymentMethods';
import { PasswordField, RefField, type InputRef } from './AuthScreen';
import type { Me } from '../lib/types';

export function SettingsScreen() {
  const me = useMe();

  if (me.isLoading)
    return (
      <Screen title="Settings" subtitle="Profile and preferences">
        <Loading />
      </Screen>
    );
  if (me.error || !me.data)
    return (
      <Screen title="Settings" subtitle="Profile and preferences">
        <Notice error={me.error} />
      </Screen>
    );

  return <SettingsForm key={me.data.user.id} initial={me.data} />;
}

function SettingsForm({ initial }: { initial: Me }) {
  const qc = useQueryClient();
  const { signOut } = useSession();
  const isAdmin = initial.family?.role === 'ADMIN';
  const [name, setName] = useState(initial.user.name);
  const [email, setEmail] = useState(initial.user.email);
  const [familyName, setFamilyName] = useState(initial.family?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const emailRef = useRef<InputRef>(null);
  const familyRef = useRef<InputRef>(null);
  const currentRef = useRef<InputRef>(null);
  const newRef = useRef<InputRef>(null);

  const save = useMutation({
    mutationFn: async () => {
      await api('PATCH', '/me', {
        name: name.trim(),
        email: email.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      if (
        isAdmin &&
        familyName.trim() &&
        familyName.trim() !== initial.family?.name
      ) {
        await api('PATCH', '/family', { name: familyName.trim() });
      }
    },
    onSuccess: () => {
      setSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['family'] });
    },
  });

  const submit = () => {
    if (save.isPending) return;
    setSaved(false);
    save.mutate();
  };

  return (
    <Screen title="Settings" subtitle="Profile and preferences">
      <Panel title="Profile Information" icon={User} tone="blue">
        <View className="gap-4">
          <Notice error={save.error} />
          {saved && <Notice tone="success">Saved.</Notice>}
          <RefField
            label="Name"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
          <RefField
            ref={emailRef}
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onSubmitEditing={() =>
              (isAdmin ? familyRef : currentRef).current?.focus()
            }
          />
          <RefField
            ref={familyRef}
            label={`Family name${isAdmin ? '' : ' (admin only)'}`}
            value={familyName}
            onChangeText={setFamilyName}
            editable={isAdmin}
            autoCapitalize="words"
            returnKeyType="next"
            onSubmitEditing={() => currentRef.current?.focus()}
          />
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            inputRef={currentRef}
            returnKeyType="next"
            onSubmitEditing={() => newRef.current?.focus()}
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Leave empty to keep"
            inputRef={newRef}
            isNew
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View className="flex-row gap-3 pt-1">
            <View className="flex-1">
              <Btn
                label={save.isPending ? 'Saving…' : 'Save Changes'}
                icon={Check}
                onPress={submit}
                disabled={save.isPending}
              />
            </View>
            <View className="flex-1">
              <Btn
                label="Log Out"
                variant="ghost"
                icon={LogOut}
                onPress={signOut}
              />
            </View>
          </View>
        </View>
      </Panel>

      <PaymentMethodsSection />
    </Screen>
  );
}
