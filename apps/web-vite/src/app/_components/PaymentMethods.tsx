import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, CreditCard, Eye, EyeOff, Landmark, Pencil, Plus, Star, Trash2, X } from 'lucide-react';
import { api } from '../_lib/api';
import type { SavedMethod } from '../_lib/types';
import { IconTile, Label, Loading, Notice, Panel, btn, btnGhost, input } from './ui';

export const SAVED_METHODS_KEY = ['payment-methods'];

/** The logged-in user's saved cards and bank accounts. Shared by Settings and Add Expense. */
export function useSavedMethods() {
  return useQuery({
    queryKey: SAVED_METHODS_KEY,
    queryFn: async () => (await api<{ items: SavedMethod[] }>('GET', '/payment-methods')).items,
  });
}

const digits = (s: string) => s.replace(/\D/g, '');

/** Settings section: add, edit, delete and choose defaults for cards and bank accounts. */
export function PaymentMethods() {
  const methods = useSavedMethods();
  const items = methods.data ?? [];
  return (
    <div className="space-y-5">
      <Notice error={methods.error} />
      {methods.isLoading ? (
        <Loading />
      ) : (
        <>
          <Section kind="CARD" items={items.filter((m) => m.type === 'CARD')} />
          <Section kind="BANK" items={items.filter((m) => m.type === 'BANK')} />
        </>
      )}
    </div>
  );
}

function Section({ kind, items }: { kind: 'CARD' | 'BANK'; items: SavedMethod[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<'add' | string | null>(null); // 'add' or the id being edited
  const isCard = kind === 'CARD';
  const refresh = () => {
    qc.invalidateQueries({ queryKey: SAVED_METHODS_KEY });
    qc.invalidateQueries({ queryKey: ['expenses'] });
    qc.invalidateQueries({ queryKey: ['expense'] });
  };
  const makeDefault = useMutation({
    mutationFn: (id: string) => api('POST', `/payment-methods/${id}/default`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api('DELETE', `/payment-methods/${id}`),
    onSuccess: refresh,
  });

  return (
    <Panel
      title={isCard ? 'Cards' : 'Bank accounts'}
      icon={isCard ? CreditCard : Landmark}
      tone={isCard ? 'purple' : 'teal'}
      action={
        form === null ? (
          <button className={`${btnGhost} !px-3 !py-1.5 text-xs`} onClick={() => setForm('add')}>
            <Plus size={14} /> {isCard ? 'Add card' : 'Add bank account'}
          </button>
        ) : undefined
      }
    >
      <Notice error={makeDefault.error ?? remove.error} />

      {form !== null && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <MethodForm
            kind={kind}
            existing={form === 'add' ? undefined : items.find((m) => m.id === form)}
            onDone={() => {
              setForm(null);
              refresh();
            }}
            onCancel={() => setForm(null)}
          />
        </div>
      )}

      {items.length === 0 && form === null ? (
        <p className="py-3 text-sm text-slate-500">
          {isCard
            ? 'No saved cards yet. Save a card to pick it quickly when you add an expense. Only the last 4 digits are stored.'
            : 'No saved bank accounts yet. Your account number is stored encrypted.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((m) => (
            <MethodRow
              key={m.id}
              m={m}
              busy={makeDefault.isPending || remove.isPending}
              onEdit={() => setForm(m.id)}
              onDefault={() => makeDefault.mutate(m.id)}
              onDelete={() => {
                const what = isCard ? 'card' : 'bank account';
                if (confirm(`Delete this ${what}? Past expenses that used it are kept.`)) remove.mutate(m.id);
              }}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function MethodRow({
  m,
  busy,
  onEdit,
  onDefault,
  onDelete,
}: {
  m: SavedMethod;
  busy: boolean;
  onEdit: () => void;
  onDefault: () => void;
  onDelete: () => void;
}) {
  const isCard = m.type === 'CARD';
  return (
    <li className="py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <IconTile icon={isCard ? CreditCard : Landmark} tone={isCard ? 'purple' : 'teal'} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-800">
              {m.nickname || (isCard ? 'Card' : 'Bank account')}
            </span>
            {isCard && m.cardType && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                {m.cardType === 'CREDIT' ? 'Credit' : 'Debit'}
              </span>
            )}
            {m.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                <Star size={11} /> Default
              </span>
            )}
          </div>
          <div className="font-mono text-xs tracking-wide text-slate-500">{m.maskedNumber}</div>
        </div>
        <div className="flex items-center gap-1">
          {!m.isDefault && (
            <button
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary-600 transition hover:bg-primary-50 disabled:opacity-50"
              onClick={onDefault}
              disabled={busy}
            >
              Set default
            </button>
          )}
          <button aria-label="Edit" title="Edit" className="rounded-lg p-2 text-slate-400 transition hover:bg-primary-50 hover:text-primary-600" onClick={onEdit}>
            <Pencil size={16} />
          </button>
          <button aria-label="Delete" title="Delete" className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50" onClick={onDelete} disabled={busy}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {!isCard && <RevealAccount id={m.id} />}
    </li>
  );
}

/** "Show full account number": needs the password again and hides itself after 15 seconds. */
function RevealAccount({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [number, setNumber] = useState<string | null>(null);

  const reveal = useMutation({
    mutationFn: () => api<{ accountNumber: string }>('POST', `/payment-methods/${id}/reveal`, { password }),
    onSuccess: (r) => {
      setNumber(r.accountNumber);
      setPassword('');
    },
  });

  useEffect(() => {
    if (!number) return;
    const timer = setTimeout(() => setNumber(null), 15_000);
    return () => clearTimeout(timer);
  }, [number]);

  const close = () => {
    setOpen(false);
    setNumber(null);
    setPassword('');
    reveal.reset();
  };

  if (!open) {
    return (
      <button className="ml-[52px] mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-primary-600" onClick={() => setOpen(true)}>
        <Eye size={14} /> Show full account number
      </button>
    );
  }
  return (
    <div className="ml-[52px] mt-2">
      {number ? (
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-sm tracking-wider text-slate-800">{number}</code>
          <span className="text-xs text-slate-400">Hides itself in 15 seconds</span>
          <button className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800" onClick={close}>
            <EyeOff size={14} /> Hide
          </button>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            reveal.mutate();
          }}
        >
          <div className="w-56">
            <input
              className={`${input} !py-2`}
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            {reveal.error && <p className="mt-1 text-xs text-rose-600">{reveal.error.message}</p>}
          </div>
          <button className={`${btn} !py-2 text-xs`} disabled={reveal.isPending || !password}>
            {reveal.isPending ? 'Checking…' : 'Show'}
          </button>
          <button type="button" className={`${btnGhost} !py-2 text-xs`} onClick={close}>
            Cancel
          </button>
        </form>
      )}
    </div>
  );
}

function MethodForm({
  kind,
  existing,
  onDone,
  onCancel,
}: {
  kind: 'CARD' | 'BANK';
  existing?: SavedMethod;
  onDone: () => void;
  onCancel: () => void;
}) {
  const isCard = kind === 'CARD';
  const editing = !!existing;
  const [nickname, setNickname] = useState(existing?.nickname ?? '');
  const [cardType, setCardType] = useState<'CREDIT' | 'DEBIT'>(existing?.cardType ?? 'CREDIT');
  const [lastFour, setLastFour] = useState(isCard ? (existing?.lastFour ?? '') : '');
  const [account, setAccount] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [changeNumber, setChangeNumber] = useState(!editing); // bank: number only changes if asked
  const [isDefault, setIsDefault] = useState(existing?.isDefault ?? false);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (body: object) =>
      editing ? api('PATCH', `/payment-methods/${existing!.id}`, body) : api('POST', '/payment-methods', body),
    onSuccess: onDone,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const body: Record<string, unknown> = {};
    if (!editing) body.type = kind;
    if (isCard) {
      if (nickname.trim().length < 2) return setError('Give the card a nickname, for example "HDFC Credit Card".');
      if (!/^\d{4}$/.test(lastFour)) return setError('Enter exactly the last 4 digits of the card.');
      Object.assign(body, { nickname: nickname.trim(), cardType, lastFour });
    } else {
      if (nickname.trim()) body.nickname = nickname.trim();
      if (changeNumber) {
        const a = digits(account);
        if (a.length < 9 || a.length > 18) return setError('Account number must be 9 to 18 digits.');
        if (a !== digits(confirmAccount)) return setError('The account numbers do not match.');
        body.accountNumber = a;
        body.confirmAccountNumber = digits(confirmAccount);
      }
    }
    if (isDefault && !existing?.isDefault) body.isDefault = true;
    if (editing && !Object.keys(body).length) return onCancel();
    save.mutate(body);
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">
          {editing ? 'Edit' : 'Add'} {isCard ? 'card' : 'bank account'}
        </h3>
        <button type="button" aria-label="Close" className="rounded-md p-1 text-slate-400 hover:text-slate-700" onClick={onCancel}>
          <X size={16} />
        </button>
      </div>
      <Notice error={error ?? save.error} />

      {isCard ? (
        <>
          <div>
            <Label>Card nickname</Label>
            <input className={input} placeholder="e.g. HDFC Credit Card" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Card type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['CREDIT', 'DEBIT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setCardType(t)}
                    className={`rounded-xl border px-3 py-2.5 text-sm transition ${
                      cardType === t ? 'border-primary-500 bg-primary-50 font-semibold text-primary-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {t === 'CREDIT' ? 'Credit' : 'Debit'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Last 4 digits</Label>
              <input
                className={`${input} font-mono tracking-widest`}
                inputMode="numeric"
                placeholder="1234"
                maxLength={4}
                value={lastFour}
                onChange={(e) => setLastFour(digits(e.target.value).slice(0, 4))}
                required
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">We never ask for the full card number, expiry, CVV or PIN.</p>
        </>
      ) : (
        <>
          {editing && !changeNumber ? (
            <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm">
              <span className="font-mono text-slate-600">{existing!.maskedNumber}</span>
              <button type="button" className="text-xs font-medium text-primary-600 hover:underline" onClick={() => setChangeNumber(true)}>
                Change account number
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Account number</Label>
                <input
                  className={`${input} font-mono tracking-wider`}
                  type="password"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Account number"
                  value={account}
                  onChange={(e) => setAccount(digits(e.target.value).slice(0, 18))}
                  required
                />
              </div>
              <div>
                <Label>Confirm account number</Label>
                <input
                  className={`${input} font-mono tracking-wider`}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Re-enter account number"
                  value={confirmAccount}
                  onChange={(e) => setConfirmAccount(digits(e.target.value).slice(0, 18))}
                  required
                />
              </div>
            </div>
          )}
          <div>
            <Label>Nickname (optional)</Label>
            <input className={input} placeholder="e.g. Salary account" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} />
          </div>
          <p className="text-xs text-slate-400">Stored encrypted. Only the last 4 digits are ever shown.</p>
        </>
      )}

      <label className={`flex items-center gap-2 text-sm text-slate-600 ${existing?.isDefault ? 'opacity-60' : ''}`}>
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-primary-600"
          checked={isDefault}
          disabled={existing?.isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Set as default {isCard ? 'card' : 'bank account'}
        {existing?.isDefault && <span className="text-xs text-slate-400">(already the default)</span>}
      </label>

      <div className="flex gap-3">
        <button className={`${btn} flex-1`} disabled={save.isPending}>
          <Check size={16} /> {save.isPending ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className={`${btnGhost} flex-1`} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
