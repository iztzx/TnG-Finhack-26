"""
Alibaba Cloud IoT Platform MQTT authentication helper.

Implements HMAC-SHA1 signing per Alibaba IoT spec:
https://www.alibabacloud.com/help/doc-detail/73742.htm
"""

import hmac
import hashlib
import time


def compute_mqtt_credentials(product_key, device_name, device_secret, client_id=None):
    """
    Compute MQTT connection credentials for Alibaba Cloud IoT Platform.

    Args:
        product_key: Product Key from Alibaba Cloud IoT Console.
        device_name: Device name registered in the product.
        device_secret: Device secret issued upon registration.
        client_id: Optional custom client ID. Defaults to device_name + timestamp.

    Returns:
        Tuple of (client_id, username, password).
    """
    if client_id is None:
        client_id = f"{device_name}_{int(time.time())}"

    # Username format: {deviceName}&{productKey}
    username = f"{device_name}&{product_key}"

    # Client ID format: {clientId}|securemode=3,signmethod=hmacsha1|
    # securemode=3 means TCP + password auth (no TLS)
    mqtt_client_id = f"{client_id}|securemode=3,signmethod=hmacsha1|"

    # Sign content: clientId{clientId}deviceName{deviceName}productKey{productKey}
    sign_content = f"clientId{client_id}deviceName{device_name}productKey{product_key}"

    # Password: HMAC-SHA1 of sign_content using device_secret as key
    password = hmac.new(
        device_secret.encode('utf-8'),
        sign_content.encode('utf-8'),
        hashlib.sha1
    ).hexdigest()

    return mqtt_client_id, username, password
