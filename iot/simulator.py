"""
TnG FinHack 26 - Alibaba Cloud IoT MQTT Device Simulator

COMPLIANCE HARD CONSTRAINT:
This code must NEVER handle, store, or transmit:
- Wallet balances or transaction amounts
- KYC data (names, addresses, ID numbers)
- Risk scores or credit decisions

This simulator publishes synthetic telemetry and document metadata only.
"""

import json
import os
import random
import signal
import sys
import time
import uuid
import hashlib
import logging
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from config import (
    PRODUCT_KEY,
    DEVICE_NAME,
    DEVICE_SECRET,
    REGION,
    MQTT_BROKER,
    MQTT_PORT,
    PUBLISH_INTERVAL,
    BURST_INTERVAL,
    BURST_DURATION,
)
from auth import compute_mqtt_credentials

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
# Globals for graceful shutdown
# ---------------------------------------------------------------------------
SHUTDOWN_EVENT = False


def _on_signal(signum, frame):
    global SHUTDOWN_EVENT
    logger.info("Shutdown signal received (Ctrl+C). Stopping simulator...")
    SHUTDOWN_EVENT = True


signal.signal(signal.SIGINT, _on_signal)
signal.signal(signal.SIGTERM, _on_signal)

# ---------------------------------------------------------------------------
# Telemetry generators
# ---------------------------------------------------------------------------
BASE_LAT = 3.1390
BASE_LON = 101.6869

DOC_TYPES = ["invoice", "receipt", "contract"]

# Stateful telemetry
_battery = 100.0


def _drift(value, delta):
    return value + random.uniform(-delta, delta)


def generate_telemetry():
    """Generate a single telemetry payload in Alibaba IoT Alink JSON format."""
    global _battery

    # GPS: Kuala Lumpur area with small random drift
    lat = _drift(BASE_LAT, 0.005)
    lon = _drift(BASE_LON, 0.005)

    # Battery: slowly decreasing, bounded 70-100
    _battery -= random.uniform(0.0, 0.5)
    _battery = max(70.0, min(100.0, _battery))

    # Signal strength: dBm -40 to -80, fluctuating
    signal_dbm = random.randint(-80, -40)

    # CPU temperature: 28-45C, fluctuating
    cpu_temp = random.uniform(28.0, 45.0)

    # Document metadata
    doc_type = random.choice(DOC_TYPES)
    doc_timestamp = datetime.now(timezone.utc).isoformat()
    dummy_content = f"dummy-doc-{uuid.uuid4().hex}"
    doc_hash = hashlib.sha256(dummy_content.encode()).hexdigest()

    # Transaction reference ID (no amounts, no KYC)
    txn_ref_id = f"TXN-{uuid.uuid4().hex[:8]}"

    # Alink JSON payload format
    payload = {
        "id": str(uuid.uuid4()),
        "version": "1.0",
        "params": {
            "gps_latitude": {
                "value": round(lat, 6),
                "time": int(time.time() * 1000),
            },
            "gps_longitude": {
                "value": round(lon, 6),
                "time": int(time.time() * 1000),
            },
            "battery": {
                "value": round(_battery, 1),
                "time": int(time.time() * 1000),
            },
            "signal_strength": {
                "value": signal_dbm,
                "time": int(time.time() * 1000),
            },
            "cpu_temperature": {
                "value": round(cpu_temp, 1),
                "time": int(time.time() * 1000),
            },
            "doc_type": {
                "value": doc_type,
                "time": int(time.time() * 1000),
            },
            "doc_hash": {
                "value": doc_hash,
                "time": int(time.time() * 1000),
            },
            "txn_ref_id": {
                "value": txn_ref_id,
                "time": int(time.time() * 1000),
            },
        },
        "method": "thing.event.property.post",
    }

    return payload


# ---------------------------------------------------------------------------
# MQTT callbacks
# ---------------------------------------------------------------------------
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to Alibaba Cloud IoT Platform (%s)", MQTT_BROKER)
    else:
        logger.error("Connection failed with code %d", rc)


def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning("Unexpected disconnection (rc=%d). Will retry...", rc)


def on_publish(client, userdata, mid):
    logger.debug("Message %d published", mid)


# ---------------------------------------------------------------------------
# Connection with exponential backoff
# ---------------------------------------------------------------------------
def connect_with_backoff(client, max_retries=10):
    retry_delay = 1
    for attempt in range(1, max_retries + 1):
        if SHUTDOWN_EVENT:
            return False
        try:
            logger.info("Connecting to %s:%d (attempt %d/%d)", MQTT_BROKER, MQTT_PORT, attempt, max_retries)
            client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
            client.loop_start()
            # Wait a moment for connection to establish
            time.sleep(1)
            if client.is_connected():
                return True
        except Exception as exc:
            logger.error("Connection attempt %d failed: %s", attempt, exc)
        time.sleep(retry_delay)
        retry_delay = min(retry_delay * 2, 30)
    return False


# ---------------------------------------------------------------------------
# Main simulator loop
# ---------------------------------------------------------------------------
def main():
    if PRODUCT_KEY == 'your_product_key' or DEVICE_SECRET == 'your_device_secret':
        logger.warning("Using placeholder credentials. Set ALIIOT_PRODUCT_KEY, ALIIOT_DEVICE_NAME, and ALIIOT_DEVICE_SECRET env vars.")

    # Compute MQTT credentials
    client_id, username, password = compute_mqtt_credentials(
        PRODUCT_KEY, DEVICE_NAME, DEVICE_SECRET
    )

    logger.info("MQTT Client ID: %s", client_id)
    logger.info("MQTT Username:  %s", username)

    # Configure MQTT client
    client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv311)
    client.username_pw_set(username, password)
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_publish = on_publish

    if not connect_with_backoff(client):
        logger.error("Unable to connect to Alibaba Cloud IoT. Exiting.")
        sys.exit(1)

    topic = f"/sys/{PRODUCT_KEY}/{DEVICE_NAME}/thing/event/property/post"
    logger.info("Publishing to topic: %s", topic)

    # Burst mode detection
    burst_mode = os.environ.get("BURST_MODE", "0") == "1"
    if burst_mode:
        logger.info("BURST MODE enabled: publishing every %.1fs for %ds", BURST_INTERVAL, BURST_DURATION)
        burst_end_time = time.time() + BURST_DURATION
        interval = BURST_INTERVAL
    else:
        interval = PUBLISH_INTERVAL
        burst_end_time = None

    try:
        while not SHUTDOWN_EVENT:
            # Revert from burst mode after duration expires
            if burst_mode and time.time() > burst_end_time:
                logger.info("Burst mode ended. Reverting to normal interval (%ds).", PUBLISH_INTERVAL)
                burst_mode = False
                interval = PUBLISH_INTERVAL
                burst_end_time = None

            payload = generate_telemetry()
            message = json.dumps(payload)

            if client.is_connected():
                result = client.publish(topic, message, qos=1)
                if result.rc == mqtt.MQTT_ERR_SUCCESS:
                    logger.info("Published: txn=%s | battery=%.1f%% | cpu=%.1fC | sig=%ddBm",
                                payload["params"]["txn_ref_id"]["value"],
                                payload["params"]["battery"]["value"],
                                payload["params"]["cpu_temperature"]["value"],
                                payload["params"]["signal_strength"]["value"])
                else:
                    logger.warning("Publish failed (rc=%d). Will retry.", result.rc)
            else:
                logger.warning("Client disconnected. Attempting reconnect...")
                client.loop_stop()
                if not connect_with_backoff(client):
                    logger.error("Reconnect failed. Exiting.")
                    break

            # Sleep in small chunks so Ctrl+C is responsive
            slept = 0.0
            while slept < interval and not SHUTDOWN_EVENT:
                time.sleep(0.1)
                slept += 0.1

    finally:
        logger.info("Cleaning up MQTT client...")
        client.loop_stop()
        client.disconnect()
        logger.info("Simulator stopped.")


if __name__ == "__main__":
    main()
