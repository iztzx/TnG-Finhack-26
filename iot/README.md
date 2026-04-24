# TnG FinHack 26 — Alibaba Cloud IoT Platform Integration

This directory contains the Alibaba Cloud IoT Platform integration code for the TnG (Touch 'n Go) FinHack hackathon demo.

> **Compliance Note:** This code intentionally does NOT handle, store, or transmit wallet balances, transaction amounts, KYC data, risk scores, or credit decisions. It publishes synthetic device telemetry and document metadata only.

---

## Prerequisites

- Python 3.8 or newer
- An active [Alibaba Cloud account](https://www.alibabacloud.com/)
- AccessKey ID and AccessKey Secret from Alibaba Cloud RAM console

---

## Step 1: Create an IoT Platform Product in the Console

1. Log in to the [Alibaba Cloud IoT Platform Console](https://iot.console.aliyun.com/).
2. In the left navigation pane, choose **Products**.
3. Click **Create Product**.
4. Fill in the product details:
   - **Product Name**: `TnG-SmartDevice`
   - **Node Type**: Device
   - **Data Format**: ICA Standard Data Format (JSON)
   - **Classification**: Custom (or choose a relevant category)
5. Click **Save**.
6. Note down the **Product Key** displayed on the product list page.

---

## Step 2: Register a Device

1. Inside your product, click the **Devices** tab.
2. Click **Add Device**.
3. Enter **Device Name**: `demo-device-001`.
4. Click **OK**.
5. After creation, a popup shows the **Device Secret**. Click **Copy** and save it securely. This is the only time it is shown.

---

## Step 3: Configure the Thing Model (TSL)

1. On the product page, click **Define Thing Model** > **Edit Draft**.
2. Add the following **Properties** one by one:

| Identifier        | Name                    | Data Type | Range / Length |
|-------------------|-------------------------|-----------|----------------|
| `gps_latitude`    | GPS Latitude            | double    | -90 to 90      |
| `gps_longitude`   | GPS Longitude           | double    | -180 to 180    |
| `battery`         | Battery Level           | double    | 0 to 100       |
| `signal_strength` | Signal Strength         | int       | -120 to 0      |
| `cpu_temperature` | CPU Temperature         | double    | 0 to 100       |
| `doc_type`        | Document Type           | text      | 32 chars       |
| `doc_hash`        | Document SHA-256 Hash   | text      | 64 chars       |
| `txn_ref_id`      | Transaction Reference ID| text      | 32 chars       |

3. Click **Publish** to activate the thing model.

> **Alternative:** You can automate Steps 1–3 by running `python setup_alibaba.py` (requires `aliyun-python-sdk-core` and `aliyun-python-sdk-iot`).

---

## Step 4: Set Up Data Forwarding (Optional)

To persist telemetry in Table Store (OTS) for dashboarding:

1. In the IoT Platform console, go to **Rules Engine** > **Data Flow**.
2. Click **Create Rule**.
3. Set the **SQL** query to listen for device property posts:
   ```sql
   SELECT * FROM /sys/{ProductKey}/{DeviceName}/thing/event/property/post
   ```
4. Add an action: **Store Data in Table Store**.
5. Configure your Table Store instance, table name, and column mappings.
6. Click **Save** and **Enable** the rule.

---

## Step 5: Copy Device Credentials to Environment Variables

Export the credentials obtained in Steps 1 and 2:

```bash
export ALIIOT_PRODUCT_KEY=<your_product_key>
export ALIIOT_DEVICE_NAME=demo-device-001
export ALIIOT_DEVICE_SECRET=<your_device_secret>
export ALIIOT_REGION=ap-southeast-1
```

On Windows (PowerShell):

```powershell
$env:ALIIOT_PRODUCT_KEY="<your_product_key>"
$env:ALIIOT_DEVICE_NAME="demo-device-001"
$env:ALIIOT_DEVICE_SECRET="<your_device_secret>"
$env:ALIIOT_REGION="ap-southeast-1"
```

---

## Step 6: Install Dependencies

```bash
pip install -r requirements.txt
```

---

## Step 7: Run the Simulator

```bash
python simulator.py
```

You should see log output showing connection to Alibaba Cloud IoT and published telemetry every 2 seconds.

### Burst Mode

To enable burst mode (publish every 0.5 seconds for 10 seconds, then revert):

```bash
export BURST_MODE=1
python simulator.py
```

On Windows (PowerShell):

```powershell
$env:BURST_MODE="1"
python simulator.py
```

---

## Local Fallback (No Cloud Connection)

If Alibaba Cloud connectivity is unavailable during the demo, use the local WebSocket server:

1. Start the fallback server:
   ```bash
   python local_ws_server.py
   ```
2. Connect any WebSocket client to `ws://localhost:8765`.
3. The server streams the same telemetry JSON every 2 seconds.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Connection refused` or timeout | Verify `ALIIOT_REGION` matches your IoT product region. Ensure port 1883 is not blocked by a firewall. |
| `Authentication failure` | Double-check `ALIIOT_DEVICE_SECRET`. It must match the secret shown at device creation time. |
| `ProductKey placeholder warning` | Set the `ALIIOT_PRODUCT_KEY` environment variable instead of using the placeholder. |
| `ModuleNotFoundError` | Run `pip install -r requirements.txt`. |
| WebSocket client cannot connect | Ensure `local_ws_server.py` is running and the client targets `ws://localhost:8765`. |
| Burst mode not working | Ensure `BURST_MODE` is set to exactly `1` before starting the simulator. |

---

## File Overview

| File | Purpose |
|------|---------|
| `simulator.py` | MQTT device simulator publishing to Alibaba Cloud IoT |
| `config.py` | Central configuration (credentials, intervals, region) |
| `auth.py` | HMAC-SHA1 credential computation per Alibaba IoT spec |
| `setup_alibaba.py` | Programmatic setup of product, device, and thing model |
| `local_ws_server.py` | Local WebSocket fallback for offline demos |
| `requirements.txt` | Python dependencies |
| `README.md` | This file |
