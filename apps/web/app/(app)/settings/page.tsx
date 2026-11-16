'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, setToken } from '../../_lib/api';
import { Loading, Notice, PageHeader, Panel, btn, btnGhost, input, useMe } from '../../_components/Shell';

export default function Settings() {
  const router = useRouter();
  const qc = useQueryClient();
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
        name,
        email,
        ...(newPassword ? { currentPassword, newPassword } : {}),
      });
      if (isAdmin && familyName && familyName !== me.data?.family?.name) {
        await api('PATCH', '/family', { name: familyName });
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

  const logout = () => {
    setToken(null);
    qc.clear();
    router.replace('/login');
  };

  if (me.isLoading) return <Loading />;

  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" subtitle="Profile and preferences" />
      <Notice error={save.error} />
      {saved && <Notice tone="success">Saved.</Notice>}
      <Panel>
        <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); setSaved(false); save.mutate(); }}>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Email</label>
            <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Family name {isAdmin ? '' : '(admin only)'}</label>
            <input className={input} value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Current password</label>
              <input className={input} type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">New password</label>
              <input className={input} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} placeholder="Leave empty to keep" />
            </div>
          </div>
          <div className="flex gap-3">
            <button className={`${btn} flex-1`} disabled={save.isPending}>Save</button>
            <button type="button" className={`${btnGhost} flex-1`} onClick={logout}>Log Out</button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
