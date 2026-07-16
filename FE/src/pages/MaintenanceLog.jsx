import { useState, useEffect } from "react";
import {
  IconPlus,
  IconAlert,
  IconCheckCircle,
  IconCheck,
  IconAlertCircle,
} from "../components/Icons.jsx";
import {
  listMaintenanceLogs,
  listVehicles,
  createMaintenanceLog,
  closeMaintenanceLog,
} from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import Modal from "../components/Modal.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { getStoredUser } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";

const WRITE_ROLES = [ROLES.ADMIN, ROLES.FLEET_MANAGER];

const MAINTENANCE_TYPES = [
  "Oil Change",
  "Tire Rotation",
  "Brake Service",
  "Engine Check",
  "Battery Replacement",
  "AC Repair",
  "General Inspection",
  "Other",
];

export default function MaintenanceLog() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_id: "",
    maintenance_type: "Oil Change",
    description: "",
    cost: "",
    start_date: new Date().toISOString().split("T")[0],
  });

  const user = getStoredUser();
  const canWrite = WRITE_ROLES.includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [logsData, vehiclesData] = await Promise.all([
        listMaintenanceLogs(),
        listVehicles(),
      ]);
      setLogs(logsData || []);
      setVehicles(vehiclesData || []);
    } catch (err) {
      setError("Failed to load maintenance logs");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setFormData({
      vehicle_id: "",
      maintenance_type: "Oil Change",
      description: "",
      cost: "",
      start_date: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        vehicle_id: parseInt(formData.vehicle_id),
        maintenance_type: formData.maintenance_type,
        description: formData.description,
        cost: formData.cost ? parseFloat(formData.cost) : 0,
        start_date: formData.start_date,
      };

      await createMaintenanceLog(payload);
      setSuccess("Maintenance record created successfully");
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create maintenance record");
    }
  }

  async function handleCloseLog(logId) {
    if (
      !confirm(
        "Are you sure this maintenance is complete? This will restore the vehicle to Available status."
      )
    )
      return;

    try {
      await closeMaintenanceLog(logId);
      setSuccess("Maintenance record closed");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to close maintenance record");
    }
  }

  const getVehicleName = (id) => {
    return vehicles.find((v) => v.id === id)?.model || "Unknown";
  };

  const getVehicleRegistration = (id) => {
    return vehicles.find((v) => v.id === id)?.registration_number || "Unknown";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const openLogs = logs.filter((log) => log.is_active);
  const closedLogs = logs.filter((log) => !log.is_active);

  return (
    <div className="min-h-screen bg-paper md:pl-64">
      <Sidebar />

      {/* Header */}
      <header className="border-b border-black/10 bg-white pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">Maintenance Log</h1>
              <p className="mt-1 text-sm text-muted">Track vehicle maintenance records</p>
            </div>
            <button
              onClick={openModal}
              disabled={!canWrite}
              title={canWrite ? "Create a new maintenance record" : "Only Fleet Manager can create maintenance records"}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                canWrite
                  ? "bg-signal text-ink hover:bg-signal-dark"
                  : "bg-black/5 text-muted cursor-not-allowed"
              }`}
            >
              <IconPlus width="18" height="18" />
              New Maintenance
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
              <div key={i} className="h-20 rounded-lg border border-black/10 bg-white" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Open Maintenance */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <IconAlertCircle width="20" height="20" className="text-alert" />
                <h2 className="font-display text-lg font-semibold text-text">
                  Active Maintenance
                </h2>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-alert/10 text-xs font-semibold text-alert">
                  {openLogs.length}
                </span>
              </div>

              {openLogs.length === 0 ? (
                <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
                  <p className="text-muted">No vehicles under active maintenance</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {openLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-alert/20 bg-alert-soft/30 p-6 hover:border-alert/40 transition"
                    >
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Vehicle
                          </p>
                          <p className="mt-2 font-medium text-text">
                            {getVehicleName(log.vehicle_id)}
                          </p>
                          <p className="text-xs text-muted">
                            {getVehicleRegistration(log.vehicle_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Type
                          </p>
                          <p className="mt-2 font-medium text-text">{log.maintenance_type}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Cost
                          </p>
                          <p className="mt-2 font-medium text-text">
                            {formatCurrency(log.cost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                            Started
                          </p>
                          <p className="mt-2 text-sm text-text">
                            {formatDate(log.start_date)}
                          </p>
                        </div>
                      </div>

                      {log.description && (
                        <div className="mt-4 rounded-md bg-white/50 p-3">
                          <p className="text-xs font-medium text-muted uppercase tracking-wide">
                            Description
                          </p>
                          <p className="mt-2 text-sm text-text">{log.description}</p>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleCloseLog(log.id)}
                          disabled={!canWrite}
                          title={canWrite ? "Mark maintenance as complete" : "Only Fleet Manager can close maintenance records"}
                          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                            canWrite ? "bg-transit text-white hover:bg-opacity-90" : "bg-black/5 text-muted cursor-not-allowed"
                          }`}
                        >
                          <IconCheck width="16" height="16" />
                          Mark as Complete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Closed Maintenance */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <IconCheckCircle width="20" height="20" className="text-transit" />
                <h2 className="font-display text-lg font-semibold text-text">
                  Completed Maintenance
                </h2>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-transit/10 text-xs font-semibold text-transit">
                  {closedLogs.length}
                </span>
              </div>

              {closedLogs.length === 0 ? (
                <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
                  <p className="text-muted">No completed maintenance records</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-black/5 bg-paper-soft">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          Vehicle
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          Type
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          Cost
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                          Date Range
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {closedLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-paper-soft transition">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-text">
                                {getVehicleName(log.vehicle_id)}
                              </p>
                              <p className="text-xs text-muted">
                                {getVehicleRegistration(log.vehicle_id)}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-text">
                            {log.maintenance_type}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-text">
                            {formatCurrency(log.cost)}
                          </td>
                          <td className="px-6 py-4 text-sm text-text">
                            {formatDate(log.start_date)} to{" "}
                            {log.end_date ? formatDate(log.end_date) : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Maintenance Record"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Vehicle *
              </label>
              <select
                required
                value={formData.vehicle_id}
                onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Maintenance Type *
              </label>
              <select
                value={formData.maintenance_type}
                onChange={(e) =>
                  setFormData({ ...formData, maintenance_type: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                {MAINTENANCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Details about the maintenance work"
              rows="4"
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Estimated Cost (₹)
            </label>
            <input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              placeholder="e.g., 1500"
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            />
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
              Create Record
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}