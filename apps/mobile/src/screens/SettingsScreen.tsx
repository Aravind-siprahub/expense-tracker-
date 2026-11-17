import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useSession } from '../session';
import { Btn, Field, Loading, Notice, Panel, Screen, useMe } from '../ui';
import { PaymentMethodsSection } from '../PaymentMethods';

export function SettingsScreen() {
  const qc = useQueryClient();
  const { signOut } = useSession();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!me.data) return;
    setName(me.data.user.name);
    setEmail(me.data.user.email);
    setFamilyName(me.data.family?.name ?? '');
  }, [me.data]);

  const save = useMutation({
    mutationFn: async () => {
      await api('PATCH', '/me', {
        name: name.trim(),
        email: email.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      if (isAdmin && familyName.trim() && familyName.trim() !== me.data?.family?.name) {
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

  if (me.isLoading) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Notice error={save.error} />
      {saved && <Notice tone="success">Saved.</Notice>}
      <Panel title="Profile">
        <View className="gap-3">
          <Field label="Name" value={name} onChangeText={setName} />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label={`Family name${isAdmin ? '' : ' (admin only)'}`} value={familyName} onChangeText={setFamilyName} editable={isAdmin} />
        </View>
      </Panel>
      <Panel title="Change password">
        <View className="gap-3">
          <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
          <Field label="New password (min 8)" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        </View>
      </Panel>
      <Btn label={save.isPending ? 'Saving…' : 'Save'} onPress={() => { setSaved(false); save.mutate(); }} disabled={save.isPending} />
      <PaymentMethodsSection />
      <Btn label="Log Out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
