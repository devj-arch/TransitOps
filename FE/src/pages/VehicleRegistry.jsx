import { useState, useEffect } from "react";
import {
  IconPlus,
  IconEdit,
  IconTrash2,
  IconAlert,
  IconCheckCircle,
} from "../components/Icons.jsx";
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from "../lib/api.js";
import Modal from "../components/Modal.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { getStoredUser } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";

const WRITE_ROLES = [ROLES.ADMIN, ROLES.FLEET_MANAGER];

const VEHICLE_TYPES = ["Van", "Truck", "Bike", "Car"];
const VEHICLE_STATUSES = ["Available", "On Trip", "In Shop", "Retired"];

export default function VehicleRegistry() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    registration_number: "",
    model: "",
    type: "Van",
    max_capacity: "",
    odometer: "",
    acquisition_cost: "",
    status: "Available",
  });

  const user = getStoredUser();
  const canWrite = WRITE_ROLES.includes(user?.role);

  useEffect(() => {
    fetchVehicles();
  }, []);

  async function fetchVehicles() {
    try {
      setLoading(true);
      const data = await listVehicles();
      setVehicles(data || []);
    } catch (err) {
      setError("Failed to load vehicles");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingId(null);
    setFormData({
      registration_number: "",
      model: "",
      type: "Van",
      max_capacity: "",
      odometer: "",
      acquisition_cost: "",
      status: "Available",
    });
    setShowModal(true);
  }

  function openEditModal(vehicle) {
    setEditingId(vehicle.id);
    setFormData({
      registration_number: vehicle.registration_number,
      model: vehicle.model || "",
      type: vehicle.type || "Van",
      max_capacity: vehicle.max_capacity || "",
      odometer: vehicle.odometer || "",
      acquisition_cost: vehicle.acquisition_cost || "",
      status: vehicle.status || "Available",
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Clean payload: convert empty strings to undefined so they're excluded from JSON
    const payload = Object.fromEntries(
      Object.entries(formData).map(([k, v]) => [k, v === "" ? undefined : v])
    );
    if (payload.max_capacity != null) payload.max_capacity = Number(payload.max_capacity);
    if (payload.odometer != null) payload.odometer = Number(payload.odometer);
    if (payload.acquisition_cost != null) payload.acquisition_cost = Number(payload.acquisition_cost);

    try {
      if (editingId) {
        await updateVehicle(editingId, payload);
        setSuccess("Vehicle updated successfully");
      } else {
        await createVehicle(payload);
        setSuccess("Vehicle created successfully");
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      setError(err.message || "Failed to save vehicle");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return;

    try {
      await deleteVehicle(id);
      setSuccess("Vehicle deleted successfully");
      fetchVehicles();
    } catch (err) {
      setError(err.message || "Failed to delete vehicle");
    }
  }

  return (
    <div className="min-h-screen bg-paper md:pl-64">
      <Sidebar />

      {/* Header */}
      <header className="border-b border-black/10 bg-white pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">Vehicle Registry</h1>
              <p className="mt-1 text-sm text-muted">Manage your fleet inventory</p>
            </div>
            <button
              onClick={openAddModal}
              disabled={!canWrite}
              title={canWrite ? "Add a new vehicle" : "Only Fleet Manager can add vehicles"}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                canWrite
                  ? "bg-signal text-ink hover:bg-signal-dark"
                  : "bg-black/5 text-muted cursor-not-allowed"
              }`}
            >
              <IconPlus width="18" height="18" />
              Add Vehicle
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
        ) : vehicles.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white p-12 text-center">
            <p className="text-muted">No vehicles registered yet</p>
            <button
              onClick={openAddModal}
              className="mt-4 text-sm font-medium text-signal hover:text-signal-dark transition"
            >
              Add your first vehicle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-black/10 bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5 bg-paper-soft">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Registration
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    Capacity
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
                {vehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="hover:bg-paper-soft transition">
                    <td className="px-6 py-4">
                      <span className="font-medium text-text">
                        {vehicle.registration_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text">
                      {vehicle.model}
                    </td>
                    <td className="px-6 py-4 text-sm text-text">
                      {vehicle.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-text">
                      {vehicle.max_capacity} kg
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={vehicle.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => canWrite && openEditModal(vehicle)}
                          disabled={!canWrite}
                          className={`p-2 transition ${canWrite ? "text-muted hover:text-signal" : "text-black/20 cursor-not-allowed"}`}
                          title={canWrite ? "Edit vehicle" : "Only Fleet Manager can edit vehicles"}
                        >
                          <IconEdit width="18" height="18" />
                        </button>
                        <button
                          onClick={() => canWrite && handleDelete(vehicle.id)}
                          disabled={!canWrite}
                          className={`p-2 transition ${canWrite ? "text-muted hover:text-alert" : "text-black/20 cursor-not-allowed"}`}
                          title={canWrite ? "Delete vehicle" : "Only Fleet Manager can delete vehicles"}
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
        title={editingId ? "Edit Vehicle" : "Add Vehicle"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Registration Number *
              </label>
              <input
                type="text"
                required
                value={formData.registration_number}
                onChange={(e) =>
                  setFormData({ ...formData, registration_number: e.target.value })
                }
                placeholder="e.g., TN-45-AB-1234"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Model *
              </label>
              <input
                type="text"
                required
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                placeholder="e.g., Van-05"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                {VEHICLE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Max Load Capacity (kg) *
              </label>
              <input
                type="number"
                required
                value={formData.max_capacity}
                onChange={(e) =>
                  setFormData({ ...formData, max_capacity: parseFloat(e.target.value) })
                }
                placeholder="e.g., 500"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Odometer (km)
              </label>
              <input
                type="number"
                value={formData.odometer}
                onChange={(e) =>
                  setFormData({ ...formData, odometer: parseFloat(e.target.value) })
                }
                placeholder="e.g., 15000"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Acquisition Cost (₹)
              </label>
              <input
                type="number"
                value={formData.acquisition_cost}
                onChange={(e) =>
                  setFormData({ ...formData, acquisition_cost: parseFloat(e.target.value) })
                }
                placeholder="e.g., 500000"
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
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            >
              {VEHICLE_STATUSES.map((status) => (
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
              {editingId ? "Update" : "Add"} Vehicle
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
    "In Shop": { bg: "bg-alert-soft", text: "text-alert" },
    Retired: { bg: "bg-paper-soft", text: "text-muted" },
  };

  const style = statusMap[status] || statusMap.Available;

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}