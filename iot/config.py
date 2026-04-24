import os

# Alibaba Cloud IoT Platform credentials
# Replace these with your actual values from Alibaba Cloud Console
PRODUCT_KEY = os.environ.get('ALIIOT_PRODUCT_KEY', 'your_product_key')
DEVICE_NAME = os.environ.get('ALIIOT_DEVICE_NAME', 'demo-device-001')
DEVICE_SECRET = os.environ.get('ALIIOT_DEVICE_SECRET', 'your_device_secret')
REGION = os.environ.get('ALIIOT_REGION', 'ap-southeast-1')  # Malaysia

MQTT_BROKER = f"{PRODUCT_KEY}.iot-as-mqtt.{REGION}.aliyuncs.com"
MQTT_PORT = 1883

# Telemetry settings
PUBLISH_INTERVAL = 2  # seconds
BURST_INTERVAL = 0.5  # seconds in burst mode
BURST_DURATION = 10   # seconds
