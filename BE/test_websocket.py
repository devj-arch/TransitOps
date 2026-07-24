"""
Quick WebSocket test — connects as a user and listens for events.

Usage:
  cd BE && source venv/bin/activate
  python test_websocket.py
"""

import asyncio
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import websockets
import requests

API = "http://localhost:8000"
WS = "ws://localhost:8000"


def login(email, password, role):
    """Get a JWT token."""
    resp = requests.post(f"{API}/auth/login", json={
        "email": email, "password": password, "role": role
    })
    resp.raise_for_status()
    data = resp.json()
    return data["access_token"], data["user"]


# async def listen(token, user):
#     """Connect to WebSocket and print incoming events."""
#     url = f"{WS}/ws?token={token}"
#     print(f"🔌 Connecting as {user['role']} ({user['email']})...")

#     async with websockets.connect(url) as ws:
#         print("✅ Connected! Listening for events...\n")

#         # Keep alive
#         async def ping():
#             while True:
#                 await asyncio.sleep(30)
#                 await ws.send("ping")

#         asyncio.create_task(ping())

#         while True:
#             try:
#                 msg = await ws.recv()
#                 data = json.loads(msg)
#                 event = data.get("event", "?")
#                 payload = data.get("data", {})
#                 print(f"📩 {event}")
#                 print(f"   {json.dumps(payload, indent=2)}")
#                 print()
#             except websockets.ConnectionClosed:
#                 print("❌ Connection closed")
#                 break

async def listen(token, user):
    """Connect to WebSocket and print incoming events."""
    url = f"{WS}/ws?token={token}"
    print(f"🔌 Connecting as {user['role']} ({user['email']})...")

    async with websockets.connect(url) as ws:
        print("✅ Connected! Listening for events...\n")

        async def ping():
            while True:
                await asyncio.sleep(30)
                await ws.send("ping")

        asyncio.create_task(ping())

        while True:
            try:
                msg = await ws.recv()

                if not msg or msg == "pong":   # ← skip keep-alive replies
                    continue

                data = json.loads(msg)
                event = data.get("event", "?")
                payload = data.get("data", {})
                print(f"📩 {event}")
                print(f"   {json.dumps(payload, indent=2)}")
                print()

            except websockets.ConnectionClosed:
                print("❌ Connection closed")
                break
            except json.JSONDecodeError as e:          # ← catch future surprises
                print(f"⚠️  Non-JSON message received: {msg!r}")
                continue

async def main():
    if len(sys.argv) < 2:
        print("Usage: python test_websocket.py <email>")
        print("Demo:  python test_websocket.py fleet@transitops.dev")
        print("       python test_websocket.py dispatch@transitops.dev")
        return

    email = sys.argv[1]
    password = "demo1234"
    role = None

    # Determine role from email
    role_map = {
        "admin": "Admin",
        "fleet": "Fleet Manager",
        "dispatch": "Dispatcher",
        "safety": "Safety Officer",
        "finance": "Financial Analyst",
    }
    for key, val in role_map.items():
        if key in email:
            role = val
            break

    if not role:
        print("Could not determine role from email. Use one of: admin, fleet, dispatch, safety, finance")
        return

    try:
        token, user = login(email, password, role)
        print(f"🔑 Logged in as {user['name']} ({user['role']})")
        await listen(token, user)
    except requests.RequestException as e:
        print(f"❌ Login failed: {e}")
    except KeyboardInterrupt:
        print("\n👋 Disconnected")


if __name__ == "__main__":
    asyncio.run(main())
