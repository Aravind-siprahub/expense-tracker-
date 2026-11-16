'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../_lib/api';
import { historyHref, inr } from '../../_lib/format';
import type { FamilyInfo } from '../../_lib/types';
import { Loading, Notice, PageHeader, Panel, btn, input, useMe } from '../../_components/Shell';

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
  const [fresh, setFresh] = useState<{ email: string; token: string; emailSent: boolean } | null>(null);

  const fam = useQuery({ queryKey: ['family'], queryFn: () => api<FamilyInfo>('GET', '/family') });
  const invites = useQuery({
    queryKey: ['invites'],
    queryFn: () => api<Invite[]>('GET', '/family/invites'),
    enabled: isAdmin,
  });
  const invite = useMutation({
    mutationFn: () => api<{ token: string; email: string; emailSent: boolean }>('POST', '/family/invites', { email }),
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

  return (
    <>
      <PageHeader title="Family Members" subtitle={fam.data?.name} />
      <Notice error={fam.error ?? remove.error} />
      {fam.isLoading ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Members (this month)" className="lg:col-span-2">
            <ul className="divide-y divide-gray-100">
              {fam.data?.members.map((m) => (
                <li key={m.userId} className="flex items-center justify-between py-3">
                  <Link href={historyHref({ userId: m.userId })} className="flex items-center gap-3 hover:opacity-80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 font-semibold text-primary-700">{m.name[0]}</div>
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.role === 'ADMIN' ? 'Admin' : 'Member'} · {m.email} · {inr(m.spentPaise)} · view expenses →</div>
                    </div>
                  </Link>
                  {isAdmin && m.userId !== me.data?.user.id && (
                    <button
                      className="text-sm text-red-600 hover:underline"
                      onClick={() => confirm(`Remove ${m.name}? Their past expenses stay in the family records.`) && remove.mutate(m.userId)}
                    >Remove</button>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          {isAdmin && (
            <Panel title="Invite a member">
              <Notice error={invite.error} />
              <form className="space-y-3" onSubmit={(e: FormEvent) => { e.preventDefault(); invite.mutate(); }}>
                <input className={input} type="email" placeholder="member@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button className={`${btn} w-full`} disabled={invite.isPending}>Create invite</button>
              </form>
              {fresh && (
                <div className="mt-3 space-y-2">
                  {fresh.emailSent ? (
                    <Notice tone="success">Invite emailed to {fresh.email}. They can join with one click. It expires in 7 days.</Notice>
                  ) : (
                    <>
                      <Notice tone="warn">
                        The email could not be sent (mail isn&apos;t set up or the mail server refused it). Share the code below with {fresh.email} yourself.
                      </Notice>
                      <div className="rounded-lg bg-primary-50 p-3 text-xs text-gray-700">
                        <div className="mb-1 font-semibold">Invite code for {fresh.email}</div>
                        <code className="block break-all rounded bg-white p-2">{fresh.token}</code>
                        <p className="mt-2 text-gray-500">
                          They sign up with this email, then choose &quot;Join with an invite code&quot; and paste it.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
              {invites.data && invites.data.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1 text-xs font-medium text-gray-500">Pending invites</div>
                  <ul className="space-y-1 text-sm">
                    {invites.data.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span className="truncate">{i.email}</span>
                        <button className="text-red-600 hover:underline" onClick={() => revoke.mutate(i.id)}>Revoke</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          )}
        </div>
      )}
    </>
  );
}
