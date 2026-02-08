
import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

DATA_FILE = "safeguard_users.json"
VERSION = "5.1.0"

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
        r = requests.get(url, params={"phone": phone, "apikey": apikey, "text": text}, timeout=15)
        return r.status_code == 200
    except Exception as e:
        print(f"[WA ERROR] {e}")
        return False

@app.route('/status', methods=['GET'])
def get_status():
    user = request.args.get('user')
    db = load_db()
    user_info = db.get(user, {}) if user else {}
    last_ping_raw = user_info.get('last_ping', 0)
    last_ping_str = datetime.fromtimestamp(last_ping_raw).strftime("%H:%M:%S") if last_ping_raw else "--:--:--"

    return jsonify({
        "status": "online", 
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "your_last_ping": last_ping_str,
        "is_monitored": user in db
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', '').strip()
    if not user_name: return jsonify({"status": "error", "message": "No username"}), 400
    
    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "last_battery": data.get('battery', '??'),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": data.get('contacts', []),
        "vacationMode": data.get('vacationMode', False),
        "activeDays": data.get('activeDays', [0,1,2,3,4]),
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    save_db(db)
    print(f"[WATCHDOG] Ping ontvangen van {user_name} om {datetime.now().strftime('%H:%M:%S')}")
    return jsonify({"status": "success"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_day_idx = now.weekday() 
    alerts_sent = 0

    print(f"[CHECK] Systeem controleert {len(db)} gebruikers...")

    for name, info in db.items():
        if info.get("vacationMode", False):
            print(f" - {name}: Vakantiemodus aan, overslaan.")
            continue
            
        active_days = info.get("activeDays", [0,1,2,3,4])
        if current_day_idx not in active_days:
            print(f" - {name}: Rustdag vandaag, overslaan.")
            continue

        deadline_str = info.get("endTime", "08:30")
        try:
            h, m = map(int, deadline_str.split(':'))
            deadline_today = now.replace(hour=h, minute=m, second=0)
        except:
            deadline_today = now.replace(hour=8, minute=30, second=0)

        # Check of we de deadline gepasseerd zijn
        if now > deadline_today:
            # Check of we vandaag al een controle hebben gedaan
            if info.get("last_check_date") != today_str:
                print(f" - {name}: Deadline {deadline_str} gepasseerd. Controleren melding...")
                
                try:
                    sh, sm = map(int, info.get("startTime", "07:00").split(':'))
                    start_of_day_ts = now.replace(hour=sh, minute=sm, second=0).timestamp()
                except:
                    start_of_day_ts = now.replace(hour=7, minute=0, second=0).timestamp()

                # Is de laatste ping van VOOR de start van vandaag?
                if info.get("last_ping", 0) < start_of_day_ts:
                    print(f" !!! {name} heeft GEEN teken van leven gegeven. Alarm verzenden!")
                    batt = info.get("last_battery", "??")
                    for c in info.get("contacts", []):
                        alert_msg = f"⚠️ Watchdog ALARM: {name} heeft zich vandaag niet gemeld voor {deadline_str}! (Laatste batt: {batt}%)"
                        send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), alert_msg)
                        alerts_sent += 1
                else:
                    print(f" - {name}: Melding was keurig op tijd.")
                
                info["last_check_date"] = today_str
        else:
            print(f" - {name}: Deadline nog niet bereikt ({deadline_str}).")

    save_db(db)
    return jsonify({"alerts_sent": alerts_sent})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
