"use client";

import { useUsers } from "@repo/api-client";
import { Card } from "../components/Card";

export default function Page() {
  const { data: users = [], isLoading } = useUsers();

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900">StackWeave</h1>
      <p className="mt-1 text-sm text-gray-500">
        Fetching from Express backend via shared <code>@repo/api-client</code>
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800">Users</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-gray-400">Loading...</p>
        ) : users.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No users found.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {users.map((user) => (
              <Card
                key={user.id}
                title={user.name ?? "—"}
                subtitle={user.email}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
