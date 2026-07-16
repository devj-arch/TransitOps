import { useState, useEffect } from "react";
import {
  IconPlus,
  IconAlert,
  IconCheckCircle,
  IconPlay,
  IconCheck,
  IconX,
  IconEye,
} from "../components/Icons.jsx";
import {
  listTrips,
  listVehicles,
  listDrivers,
  createTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import Sidebar from "../components/Sidebar.jsx";
import Modal from "../components/Modal.jsx";
import { getStoredUser } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";

const WRITE_ROLES = [ROLES.ADMIN, ROLES.DISPATCHER];

const TRIP_STATUSES = ["Draft", "Dispatched", "Completed", "Cancelled"];

export default function TripDispatcher() {
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [formData, setFormData] = useState({
    source: "",
    destination: "",
    vehicle_id: "",
    driver_id: "",
    cargo_weight: "",
    planned_distance: "",
  });
  const [completeData, setCompleteData] = useState({
    actual_distance: "",
  });

  const user = getStoredUser();
  const canWrite = WRITE_ROLES.includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        listTrips(),
        listVehicles(),
        listDrivers(),
      ]);
      setTrips(results[0].status === "fulfilled" ? results[0].value || [] : []);
      setVehicles(results[1].status === "fulfilled" ? results[1].value || [] : []);
      setDrivers(results[2].status === "fulfilled" ? results[2].value || [] : []);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setFormData({
      source: "",
      destination: "",
      vehicle_id: "",
      driver_id: "",
      cargo_weight: "",
      planned_distance: "",
    });
    setShowCreateModal(true);
  }

  async function handleCreateTrip(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        ...formData,
        vehicle_id: parseInt(formData.vehicle_id),
        driver_id: parseInt(formData.driver_id),
        cargo_weight: parseFloat(formData.cargo_weight),
        planned_distance: parseFloat(formData.planned_distance),
      };

      await createTrip(payload);
      setSuccess("Trip created successfully");
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create trip");
    }
  }

  async function handleDispatchTrip(tripId) {
    try {
      await dispatchTrip(tripId);
      setSuccess("Trip dispatched successfully");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to dispatch trip");
    }
  }

  function openCompleteModal(trip) {
    setSelectedTrip(trip);
    setCompleteData({
      actual_distance: "",
    });
    setShowCompleteModal(true);
  }

  async function handleCompleteTrip(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        actual_distance: parseFloat(completeData.actual_distance),
      };

      await completeTrip(selectedTrip.id, payload);
      setSuccess("Trip completed successfully");
      setShowCompleteModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to complete trip");
    }
  }

  async function handleCancelTrip(tripId) {
    if (!confirm("Are you sure you want to cancel this trip?")) return;

    try {
      await cancelTrip(tripId);
      setSuccess("Trip cancelled successfully");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to cancel trip");
    }
  }

  const getVehicleName = (id) => {
    return vehicles.find((v) => v.id === id)?.model || "Unknown";
  };

  const getDriverName = (id) => {
    return drivers.find((d) => d.id === id)?.name || "Unknown";
  };

  const getAvailableVehicles = () => {
    return vehicles.filter((v) => v.status === "Available");
  };

  const getAvailableDrivers = () => {
    return drivers.filter(
      (d) => d.status === "Available" && new Date(d.license_expiry) > new Date()
    );
  };

  return (
    <div className="min-h-screen bg-paper md:pl-64">
      <Sidebar />

      {/* Header */}
      <header className="border-b border-black/10 bg-white pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">Trip Dispatcher</h1>
              <p className="mt-1 text-sm text-muted">Create and manage delivery trips</p>
            </div>
            <button
              onClick={openCreateModal}
              disabled={!canWrite}
              title={canWrite ? "Create a new trip" : "Only Dispatcher can create trips"}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                canWrite
                  ? "bg-signal text-ink hover:bg-signal-dark"
                  : "bg-black/5 text-muted cursor-not-allowed"
              }`}
            >
              <IconPlus width="18" height="18" />
              Create Trip
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
        ) : trips.length === 0 ? (
          <div className="rounded-lg border border-black/10 bg-white p-12 text-center">
            <p className="text-muted">No trips created yet</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-sm font-medium text-signal hover:text-signal-dark transition"
            >
              Create your first trip
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="rounded-lg border border-black/10 bg-white p-6 hover:border-black/20 transition"
              >
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Trip ID
                    </p>
                    <p className="mt-2 font-mono text-sm font-medium text-text">
                      #{trip.id}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Route
                    </p>
                    <p className="mt-2 text-sm text-text">
                      {trip.source} → {trip.destination}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Vehicle & Driver
                    </p>
                    <p className="mt-2 text-sm text-text">
                      {getVehicleName(trip.vehicle_id)} / {getDriverName(trip.driver_id)}
                    </p>
                  </div>
                  <div className="flex items-end">
                    <StatusBadge status={trip.status} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-md bg-paper-soft p-3">
                    <p className="text-xs text-muted">Cargo</p>
                    <p className="mt-1 font-semibold text-text">{trip.cargo_weight} kg</p>
                  </div>
                  <div className="rounded-md bg-paper-soft p-3">
                    <p className="text-xs text-muted">Distance</p>
                    <p className="mt-1 font-semibold text-text">{trip.planned_distance} km</p>
                  </div>
                  <div className="rounded-md bg-paper-soft p-3">
                    <p className="text-xs text-muted">Created</p>
                    <p className="mt-1 font-semibold text-text text-sm">
                      {formatDate(trip.created_at)}
                    </p>
                  </div>
                  <div className="rounded-md bg-paper-soft p-3">
                    <p className="text-xs text-muted">Updated</p>
                    <p className="mt-1 font-semibold text-text text-sm">
                      {formatDate(trip.updated_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {trip.status === "Draft" && (
                    <>
                      <button
                        onClick={() => handleDispatchTrip(trip.id)}
                        disabled={!canWrite}
                        title={canWrite ? "Dispatch this trip" : "Only Dispatcher can dispatch trips"}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                          canWrite ? "bg-signal text-ink hover:bg-signal-dark" : "bg-black/5 text-muted cursor-not-allowed"
                        }`}
                      >
                        <IconPlay width="16" height="16" />
                        Dispatch
                      </button>
                      <button
                        onClick={() => handleCancelTrip(trip.id)}
                        disabled={!canWrite}
                        title={canWrite ? "Cancel this trip" : "Only Dispatcher can cancel trips"}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                          canWrite ? "bg-alert text-white hover:bg-opacity-90" : "bg-black/5 text-muted cursor-not-allowed"
                        }`}
                      >
                        <IconX width="16" height="16" />
                        Cancel
                      </button>
                    </>
                  )}
                  {trip.status === "Dispatched" && (
                    <>
                      <button
                        onClick={() => openCompleteModal(trip)}
                        disabled={!canWrite}
                        title={canWrite ? "Complete this trip" : "Only Dispatcher can complete trips"}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                          canWrite ? "bg-transit text-white hover:bg-opacity-90" : "bg-black/5 text-muted cursor-not-allowed"
                        }`}
                      >
                        <IconCheck width="16" height="16" />
                        Complete
                      </button>
                      <button
                        onClick={() => handleCancelTrip(trip.id)}
                        disabled={!canWrite}
                        title={canWrite ? "Cancel this trip" : "Only Dispatcher can cancel trips"}
                        className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                          canWrite ? "bg-alert text-white hover:bg-opacity-90" : "bg-black/5 text-muted cursor-not-allowed"
                        }`}
                      >
                        <IconX width="16" height="16" />
                        Cancel
                      </button>
                    </>
                  )}
                  {trip.status === "Completed" && (
                    <button
                      onClick={() => handleCancelTrip(trip.id)}
                      className="flex items-center gap-2 rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-text hover:bg-paper-soft transition"
                      disabled
                    >
                      <IconCheckCircle width="16" height="16" />
                      Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Trip"
      >
        <form onSubmit={handleCreateTrip} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Source Location *
              </label>
              <input
                type="text"
                required
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Warehouse A"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Destination Location *
              </label>
              <input
                type="text"
                required
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Store B"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
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
                <option value="">Select an available vehicle</option>
                {getAvailableVehicles().map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model} ({v.registration_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Driver *
              </label>
              <select
                required
                value={formData.driver_id}
                onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Select an available driver</option>
                {getAvailableDrivers().map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.license_category})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Cargo Weight (kg) *
              </label>
              <input
                type="number"
                required
                value={formData.cargo_weight}
                onChange={(e) => setFormData({ ...formData, cargo_weight: e.target.value })}
                placeholder="e.g., 450"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Planned Distance (km) *
              </label>
              <input
                type="number"
                required
                value={formData.planned_distance}
                onChange={(e) => setFormData({ ...formData, planned_distance: e.target.value })}
                placeholder="e.g., 50"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-text hover:bg-paper-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal-dark transition"
            >
              Create Trip
            </button>
          </div>
        </form>
      </Modal>

      {/* Complete Modal */}
      <Modal
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Trip"
      >
        <form onSubmit={handleCompleteTrip} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Actual Distance (km) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={completeData.actual_distance}
                onChange={(e) =>
                  setCompleteData({ ...completeData, actual_distance: e.target.value })
                }
                placeholder="e.g., 87.5"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowCompleteModal(false)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-text hover:bg-paper-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-transit px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition"
            >
              Complete Trip
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusMap = {
    Draft: { bg: "bg-paper-soft", text: "text-muted" },
    Dispatched: { bg: "bg-signal/10", text: "text-signal" },
    Completed: { bg: "bg-transit-soft", text: "text-transit" },
    Cancelled: { bg: "bg-alert-soft", text: "text-alert" },
  };

  const style = statusMap[status] || statusMap.Draft;

  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {status}
    </span>
  );
}