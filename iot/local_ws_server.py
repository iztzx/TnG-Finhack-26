"""
Local WebSocket fallback server for TnG FinHack demo.

Used as a fallback when Alibaba Cloud IoT connection fails during the demo.
Serves the same telemetry data format as the MQTT simulator.

Requires: pip install websockets
"""

import asyncio
import json
import hashlib
import logging
import random
import signal
import uuid
from datetime import datetime, timezone

import websockets

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Telemetry generators (mirrors simulator.py logic)
# ---------------------------------------------------------------------------
BASE_LAT = 3.1390
BASE_LON = 101.6869
DOC_TYPES = ["invoice", "receipt", "contract"]

_battery = 100.0


def _drift(value, delta):
    return value + random.uniform(-delta, delta)


def generate_telemetry():
    """Generate a single telemetry payload."""
    global _battery

    lat = _drift(BASE_LAT, 0.005)
    lon = _drift(BASE_LON, 0.005)

    _battery -= random.uniform(0.0, 0.5)
    _battery = max(70.0, min(100.0, _battery))

    signal_dbm = random.randint(-80, -40)
    cpu_temp = random.uniform(28.0, 45.0)

    doc_type = random.choice(DOC_TYPES)
    doc_timestamp = datetime.now(timezone.utc).isoformat()
    dummy_content = f"dummy-doc-{uuid.uuid4().hex}"
    doc_hash = hashlib.sha256(dummy_content.encode()).hexdigest()
    txn_ref_id = f"TXN-{uuid.uuid4().hex[:8]}"

    payload = {
        "id": str(uuid.uuid4()),
        "version": "1.0",
        "params": {
            "gps_latitude": {"value": round(lat, 6), "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "gps_longitude": {"value": round(lon, 6), "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "battery": {"value": round(_battery, 1), "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "signal_strength": {"value": signal_dbm, "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "cpu_temperature": {"value": round(cpu_temp, 1), "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "doc_type": {"value": doc_type, "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "doc_hash": {"value": doc_hash, "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
            "txn_ref_id": {"value": txn_ref_id, "time": int(datetime.now(timezone.utc).timestamp() * 1000)},
        },
        "method": "thing.event.property.post",
    }
    return payload


# ---------------------------------------------------------------------------
# WebSocket server
# ---------------------------------------------------------------------------
PUBLISH_INTERVAL = 2  # seconds


async def telemetry_stream(websocket):
    """Send telemetry data to a connected WebSocket client every 2 seconds."""
    client_ip = websocket.remote_address[0] if websocket.remote_address else "unknown"
    logger.info("Client connected: %s", client_ip)
    try:
        while True:
            payload = generate_telemetry()
            await websocket.send(json.dumps(payload))
            logger.info(
                "Sent to %s: txn=%s | battery=%.1f%% | cpu=%.1fC | sig=%ddBm",
                client_ip,
                payload["params"]["txn_ref_id"]["value"],
                payload["params"]["battery"]["value"],
                payload["params"]["cpu_temperature"]["value"],
                payload["params"]["signal_strength"]["value"],
            )
            await asyncio.sleep(PUBLISH_INTERVAL)
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected: %s", client_ip)
    except Exception as exc:
        logger.error("Error with client %s: %s", client_ip, exc)


async def main():
    host = "localhost"
    port = 8765

    stop_event = asyncio.Event()

    def _shutdown(signum):
        logger.info("Shutdown signal received. Stopping WebSocket server...")
        stop_event.set()

    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGINT, _shutdown, signal.SIGINT)
    loop.add_signal_handler(signal.SIGTERM, _shutdown, signal.SIGTERM)

    logger.info("Starting local WebSocket fallback server on ws://%s:%d", host, port)
    async with websockets.serve(telemetry_stream, host, port):
        await stop_event.wait()

    logger.info("WebSocket server stopped.")


if __name__ == "__main__":
    asyncio.run(main())
