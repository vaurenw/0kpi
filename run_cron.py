import requests
import time
from datetime import datetime

CRON_URL = "http://localhost:8187/cron/process-expired-goals"
AUTH_HEADER = "Bearer 561019712f806fb9b2aa09796edf506adc22905fbeae87a1792a72018b51a4ea"  # Replace <your-secret> with your actual internal API key

while True:
    try:
        response = requests.post(
            CRON_URL,
            headers={"Authorization": AUTH_HEADER}
        )
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Status: {response.status_code}, Response: {response.text}")
    except Exception as e:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Error: {e}")
    time.sleep(60)