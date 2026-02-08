
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
VERSION = "5.0.0"

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
        "version": VERSION, 
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "your_last_ping": last_ping_str,
        "is_monitored": user in db,
        "vacation_mode": user_info.get("vacationMode", False),
        "battery": user_info.get("last_battery", "Onbekend"),
        "active_days": user_info.get("activeDays", [0,1,2,3,4])
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', 'Onbekend').strip()
    if not user_name: return jsonify({"status": "error"}), 400
    
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
    print(f"[PING] {user_name} ({data.get('battery', '??')}%)")
    return jsonify({"status": "success"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_day_idx = now.weekday() 
    alerts = 0

    for name, info in db.items():
        if info.get("vacationMode", False):
            continue
            
        active_days = info.get("activeDays", [0,1,2,3,4])
        if current_day_idx not in active_days:
            continue

        deadline_str = info.get("endTime", "08:30")
        try:
            h, m = map(int, deadline_str.split(':'))
            deadline_today = now.replace(hour=h, minute=m, second=0)
        except:
            deadline_today = now.replace(hour=8, minute=30, second=0)

        if now > deadline_today and info.get("last_check_date") != today_str:
            try:
                sh, sm = map(int, info.get("startTime", "07:00").split(':'))
                start_of_day = now.replace(hour=sh, minute=sm, second=0).timestamp()
            except:
                start_of_day = now.replace(hour=7, minute=0, second=0).timestamp()

            if info.get("last_ping", 0) < start_of_day:
                batt = info.get("last_battery", "??")
                for c in info.get("contacts", []):
                    alert_msg = f"⚠️ SafeGuard ALARM: {name} heeft zich vandaag ({now.strftime('%a')}) niet gemeld voor {deadline_str}! (Laatste batt: {batt}%)"
                    send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), alert_msg)
                    alerts += 1
            
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"alerts_sent": alerts})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
