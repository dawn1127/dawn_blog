"use client";

import { useEffect, useMemo, useState } from "react";

type UserRole = "admin" | "user";

type Account = {
  id: string;
  login: string;
  displayName: string;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type AccountForm = {
  displayName: string;
  password: string;
  role: UserRole;
  enabled: boolean;
};

const emptyCreateForm = {
  login: "",
  displayName: "",
  password: "",
  role: "user" as UserRole,
  enabled: true,
};

const emptyEditForm: AccountForm = {
  displayName: "",
  password: "",
  role: "user",
  enabled: true,
};

function accountToEditForm(account?: Account): AccountForm {
  if (!account) {
    return emptyEditForm;
  }

  return {
    displayName: account.displayName,
    password: "",
    role: account.role,
    enabled: account.enabled,
  };
}

async function readErrorText(response: Response) {
  return response.text();
}

export function AccountAdmin() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState<AccountForm>(emptyEditForm);
  const [status, setStatus] = useState("Loading accounts...");
  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === selectedAccountId),
    [accounts, selectedAccountId],
  );

  async function loadAccounts(nextSelectedId = selectedAccountId) {
    const response = await fetch("/api/admin/accounts", { cache: "no-store" });

    if (!response.ok) {
      setStatus(await readErrorText(response));
      return;
    }

    const data = (await response.json()) as { accounts: Account[] };
    const nextSelected = data.accounts.find((account) => account.id === nextSelectedId) ?? data.accounts[0];

    setAccounts(data.accounts);
    setSelectedAccountId(nextSelected?.id ?? "");
    setEditForm(accountToEditForm(nextSelected));
    setStatus(data.accounts.length > 0 ? "" : "No accounts yet.");
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadAccounts());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectAccount(accountId: string) {
    const account = accounts.find((item) => item.id === accountId);
    setSelectedAccountId(account?.id ?? "");
    setEditForm(accountToEditForm(account));
  }

  async function createAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("Creating account...");

    const response = await fetch("/api/admin/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });

    if (!response.ok) {
      setStatus(await readErrorText(response));
      return;
    }

    const data = (await response.json()) as { account: Account };
    setCreateForm(emptyCreateForm);
    setStatus("Account created.");
    await loadAccounts(data.account.id);
  }

  async function updateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAccount) {
      setStatus("Select an account first.");
      return;
    }

    const payload: Record<string, unknown> = {
      displayName: editForm.displayName,
      role: editForm.role,
      enabled: editForm.enabled,
    };

    if (editForm.password) {
      payload.password = editForm.password;
    }

    const response = await fetch(`/api/admin/accounts/${selectedAccount.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setStatus(await readErrorText(response));
      return;
    }

    setEditForm((current) => ({ ...current, password: "" }));
    setStatus("Account updated.");
    await loadAccounts(selectedAccount.id);
  }

  return (
    <div className="account-admin-shell">
      {status ? <p className="status-line account-status">{status}</p> : null}

      <section className="settings-section">
        <div className="section-headline">
          <h3>Accounts</h3>
          <p>Admin-only account management using the existing login and password system.</p>
        </div>
        <form className="compact-form account-create-form" onSubmit={createAccount}>
          <input
            autoComplete="username"
            value={createForm.login}
            onChange={(event) => setCreateForm({ ...createForm, login: event.target.value })}
            placeholder="login"
          />
          <input
            value={createForm.displayName}
            onChange={(event) => setCreateForm({ ...createForm, displayName: event.target.value })}
            placeholder="display name"
          />
          <input
            autoComplete="new-password"
            value={createForm.password}
            onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
            placeholder="password, min 8 chars"
            type="password"
          />
          <select
            value={createForm.role}
            onChange={(event) => setCreateForm({ ...createForm, role: event.target.value as UserRole })}
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
          <label className="inline-check">
            <input
              checked={createForm.enabled}
              onChange={(event) => setCreateForm({ ...createForm, enabled: event.target.checked })}
              type="checkbox"
            />
            Enabled
          </label>
          <button className="button" type="submit">
            Create account
          </button>
        </form>
      </section>

      <section className="settings-section account-admin-grid">
        <div className="table-wrap quiet-table account-table">
          <table>
            <thead>
              <tr>
                <th>Login</th>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr className={account.id === selectedAccountId ? "selected-row" : ""} key={account.id}>
                  <td>{account.login}</td>
                  <td>{account.displayName}</td>
                  <td>{account.role}</td>
                  <td>{account.enabled ? "enabled" : "disabled"}</td>
                  <td>
                    <button className="button secondary" onClick={() => selectAccount(account.id)} type="button">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <form className="form-stack account-editor" onSubmit={updateAccount}>
          <h3>Edit account</h3>
          <label className="field">
            <span>Login</span>
            <input disabled value={selectedAccount?.login ?? ""} />
          </label>
          <label className="field">
            <span>Display name</span>
            <input
              disabled={!selectedAccount}
              value={editForm.displayName}
              onChange={(event) => setEditForm({ ...editForm, displayName: event.target.value })}
            />
          </label>
          <label className="field">
            <span>New password</span>
            <input
              autoComplete="new-password"
              disabled={!selectedAccount}
              value={editForm.password}
              onChange={(event) => setEditForm({ ...editForm, password: event.target.value })}
              placeholder="leave blank to keep current password"
              type="password"
            />
          </label>
          <label className="field">
            <span>Role</span>
            <select
              disabled={!selectedAccount}
              value={editForm.role}
              onChange={(event) => setEditForm({ ...editForm, role: event.target.value as UserRole })}
            >
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <label className="inline-check">
            <input
              checked={editForm.enabled}
              disabled={!selectedAccount}
              onChange={(event) => setEditForm({ ...editForm, enabled: event.target.checked })}
              type="checkbox"
            />
            Enabled
          </label>
          <button className="button" disabled={!selectedAccount} type="submit">
            Save account
          </button>
        </form>
      </section>
    </div>
  );
}
