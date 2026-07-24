import { getToken } from "./auth.js";

// Derive WS URL from API URL: http://host → ws://host, https://host → wss://host
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const WS_URL = import.meta.env.VITE_WS_URL ||
  API_URL.replace(/^http/, "ws").replace(/\/$/, "");

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;
let listeners = [];
let _intentionalClose = false;
let _connected = false;

/** True when the WebSocket is open. */
export function isConnected() {
  return _connected;
}

/**
 * Start the WebSocket connection.
 * Automatically reconnects on unexpected disconnects.
 */
export function connectWebSocket() {
  const token = getToken();
  if (!token) {
    console.warn("[ws] No token — skipping connect");
    return;
  }

  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    console.log("[ws] Already connected or connecting");
    return;
  }

  _intentionalClose = false;
  const url = `${WS_URL}/ws?token=${token}`;
  console.log("[ws] Connecting to", url);

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error("[ws] Failed to create WebSocket", e);
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    _connected = true;
    console.log("[ws] ✅ Connected");

    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send("ping");
      }
    }, 30_000);
  };

  ws.onmessage = (event) => {
    try {
      const { event: eventType, data } = JSON.parse(event.data);
      console.log("[ws] 📩", eventType, data);
      listeners.forEach((fn) => fn(eventType, data));
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = (e) => {
    _connected = false;
    console.log("[ws] ❌ Closed", e.code, e.reason);
    clearInterval(pingInterval);
    if (!_intentionalClose) {
      scheduleReconnect();
    }
  };

  ws.onerror = (e) => {
    console.error("[ws] ⚠️ Error — will reconnect on close");
  };
}

export function disconnectWebSocket() {
  _intentionalClose = true;
  _connected = false;
  clearTimeout(reconnectTimeout);
  clearInterval(pingInterval);
  if (ws) {
    ws.close();
    ws = null;
  }
  console.log("[ws] Disconnected");
}

export function onWebSocketEvent(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimeout);
  reconnectTimeout = setTimeout(() => {
    console.log("[ws] Reconnecting...");
    if (!_intentionalClose && getToken()) {
      connectWebSocket();
    }
  }, 5_000);
}
