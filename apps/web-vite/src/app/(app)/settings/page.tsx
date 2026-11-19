import { useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Eye, EyeOff, LogOut, User } from 'lucide-react';
import { api, setToken } from '../../_lib/api';
import { Label, Loading, Notice, PageHeader, Panel, btn, btnGhost, input, useMe } from '../../_components/Shell';
import { SettingsArt } from '../../_components/Illustrations';
import { PaymentMethods } from '../../_components/PaymentMethods';
import { InstallPanel } from '../../_components/InstallApp';

function PasswordField({
  value,
  onChange,
  placeholder,
  minLength,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className={`${input} !pr-11`}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minLength={minLength}
      />
      <button
        type="button"
        aria-label={show ? 'Hide password' : 'Show password'}
        onClick={() => setShow(!show)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
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
    navigate('/login', { replace: true });
  };

  if (me.isLoading) return <Loading />;

  return (
    <>
      <PageHeader title="Settings" subtitle="Profile and preferences" />
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title="Profile Information" icon={User} tone="blue" className="lg:col-span-3">
          <Notice error={save.error} />
          {saved && (
            <Notice tone="success">
              <span className="flex items-center gap-2"><Check size={16} /> Saved.</span>
            </Notice>
          )}
          <form className="space-y-4" onSubmit={(e: FormEvent) => { e.preventDefault(); setSaved(false); save.mutate(); }}>
            <div>
              <Label>Name</Label>
              <input className={input} value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
            </div>
            <div>
              <Label>Email</Label>
              <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Family name{isAdmin ? '' : ' (admin only)'}</Label>
              <input className={input} value={familyName} onChange={(e) => setFamilyName(e.target.value)} disabled={!isAdmin} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Current password</Label>
                <PasswordField value={currentPassword} onChange={setCurrentPassword} />
              </div>
              <div>
                <Label>New password</Label>
                <PasswordField value={newPassword} onChange={setNewPassword} placeholder="Leave empty to keep" minLength={8} />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button className={`${btn} flex-1`} disabled={save.isPending}>
                <Check size={16} /> {save.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" className={`${btnGhost} flex-1`} onClick={logout}>
                <LogOut size={16} /> Log Out
              </button>
            </div>
          </form>
        </Panel>
        <div className="hidden items-center justify-center lg:col-span-2 lg:flex">
          <SettingsArt className="h-56 w-72" />
        </div>
      </div>

      <div className="mt-5 lg:max-w-[60%]">
        <InstallPanel />
      </div>

      <div className="mt-8">
        <h2 className="mb-1 text-lg font-bold tracking-tight text-slate-900">Payment methods</h2>
        <p className="mb-4 text-sm text-slate-500">
          Save your cards and bank accounts to pick them quickly when adding an expense. Only you can see them.
        </p>
        <PaymentMethods />
      </div>
    </>
  );
}
