import { Link } from 'react-router-dom';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, Copy, Mail, UserPlus, Users, X } from 'lucide-react';
import { api } from '../../_lib/api';
import { historyHref, inr } from '../../_lib/format';
import type { FamilyInfo } from '../../_lib/types';
import { Avatar, Loading, Notice, PageHeader, Panel, btn, input, useMe } from '../../_components/Shell';
import { FamilyArt } from '../../_components/Illustrations';

interface Invite {
  id: string;
  email: string;
  expiresAt: string;
}

export default function Family() {
  const qc = useQueryClient();
  const me = useMe();
  const isAdmin = me.data?.family?.role === 'ADMIN';
  const [email, setEmail] = useState('');
  const [fresh, setFresh] = useState<{ email: string; code: string; emailSent: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });
  const invites = useQuery({
    queryKey: ['invites'],
    queryFn: () => api<Invite[]>('GET', '/family/invites'),
    enabled: isAdmin,
  });
  const invite = useMutation({
    mutationFn: () => api<{ code: string; email: string; emailSent: boolean }>('POST', '/family/invites', { email }),
    onSuccess: (r) => {
      setFresh({ email: r.email, code: r.code, emailSent: r.emailSent });
      setCopied(false);
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

  return (
    <>
      <PageHeader title="Family Members" subtitle={fam.data?.name} />
      <Notice error={fam.error ?? remove.error} />
      {fam.isLoading ? <Loading /> : (
        <div className="grid gap-5 lg:grid-cols-5">
          <Panel title="Members (this month)" icon={Users} tone="blue" className="lg:col-span-3">
            <ul className="divide-y divide-slate-100">
              {fam.data?.members.map((m) => (
                <li key={m.userId} className="flex items-center gap-2 py-3">
                  <Link to={historyHref({ userId: m.userId })} className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 transition hover:bg-slate-50">
                    <Avatar name={m.name} size={42} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-800">{m.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${m.role === 'ADMIN' ? 'bg-primary-50 text-primary-700' : 'bg-slate-100 text-slate-500'}`}>
                          {m.role === 'ADMIN' ? 'Admin' : 'Member'}
                        </span>
                      </div>
                      <div className="truncate text-xs text-slate-500">{m.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-800">{inr(m.spentPaise)}</div>
                      <div className="flex items-center justify-end text-[11px] text-slate-400">View expenses <ChevronRight size={12} /></div>
                    </div>
                  </Link>
                  {isAdmin && m.userId !== me.data?.user.id && (
                    <button
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Remove ${m.name}`}
                      title="Remove member"
                      onClick={() => confirm(`Remove ${m.name}? Their past expenses stay in the family records.`) && remove.mutate(m.userId)}
                    >
                      <X size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-5 lg:col-span-2">
            {isAdmin ? (
              <Panel title="Invite a member" icon={UserPlus} tone="green">
                <Notice error={invite.error} />
                <form className="space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); invite.mutate(); }}>
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={`${input} !pl-10`} type="email" placeholder="member@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <button className={`${btn} w-full`} disabled={invite.isPending}>
                    {invite.isPending ? 'Sending…' : 'Create invite'}
                  </button>
                </form>
                {fresh && (
                  <div className="mt-4 space-y-2">
                    {fresh.emailSent ? (
                      <Notice tone="success">Invite emailed to {fresh.email} with a verification code. It expires in 7 days.</Notice>
                    ) : (
                      <Notice tone="warn">
                        The email could not be sent (mail isn&apos;t set up or the mail server refused it). Give the code below to {fresh.email} yourself.
                      </Notice>
                    )}
                    <div className="rounded-xl bg-slate-50 p-4 text-center">
                      <div className="text-xs font-medium text-slate-500">Verification code for {fresh.email}</div>
                      <div className="my-2 font-mono text-3xl font-bold tracking-[0.25em] text-slate-900">{fresh.code}</div>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
                        onClick={() => {
                          navigator.clipboard?.writeText(fresh.code).then(() => setCopied(true)).catch(() => undefined);
                        }}
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy code'}
                      </button>
                      <p className="mt-3 text-xs text-slate-500">
                        They create an account or log in with <strong>{fresh.email}</strong>, then choose &quot;Join with a verification code&quot; and enter it. It works once, and only with that email.
                      </p>
                    </div>
                  </div>
                )}
                {invites.data && invites.data.length > 0 && (
                  <div className="mt-5">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Pending invites</div>
                    <ul className="space-y-1.5 text-sm">
                      {invites.data.map((i) => (
                        <li key={i.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <span className="truncate text-slate-700">{i.email}</span>
                          <button className="text-xs font-medium text-rose-600 hover:underline" onClick={() => revoke.mutate(i.id)}>Revoke</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Panel>
            ) : (
              <Panel title="Your family" icon={Users}>
                <p className="text-sm text-slate-500">Only the family admin can invite or remove members.</p>
              </Panel>
            )}
            <div className="hidden justify-center lg:flex"><FamilyArt className="h-32 w-44" /></div>
          </div>
        </div>
      )}
    </>
  );
}
