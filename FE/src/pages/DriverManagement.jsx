import { useState, useEffect } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash2,
  IconAlert,
  IconCheckCircle,
  IconAlertCircle,
} from "../components/Icons.jsx";
import { listDrivers, createDriver, updateDriver, deleteDriver } from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import Modal from "../components/Modal.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { getStoredUser } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";

const WRITE_ROLES = [ROLES.ADMIN, ROLES.SAFETY_OFFICER];

const LICENSE_CATEGORIES = ["LMV-Auto", "HMV", "HGMV", "All"];
const DRIVER_STATUSES = ["Available", "On Trip", "Off Duty", "Suspended"];

export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    license_number: "",
    license_category: "LMV-Auto",
    license_expiry: "",
    contact: "",
    safety_score: "85",
    status: "Available",
  });

  const user = getStoredUser();
  const canWrite = WRITE_ROLES.includes(user?.role);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    try {
      setLoading(true);
      const data = await listDrivers();
      setDrivers(data || []);
    } catch (err) {
      setError("Failed to load drivers");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setFormData({
      name: "",
      license_number: "",
      license_category: "LMV-Auto",
      license_expiry: "",
      contact: "",
      safety_score: "85",
      status: "Available",
    });
    setShowModal(true);
  }

  function openEditModal(driver) {
    setEditingId(driver.id);
    setFormData({
      name: driver.name,
      license_number: driver.license_number,
      license_category: driver.license_category,
      license_expiry: driver.license_expiry,
      contact: driver.contact,
      safety_score: driver.safety_score.toString(),
      status: driver.status,
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, v === "" ? undefined : v])
      );
      if (payload.safety_score != null) payload.safety_score = parseFloat(payload.safety_score);

      if (editingId) {
        await updateDriver(editingId, payload);
        setSuccess("Driver updated successfully");
      } else {
        await createDriver(payload);
        setSuccess("Driver created successfully");
      }
      setShowModal(false);
      fetchDrivers();
    } catch (err) {
      setError(err.message || "Failed to save driver");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      await deleteDriver(id);
      setSuccess("Driver deleted successfully");
      fetchDrivers();
    } catch (err) {
      setError(err.message || "Failed to delete driver");
    }
  }

  function isLicenseExpiring(expiryDate) {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
    return daysLeft < 30;
  }

  return (
    <div className="min-h-screen bg-paper md:pl-64">
      <Sidebar />

      {/* Header */}
      <header className="border-b border-black/10 bg-white pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">Driver Management</h1>
              <p className="mt-1 text-sm text-muted">Manage drivers and track compliance</p>
            </div>
            <button
              onClick={openAddModal}
              disabled={!canWrite}
              title={canWrite ? "Add a new driver" : "Only Safety Officer can add drivers"}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                canWrite
                  ? "bg-signal text-ink hover:bg-signal-dark"
                  : "bg-black/5 text-muted cursor-not-allowed"
              }`}
            >
              <IconPlus width="18" height="18" />
              Add Driver
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-alert/25 bg-alert-soft px-4 py-3 text-sm text-alert">
            <IconAlert width="18" height="18" className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-transit/25 bg-transit-soft px-4 py-3 text-sm text-transit">
            <IconCheckCircle width="18" height="18" className="flex-shrink-0 mt-0.5" />
            {success}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg border border-black/10 bg-white" />
            ))}
          </div>
        ) : drivers.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white p-12 text-center">
            <p className="text-muted">No drivers registered yet</p>
            <button
              onClick={openAddModal}
              className="mt-4 text-sm font-medium text-signal hover:text-signal-dark transition"
            >
              Add your first driver
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 bg-paper-soft">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    License
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Category
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Expiry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Safety Score
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-paper-soft transition">
                    <td className="px-6 py-4">
                      <span className="font-medium text-text">{driver.name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text font-mono">
                      {driver.license_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-text">
                      {driver.license_category}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-text">
                          {formatDate(driver.license_expiry)}
                        </span>
                        {isLicenseExpiring(driver.license_expiry) && (
                          <IconAlertCircle width="16" height="16" className="text-alert" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-paper-soft rounded-full h-1.5">
                          <div
                            className="h-full rounded-full bg-transit"
                            style={{
                              width: `${Math.min(driver.safety_score, 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-text font-medium">
                          {driver.safety_score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={driver.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => canWrite && openEditModal(driver)}
                          disabled={!canWrite}
                          className={`p-2 transition ${canWrite ? "text-muted hover:text-signal" : "text-black/20 cursor-not-allowed"}`}
                          title={canWrite ? "Edit driver" : "Only Safety Officer can edit drivers"}
                        >
                          <IconEdit width="18" height="18" />
                        </button>
                        <button
                          onClick={() => canWrite && handleDelete(driver.id)}
                          disabled={!canWrite}
                          className={`p-2 transition ${canWrite ? "text-muted hover:text-alert" : "text-black/20 cursor-not-allowed"}`}
                          title={canWrite ? "Delete driver" : "Only Safety Officer can delete drivers"}
                        >
                          <IconTrash2 width="18" height="18" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Driver" : "Add Driver"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., John Doe"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                License Number *
              </label>
              <input
                type="text"
                required
                value={formData.license_number}
                onChange={(e) =>
                  setFormData({ ...formData, license_number: e.target.value })
                }
                placeholder="e.g., DL-2023-00123"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                License Category *
              </label>
              <select
                value={formData.license_category}
                onChange={(e) =>
                  setFormData({ ...formData, license_category: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                {LICENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                License Expiry Date *
              </label>
              <input
                type="date"
                required
                value={formData.license_expiry}
                onChange={(e) =>
                  setFormData({ ...formData, license_expiry: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Contact Number
              </label>
              <input
                type="tel"
                value={formData.contact}
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                placeholder="e.g., +91-9876543210"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Safety Score (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.safety_score}
                onChange={(e) =>
                  setFormData({ ...formData, safety_score: e.target.value })
                }
                placeholder="e.g., 85"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            >
              {DRIVER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-text hover:bg-paper-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal-dark transition"
            >
              {editingId ? "Update" : "Add"} Driver
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusMap = {
    Available: { bg: "bg-transit-soft", text: "text-transit" },
    "On Trip": { bg: "bg-signal/10", text: "text-signal" },
    "Off Duty": { bg: "bg-paper-soft", text: "text-muted" },
    Suspended: { bg: "bg-alert-soft", text: "text-alert" },
  };

  const style = statusMap[status] || statusMap.Available;

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}