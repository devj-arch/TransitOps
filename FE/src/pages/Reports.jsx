import { useState, useEffect } from "react";
import {
  IconAlert,
  IconBarChart3,
  IconTrendingUp,
  IconDownload,
  IconShield,
  IconTruck,
  IconWallet,
} from "../components/Icons.jsx";
import {
  listVehicles,
  getVehicleOperationalCost,
  getVehicleRoi,
  getVehicleFuelEfficiency,
  listFuelLogs,
  listExpenses,
  getFleetAnalytics,
  getSafetyAnalytics,
  getFinanceAnalytics,
} from "../lib/api.js";
import { getStoredUser } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";
import Sidebar from "../components/Sidebar.jsx";

export default function Reports() {
  const user = getStoredUser();
  const userRole = user?.role;

  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [metrics, setMetrics] = useState({ operationalCost: null, roi: null, fuelEfficiency: null });
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [error, setError] = useState("");
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [fleetData, setFleetData] = useState(null);
  const [safetyData, setSafetyData] = useState(null);
  const [financeData, setFinanceData] = useState(null);

  const isFleet = userRole === ROLES.FLEET_MANAGER || userRole === ROLES.ADMIN;
  const isSafety = userRole === ROLES.SAFETY_OFFICER || userRole === ROLES.ADMIN;
  const isFinance = userRole === ROLES.FINANCIAL_ANALYST || userRole === ROLES.ADMIN;

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      setLoading(true);

      // Fetch role-specific analytics
      const analyticsPromises = [];
      if (isFleet) analyticsPromises.push(getFleetAnalytics().then(d => setFleetData(d)).catch(() => {}));
      if (isSafety) analyticsPromises.push(getSafetyAnalytics().then(d => setSafetyData(d)).catch(() => {}));
      if (isFinance) analyticsPromises.push(getFinanceAnalytics().then(d => setFinanceData(d)).catch(() => {}));

      // Fetch shared data with allSettled so individual 403s don't kill the page
      const results = await Promise.allSettled([
        listVehicles(),
        listFuelLogs(),
        listExpenses(),
        ...analyticsPromises,
      ]);

      setVehicles(results[0].status === "fulfilled" ? results[0].value || [] : []);
      setFuelLogs(results[1].status === "fulfilled" ? results[1].value || [] : []);
      setExpenses(results[2].status === "fulfilled" ? results[2].value || [] : []);

      const vehiclesData = results[0].status === "fulfilled" ? results[0].value : null;
      if (vehiclesData && vehiclesData.length > 0 && isFinance) {
        setSelectedVehicleId(vehiclesData[0].id);
        fetchVehicleMetrics(vehiclesData[0].id);
      }
    } catch (err) {
      setError("Failed to load reports");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchVehicleMetrics(vehicleId) {
    try {
      setMetricsLoading(true);
      const results = await Promise.allSettled([
        getVehicleOperationalCost(vehicleId),
        getVehicleRoi(vehicleId),
        getVehicleFuelEfficiency(vehicleId),
      ]);
      setMetrics({
        operationalCost: results[0].status === "fulfilled" ? results[0].value : null,
        roi: results[1].status === "fulfilled" ? results[1].value : null,
        fuelEfficiency: results[2].status === "fulfilled" ? results[2].value : null,
      });
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  }

  function handleVehicleChange(e) {
    const vehicleId = parseInt(e.target.value);
    setSelectedVehicleId(vehicleId);
    fetchVehicleMetrics(vehicleId);
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
  };

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const vehicleFuelLogs = fuelLogs.filter((log) => log.vehicle_id === selectedVehicleId);
  const vehicleExpenses = expenses.filter((exp) => exp.vehicle_id === selectedVehicleId);
  const totalFuelCost = vehicleFuelLogs.reduce((sum, log) => sum + log.cost, 0);
  const totalExpenses = vehicleExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalFuelLiters = vehicleFuelLogs.reduce((sum, log) => sum + log.liters, 0);

  return (
    <div className="min-h-screen bg-paper md:pl-64">
      <Sidebar />
      <header className="border-b border-black/10 bg-white pt-14 md:pt-0">
        <div className="mx-auto max-w-7xl px-6 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold text-text">Reports & Analytics</h1>
              <p className="mt-1 text-sm text-muted">
                {isFleet && "Fleet metrics"} {isSafety && "Safety compliance"} {isFinance && "Financial insights"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 md:px-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-alert/25 bg-alert-soft px-4 py-3 text-sm text-alert">
            <IconAlert width="18" height="18" className="flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg border border-black/10 bg-white" />)}</div>
        ) : (
          <div className="space-y-10">
            {/* ── Fleet Analytics ─────────────────────────────── */}
            {isFleet && fleetData && (
              <section>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text mb-4">
                  <IconTruck width="20" height="20" className="text-signal" /> Fleet Overview
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard label="Total Vehicles" value={fleetData.total_vehicles} />
                  <MetricCard label="Active (On Trip)" value={fleetData.by_status?.["On Trip"]} />
                  <MetricCard label="In Maintenance" value={fleetData.active_maintenance_logs} />
                  <MetricCard label="Utilization" value={`${fleetData.fleet_utilization_pct}%`} />
                </div>
                {fleetData.by_status && (
                  <div className="mt-4 rounded-lg border border-black/10 bg-white p-5">
                    <h3 className="text-sm font-semibold text-text mb-3">Vehicles by Status</h3>
                    <div className="space-y-2">
                      {Object.entries(fleetData.by_status).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between text-sm">
                          <span className="text-muted">{status}</span>
                          <span className="font-medium text-text">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-4 rounded-lg border border-black/10 bg-white p-5">
                  <p className="text-sm text-muted">Total Maintenance Cost</p>
                  <p className="mt-1 font-display text-xl font-semibold text-text">
                    {formatCurrency(fleetData.total_maintenance_cost)}
                  </p>
                </div>
              </section>
            )}

            {/* ── Safety Analytics ────────────────────────────── */}
            {isSafety && safetyData && (
              <section>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text mb-4">
                  <IconShield width="20" height="20" className="text-signal" /> Safety & Compliance
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard label="Total Drivers" value={safetyData.total_drivers} />
                  <MetricCard label="Licenses Expired" value={safetyData.licenses_expired} color="alert" />
                  <MetricCard label="Expiring Soon (30d)" value={safetyData.licenses_expiring_soon} color="alert" />
                  <MetricCard label="Avg Safety Score" value={safetyData.average_safety_score} suffix="/100" />
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {safetyData.by_status && (
                    <div className="rounded-lg border border-black/10 bg-white p-5">
                      <h3 className="text-sm font-semibold text-text mb-3">Drivers by Status</h3>
                      <div className="space-y-2">
                        {Object.entries(safetyData.by_status).map(([status, count]) => (
                          <div key={status} className="flex items-center justify-between text-sm">
                            <span className="text-muted">{status}</span>
                            <span className="font-medium text-text">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-black/10 bg-white p-5">
                    <p className="text-sm text-muted">Suspended Drivers</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-alert">
                      {safetyData.suspended_drivers}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* ── Finance Analytics ───────────────────────────── */}
            {isFinance && financeData && (
              <section>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-text mb-4">
                  <IconWallet width="20" height="20" className="text-signal" /> Financial Overview
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <MetricCard label="Total Revenue" value={formatCurrency(financeData.total_revenue)} />
                  <MetricCard label="Total Costs" value={formatCurrency(financeData.total_operational_cost)} />
                  <MetricCard label="Net Return" value={formatCurrency(financeData.net_return)} color={financeData.net_return >= 0 ? "transit" : "alert"} />
                  <MetricCard label="Avg Fuel Efficiency" value={`${financeData.average_fuel_efficiency_km_per_liter} km/L`} />
                </div>
              </section>
            )}

            {/* ── Per-Vehicle Detail (Finance only) ───────────── */}
            {isFinance && vehicles.length > 0 && (
              <>
                <div>
                  <label className="block text-sm font-medium text-text mb-3">Select Vehicle for Detailed Analysis</label>
                  <select
                    value={selectedVehicleId || ""}
                    onChange={handleVehicleChange}
                    className="w-full max-w-sm rounded-md border border-black/10 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>{v.model} ({v.registration_number})</option>
                    ))}
                  </select>
                </div>

                {selectedVehicle && (
                  <>
                    <div className="rounded-lg border border-black/10 bg-white p-6">
                      <h2 className="font-display text-lg font-semibold text-text mb-4">{selectedVehicle.model}</h2>
                      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                        <Detail label="Registration" value={selectedVehicle.registration_number} />
                        <Detail label="Type" value={selectedVehicle.type} />
                        <Detail label="Capacity" value={`${selectedVehicle.max_capacity} kg`} />
                        <Detail label="Odometer" value={`${selectedVehicle.odometer.toLocaleString()} km`} />
                      </div>
                    </div>

                    {metricsLoading ? (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-lg border border-black/10 bg-white" />)}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <MetricCard
                          label="Operational Cost"
                          value={metrics.operationalCost ? formatCurrency(metrics.operationalCost.total_operational_cost) : "—"}
                          icon={<IconBarChart3 />}
                          details={metrics.operationalCost ? [
                            `Fuel: ${formatCurrency(metrics.operationalCost.fuel_cost)}`,
                            `Maintenance: ${formatCurrency(metrics.operationalCost.maintenance_cost)}`,
                          ] : []}
                        />
                        <MetricCard
                          label="Fuel Efficiency"
                          value={metrics.fuelEfficiency ? `${metrics.fuelEfficiency.fuel_efficiency_km_per_liter.toFixed(2)} km/L` : "—"}
                          icon={<IconTrendingUp />}
                          details={metrics.fuelEfficiency ? [
                            `${metrics.fuelEfficiency.total_distance_km.toLocaleString()} km`,
                            `${metrics.fuelEfficiency.total_fuel_liters.toFixed(2)} L`,
                          ] : []}
                        />
                        <MetricCard
                          label="ROI"
                          value={metrics.roi ? `${metrics.roi.roi_pct.toFixed(2)}%` : "—"}
                          icon={<IconBarChart3 />}
                          details={metrics.roi ? [
                            `Revenue: ${formatCurrency(metrics.roi.total_revenue)}`,
                            `Costs: ${formatCurrency(metrics.roi.total_costs)}`,
                          ] : []}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                      <section>
                        <h3 className="font-display text-lg font-semibold text-text mb-4">Fuel Summary</h3>
                        <div className="space-y-3">
                          <SummaryCard label="Total Fuel Liters" value={`${totalFuelLiters.toFixed(2)} L`} />
                          <SummaryCard label="Total Fuel Cost" value={formatCurrency(totalFuelCost)} />
                          <SummaryCard label="Avg Cost Per Liter" value={totalFuelLiters > 0 ? formatCurrency(totalFuelCost / totalFuelLiters) : "—"} />
                        </div>
                      </section>
                      <section>
                        <h3 className="font-display text-lg font-semibold text-text mb-4">Expense Summary</h3>
                        <div className="space-y-3">
                          <SummaryCard label="Total Expenses" value={formatCurrency(totalExpenses)} />
                          <SummaryCard label="Number of Records" value={vehicleExpenses.length} />
                          <SummaryCard label="Combined Op. Cost" value={formatCurrency(totalFuelCost + totalExpenses)} />
                        </div>
                      </section>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function MetricCard({ label, value, suffix = "", color = "", icon, details }) {
  const colorClass = color === "alert" ? "text-alert" : color === "transit" ? "text-transit" : "";
  return (
    <div className="rounded-lg border border-black/10 bg-white p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal/10 text-signal">{icon}</span>}
      </div>
      <p className={`font-display text-xl font-semibold ${colorClass || "text-text"}`}>
        {value}{suffix}
      </p>
      {details && details.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-black/10 pt-3">
          {details.map((d, i) => <p key={i} className="text-xs text-muted">{d}</p>)}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 font-semibold text-text">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-xl font-semibold text-text">{value}</p>
    </div>
  );
}
