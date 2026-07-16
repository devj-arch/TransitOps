import { useState, useEffect } from "react";
import {
  IconPlus,
  IconAlert,
  IconCheckCircle,
  IconTrash2,
} from "../components/Icons.jsx";
import {
  listFuelLogs,
  listExpenses,
  listVehicles,
  createFuelLog,
  createExpense,
  deleteFuelLog,
  deleteExpense,
} from "../lib/api.js";
import { formatDate } from "../lib/format.js";
import Modal from "../components/Modal.jsx";
import Sidebar from "../components/Sidebar.jsx";

const EXPENSE_TYPES = ["Toll", "Parking", "Maintenance", "Insurance", "Other"];

export default function FuelExpenseManagement() {
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [fuelData, setFuelData] = useState({
    vehicle_id: "",
    liters: "",
    cost: "",
    fuel_date: new Date().toISOString().split("T")[0],
  });
  const [expenseData, setExpenseData] = useState({
    vehicle_id: "",
    category: "Toll",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
    description: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const [fuelData, expenseData, vehiclesData] = await Promise.all([
        listFuelLogs(),
        listExpenses(),
        listVehicles(),
      ]);
      setFuelLogs(fuelData || []);
      setExpenses(expenseData || []);
      setVehicles(vehiclesData || []);
    } catch (err) {
      setError("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddFuel(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        vehicle_id: parseInt(fuelData.vehicle_id),
        liters: parseFloat(fuelData.liters),
        cost: parseFloat(fuelData.cost),
        fuel_date: fuelData.fuel_date,
      };

      await createFuelLog(payload);
      setSuccess("Fuel log created successfully");
      setShowFuelModal(false);
      setFuelData({
        vehicle_id: "",
        liters: "",
        cost: "",
        fuel_date: new Date().toISOString().split("T")[0],
      });
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create fuel log");
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        vehicle_id: parseInt(expenseData.vehicle_id),
        category: expenseData.category,
        amount: parseFloat(expenseData.amount),
        expense_date: expenseData.expense_date,
        description: expenseData.description,
      };

      await createExpense(payload);
      setSuccess("Expense created successfully");
      setShowExpenseModal(false);
      setExpenseData({
        vehicle_id: "",
        category: "Toll",
        amount: "",
        expense_date: new Date().toISOString().split("T")[0],
        description: "",
      });
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to create expense");
    }
  }

  async function handleDeleteFuel(id) {
    if (!confirm("Delete this fuel log?")) return;

    try {
      await deleteFuelLog(id);
      setSuccess("Fuel log deleted");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete fuel log");
    }
  }

  async function handleDeleteExpense(id) {
    if (!confirm("Delete this expense?")) return;

    try {
      await deleteExpense(id);
      setSuccess("Expense deleted");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete expense");
    }
  }

  const getVehicleName = (id) => {
    return vehicles.find((v) => v.id === id)?.model || "Unknown";
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const totalFuelCost = fuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalFuelLiters = fuelLogs.reduce((sum, log) => sum + log.liters, 0);

  return (
    <div className="min-h-screen bg-paper md:pl-64">
      <Sidebar />

      {/* Header */}
      <header className="border-b border-black/10 bg-white pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">
                Fuel & Expense Management
              </h1>
              <p className="mt-1 text-sm text-muted">Track operational costs</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFuelModal(true)}
                className="flex items-center gap-2 rounded-md bg-transit px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition"
              >
                <IconPlus width="18" height="18" />
                Log Fuel
              </button>
              <button
                onClick={() => setShowExpenseModal(true)}
                className="flex items-center gap-2 rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal-dark transition"
              >
                <IconPlus width="18" height="18" />
                Log Expense
              </button>
            </div>
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
          <div className="rounded-lg border border-black/10 bg-white p-6">
            <p className="text-sm text-muted font-medium">Total Fuel Cost</p>
            <p className="mt-2 font-display text-2xl font-semibold text-text">
              {formatCurrency(totalFuelCost)}
            </p>
            <p className="mt-2 text-xs text-muted">{totalFuelLiters.toFixed(2)} L total</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-6">
            <p className="text-sm text-muted font-medium">Total Expenses</p>
            <p className="mt-2 font-display text-2xl font-semibold text-text">
              {formatCurrency(totalExpenses)}
            </p>
            <p className="mt-2 text-xs text-muted">{expenses.length} records</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-white p-6">
            <p className="text-sm text-muted font-medium">Combined Cost</p>
            <p className="mt-2 font-display text-2xl font-semibold text-text">
              {formatCurrency(totalFuelCost + totalExpenses)}
            </p>
            <p className="mt-2 text-xs text-muted">Operational expenses</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg border border-black/10 bg-white" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Fuel Logs */}
            <section>
              <h2 className="font-display text-lg font-semibold text-text mb-4">
                Fuel Logs
              </h2>
              {fuelLogs.length === 0 ? (
                <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
                  <p className="text-muted">No fuel logs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fuelLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start justify-between rounded-lg border border-black/10 bg-white p-4 hover:border-black/20 transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text">
                          {getVehicleName(log.vehicle_id)}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted">Liters</p>
                            <p className="font-semibold text-text">{log.liters} L</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Cost</p>
                            <p className="font-semibold text-text">
                              {formatCurrency(log.cost)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Date</p>
                            <p className="text-sm text-text">
                              {formatDate(log.fuel_date)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFuel(log.id)}
                        className="p-2 text-muted hover:text-alert transition flex-shrink-0"
                      >
                        <IconTrash2 width="18" height="18" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Expenses */}
            <section>
              <h2 className="font-display text-lg font-semibold text-text mb-4">
                Other Expenses
              </h2>
              {expenses.length === 0 ? (
                <div className="rounded-lg border border-black/10 bg-white p-8 text-center">
                  <p className="text-muted">No expenses logged yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className="flex items-start justify-between rounded-lg border border-black/10 bg-white p-4 hover:border-black/20 transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-text">
                          {getVehicleName(exp.vehicle_id)}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted">Type</p>
                            <p className="font-semibold text-text">{exp.category}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Amount</p>
                            <p className="font-semibold text-text">
                              {formatCurrency(exp.amount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted">Date</p>
                            <p className="text-sm text-text">
                              {formatDate(exp.expense_date)}
                            </p>
                          </div>
                        </div>
                        {exp.description && (
                          <p className="mt-2 text-xs text-muted italic">{exp.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-2 text-muted hover:text-alert transition flex-shrink-0"
                      >
                        <IconTrash2 width="18" height="18" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Fuel Modal */}
      <Modal
        open={showFuelModal}
        onClose={() => setShowFuelModal(false)}
        title="Log Fuel Purchase"
      >
        <form onSubmit={handleAddFuel} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Vehicle *
              </label>
              <select
                required
                value={fuelData.vehicle_id}
                onChange={(e) =>
                  setFuelData({ ...fuelData, vehicle_id: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={fuelData.fuel_date}
                onChange={(e) => setFuelData({ ...fuelData, fuel_date: e.target.value })}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Liters *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={fuelData.liters}
                onChange={(e) => setFuelData({ ...fuelData, liters: e.target.value })}
                placeholder="e.g., 50.5"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Cost (₹) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={fuelData.cost}
                onChange={(e) => setFuelData({ ...fuelData, cost: e.target.value })}
                placeholder="e.g., 3000"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowFuelModal(false)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-text hover:bg-paper-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-transit px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90 transition"
            >
              Log Fuel
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        open={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title="Log Expense"
      >
        <form onSubmit={handleAddExpense} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Vehicle *
              </label>
              <select
                required
                value={expenseData.vehicle_id}
                onChange={(e) =>
                  setExpenseData({ ...expenseData, vehicle_id: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.model}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Date *
              </label>
              <input
                type="date"
                required
                value={expenseData.expense_date}
                onChange={(e) =>
                  setExpenseData({ ...expenseData, expense_date: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Expense Type *
              </label>
              <select
                value={expenseData.category}
                onChange={(e) =>
                  setExpenseData({ ...expenseData, category: e.target.value })
                }
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              >
                {EXPENSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={expenseData.amount}
                onChange={(e) =>
                  setExpenseData({ ...expenseData, amount: e.target.value })
                }
                placeholder="e.g., 100"
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Description
            </label>
            <input
              type="text"
              value={expenseData.description}
              onChange={(e) =>
                setExpenseData({ ...expenseData, description: e.target.value })
              }
              placeholder="e.g., Mumbai highway toll"
              className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => setShowExpenseModal(false)}
              className="rounded-md border border-black/10 px-4 py-2 text-sm font-medium text-text hover:bg-paper-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-signal px-4 py-2 text-sm font-medium text-ink hover:bg-signal-dark transition"
            >
              Log Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}