
import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

DATA_FILE = "safeguard_users.json"
VERSION = "2.9.2"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try: return json.load(f)
            except: return {}
    return {}

def save_db(db):
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=4)

def send_wa(name, phone, apikey, text):
    if not phone or not apikey: return False
    url = "https://api.callmebot.com/whatsapp.php"
    try:
        print(f"   [WA] Verzend naar {name} ({phone})...")
        r = requests.get(url, params={"phone": phone, "apikey": apikey, "text": text}, timeout=15)
        if r.status_code == 200:
            print(f"   ✅ Succes voor {name}")
            return True
        else:
            print(f"   ❌ CallMeBot Fout {r.status_code} voor {name}")
            return False
    except Exception as e: 
        print(f"   ❌ Fout bij {name}: {str(e)}")
        return False

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({"status": "online", "version": VERSION})

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', 'Onbekend')
    contacts = data.get('contacts', [])
    
    now = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{now}] PING ONTVANGEN: {user_name}")
    
    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": contacts,
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    save_db(db)
    
    success = 0
    msg = f"✅ SafeGuard: {user_name} is online ({now})."
    
    for c in contacts:
        if send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), msg):
            success += 1
    
    print(f"--- Klaar. Verzonden naar {success}/{len(contacts)} ---")
    return jsonify({"status": "ok", "sent": success})

if __name__ == '__main__':
    print(f"SafeGuard Backend v{VERSION} gestart op poort 5000")
    app.run(host='0.0.0.0', port=5000)
