
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
VERSION = "3.0.0"

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
        # We gebruiken een korte timeout voor snellere feedback in de app
        r = requests.get(url, params={"phone": phone, "apikey": apikey, "text": text}, timeout=10)
        return r.status_code == 200
    except:
        return False

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({"status": "online", "version": VERSION, "server_time": datetime.now().strftime("%H:%M:%S")})

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', 'Onbekend')
    contacts = data.get('contacts', [])
    
    now_dt = datetime.now()
    now_str = now_dt.strftime("%H:%M:%S")
    print(f"\n[{now_str}] PING van {user_name}")
    
    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": contacts,
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    save_db(db)
    
    # Verstuur direct de bevestiging naar alle ontvangers
    msg = f"✅ SafeGuard: {user_name} is online ({now_str})."
    success = 0
    for c in contacts:
        if send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), msg):
            print(f"   - Bevestiging naar {c.get('name')} VERZONDEN")
            success += 1
        else:
            print(f"   - Bevestiging naar {c.get('name')} MISLUKT")
    
    return jsonify({"status": "ok", "sent": success})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """Dit endpoint moet door een cronjob worden aangeroepen elke minuut"""
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts = 0

    for name, info in db.items():
        deadline = info.get("endTime", "08:30")
        
        # Is het nu de deadline tijd en hebben we vandaag nog niet gecheckt?
        if now_str == deadline and info.get("last_check_date") != today_str:
            print(f"[{now_str}] Deadline bereikt voor {name}. Controleren...")
            
            # Bepaal starttijd van vandaag
            try:
                h, m = map(int, info.get("startTime", "07:00").split(':'))
                start_of_day = now.replace(hour=h, minute=m, second=0, microsecond=0).timestamp()
            except:
                start_of_day = now.replace(hour=7, minute=0, second=0).timestamp()

            # Check of laatste ping van VOOR de starttijd was
            if info.get("last_ping", 0) < start_of_day:
                print(f"   ⚠️ ALARM! Geen activiteit van {name} vandaag!")
                for c in info.get("contacts", []):
                    alert_msg = f"⚠️ ALARM: {name} heeft zich niet gemeld voor de deadline van {deadline}! Controleer of alles goed gaat."
                    send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), alert_msg)
                    alerts += 1
            else:
                print(f"   ✅ Alles in orde voor {name}")
            
            # Markeer als gecheckt voor vandaag
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"checked": True, "alerts_sent": alerts})

if __name__ == '__main__':
    print(f"SafeGuard Backend v{VERSION} gestart.")
    app.run(host='0.0.0.0', port=5000, debug=False)
