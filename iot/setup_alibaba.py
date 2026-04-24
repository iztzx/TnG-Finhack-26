"""
Alibaba Cloud IoT Platform setup script for TnG FinHack demo.

Prerequisites:
    pip install aliyun-python-sdk-core aliyun-python-sdk-iot

Environment variables:
    ALICLOUD_ACCESS_KEY_ID      - Your Alibaba Cloud AccessKey ID
    ALICLOUD_ACCESS_KEY_SECRET  - Your Alibaba Cloud AccessKey Secret
    ALIIOT_REGION               - Region ID (default: ap-southeast-1)

This script creates:
    1. IoT Product: TnG-SmartDevice
    2. Device: demo-device-001
    3. Thing Model (TSL) with required properties
"""

import json
import os
import sys

from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import CommonRequest

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
ACCESS_KEY_ID = os.environ.get("ALICLOUD_ACCESS_KEY_ID", "")
ACCESS_KEY_SECRET = os.environ.get("ALICLOUD_ACCESS_KEY_SECRET", "")
REGION_ID = os.environ.get("ALIIOT_REGION", "ap-southeast-1")

PRODUCT_NAME = "TnG-SmartDevice"
DEVICE_NAME = "demo-device-001"
NODE_TYPE = 0  # 0 = Device, 1 = Gateway

# ---------------------------------------------------------------------------
# Thing Model (TSL) definition
# ---------------------------------------------------------------------------
THING_MODEL = {
    "schema": "https://iotx-tsl.oss-ap-southeast-1.aliyuncs.com/schema.json",
    "profile": {
        "productKey": "${PRODUCT_KEY}",
        "version": "1.0",
    },
    "properties": [
        {
            "identifier": "gps_latitude",
            "name": "GPS Latitude",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "double",
                "specs": {
                    "min": "-90",
                    "max": "90",
                    "unit": "\u00b0",
                    "unitName": "degree",
                    "step": "0.000001",
                },
            },
        },
        {
            "identifier": "gps_longitude",
            "name": "GPS Longitude",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "double",
                "specs": {
                    "min": "-180",
                    "max": "180",
                    "unit": "\u00b0",
                    "unitName": "degree",
                    "step": "0.000001",
                },
            },
        },
        {
            "identifier": "battery",
            "name": "Battery Level",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "double",
                "specs": {
                    "min": "0",
                    "max": "100",
                    "unit": "%",
                    "unitName": "percent",
                    "step": "0.1",
                },
            },
        },
        {
            "identifier": "signal_strength",
            "name": "Signal Strength",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "int",
                "specs": {
                    "min": "-120",
                    "max": "0",
                    "unit": "dBm",
                    "unitName": "decibel milliwatts",
                    "step": "1",
                },
            },
        },
        {
            "identifier": "cpu_temperature",
            "name": "CPU Temperature",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "double",
                "specs": {
                    "min": "0",
                    "max": "100",
                    "unit": "\u00b0C",
                    "unitName": "celsius",
                    "step": "0.1",
                },
            },
        },
        {
            "identifier": "doc_type",
            "name": "Document Type",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "text",
                "specs": {
                    "length": "32",
                },
            },
        },
        {
            "identifier": "doc_hash",
            "name": "Document SHA-256 Hash",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "text",
                "specs": {
                    "length": "64",
                },
            },
        },
        {
            "identifier": "txn_ref_id",
            "name": "Transaction Reference ID",
            "accessMode": "r",
            "required": True,
            "dataType": {
                "type": "text",
                "specs": {
                    "length": "32",
                },
            },
        },
    ],
    "events": [],
    "services": [],
}


# ---------------------------------------------------------------------------
# Helper to build CommonRequest for IoT
# ---------------------------------------------------------------------------
def _iot_request(action, version="2018-01-20", protocol="HTTPS", method="POST"):
    req = CommonRequest()
    req.set_accept_format("json")
    req.set_domain(f"iot.{REGION_ID}.aliyuncs.com")
    req.set_method(method)
    req.set_protocol_type(protocol)
    req.set_version(version)
    req.set_action_name(action)
    return req


# ---------------------------------------------------------------------------
# IoT operations
# ---------------------------------------------------------------------------
def create_product(client):
    """Create the IoT Product if it does not already exist."""
    req = _iot_request("CreateProduct")
    req.add_query_param("ProductName", PRODUCT_NAME)
    req.add_query_param("NodeType", str(NODE_TYPE))
    req.add_query_param("DataFormat", "JSON")
    req.add_query_param("AliyunCommodityCode", "iothub_senior")

    try:
        resp = client.do_action_with_exception(req)
        data = json.loads(resp)
        product_key = data.get("Data", {}).get("ProductKey")
        logger.info("Created product '%s' with ProductKey: %s", PRODUCT_NAME, product_key)
        return product_key
    except Exception as exc:
        err_str = str(exc)
        if "ProductNameAlreadyExists" in err_str or "ProductAlreadyExists" in err_str:
            logger.info("Product '%s' already exists. Querying ProductKey...", PRODUCT_NAME)
            return query_product_key(client)
        raise


def query_product_key(client):
    """Query ProductKey by product name."""
    req = _iot_request("QueryProductList")
    req.add_query_param("PageSize", "10")
    req.add_query_param("CurrentPage", "1")

    resp = client.do_action_with_exception(req)
    data = json.loads(resp)
    products = data.get("Data", {}).get("List", {}).get("ProductInfo", [])
    for prod in products:
        if prod.get("ProductName") == PRODUCT_NAME:
            return prod.get("ProductKey")
    raise RuntimeError(f"Product '{PRODUCT_NAME}' not found.")


def register_device(client, product_key):
    """Register a device under the product."""
    req = _iot_request("RegisterDevice")
    req.add_query_param("ProductKey", product_key)
    req.add_query_param("DeviceName", DEVICE_NAME)

    try:
        resp = client.do_action_with_exception(req)
        data = json.loads(resp)
        creds = data.get("Data", {})
        logger.info("Registered device '%s'.", DEVICE_NAME)
        return creds
    except Exception as exc:
        err_str = str(exc)
        if "DeviceNameAlreadyExists" in err_str or "DeviceAlreadyExists" in err_str:
            logger.info("Device '%s' already exists. Querying credentials...", DEVICE_NAME)
            return query_device_info(client, product_key)
        raise


def query_device_info(client, product_key):
    """Query existing device info."""
    req = _iot_request("QueryDeviceDetail")
    req.add_query_param("ProductKey", product_key)
    req.add_query_param("DeviceName", DEVICE_NAME)

    resp = client.do_action_with_exception(req)
    data = json.loads(resp)
    detail = data.get("Data", {})
    return {
        "DeviceName": detail.get("DeviceName"),
        "DeviceSecret": detail.get("DeviceSecret"),
        "IotId": detail.get("IotId"),
    }


def create_thing_model(client, product_key):
    """Create the Thing Model (TSL) for the product."""
    tsl_json = json.dumps(THING_MODEL)
    req = _iot_request("CreateThingModel")
    req.add_query_param("ProductKey", product_key)
    req.add_query_param("ThingModelJson", tsl_json)

    resp = client.do_action_with_exception(req)
    data = json.loads(resp)
    logger.info("Thing Model created/updated. Success: %s", data.get("Success", False))
    return data


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def main():
    if not ACCESS_KEY_ID or not ACCESS_KEY_SECRET:
        logger.error("Missing ALICLOUD_ACCESS_KEY_ID or ALICLOUD_ACCESS_KEY_SECRET environment variables.")
        sys.exit(1)

    client = AcsClient(ACCESS_KEY_ID, ACCESS_KEY_SECRET, REGION_ID)

    # Step 1: Create product
    product_key = create_product(client)

    # Step 2: Register device
    device_creds = register_device(client, product_key)

    # Step 3: Create Thing Model
    create_thing_model(client, product_key)

    # Print credentials for config
    logger.info("-" * 60)
    logger.info("SETUP COMPLETE")
    logger.info("-" * 60)
    logger.info("Product Key : %s", product_key)
    logger.info("Device Name : %s", device_creds.get("DeviceName", DEVICE_NAME))
    logger.info("Device Secret: %s", device_creds.get("DeviceSecret", "N/A"))
    logger.info("-" * 60)
    logger.info("Export these as environment variables:")
    logger.info("  export ALIIOT_PRODUCT_KEY=%s", product_key)
    logger.info("  export ALIIOT_DEVICE_NAME=%s", device_creds.get("DeviceName", DEVICE_NAME))
    logger.info("  export ALIIOT_DEVICE_SECRET=%s", device_creds.get("DeviceSecret", "N/A"))
    logger.info("  export ALIIOT_REGION=%s", REGION_ID)


if __name__ == "__main__":
    main()
