import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { API_BASE_URL } from "../lib/api.js";
import { getToken } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";

export default function Settings() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getToken();
    fetch(`${API_BASE_URL}/settings/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setInfo)
      .catch(() => setError("Could not load settings."));
  }, []);

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <main className="md:pl-64 pt-14 md:pt-0">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <h1 className="font-display text-2xl font-medium text-text">Settings</h1>
          <p className="mt-1 text-sm text-muted">System configuration — Admin only.</p>

          {error && (
            <div className="mt-6 rounded-md border border-alert/25 bg-alert-soft px-4 py-3 text-sm text-alert">
              {error}
            </div>
          )}

          {info && (
            <div className="mt-6 space-y-5">
              <section className="rounded-lg border border-black/10 bg-white p-5">
                <h2 className="text-sm font-semibold text-text">Application</h2>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Name</dt>
                    <dd className="font-medium text-text">{info.app_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Version</dt>
                    <dd className="font-medium text-text">{info.version}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-black/10 bg-white p-5">
                <h2 className="text-sm font-semibold text-text">System Roles</h2>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {info.roles?.map((r) => (
                    <li
                      key={r}
                      className="flex items-center gap-2 rounded-md border border-black/5 bg-paper px-3 py-2 text-sm text-text"
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${
                          r === ROLES.ADMIN
                            ? "bg-signal"
                            : "bg-ink-muted"
                        }`}
                      />
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
