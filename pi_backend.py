
import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# Zeer permissieve CORS voor mobiele PWA's
CORS(app, resources={r"/*": {"origins": "*"}}) 

DATA_FILE = "safeguard_users.json"
VERSION = "3.8.1"

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
        print(f"[WA] {datetime.now().strftime('%H:%M:%S')} - Bericht naar {name}: {text[:30]}...")
        return r.status_code == 200
    except Exception as e:
        print(f"[WA ERROR] {e}")
        return False

@app.before_request
def log_request_info():
    # Toon elke binnenkomende aanroep in de terminal
    print(f"[REQ] {datetime.now().strftime('%H:%M:%S')} - {request.method} {request.path} van {request.remote_addr}")

@app.route('/', methods=['GET'])
def health_check():
    return f"SafeGuard Backend v{VERSION} is ONLINE. Server tijd: {datetime.now().strftime('%H:%M:%S')}"

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
        "is_monitored": user in db
    })

@app.route('/test_contact', methods=['POST'])
def test_contact():
    data = request.json
    name = data.get('name', 'Test')
    phone = data.get('phone')
    apikey = data.get('apiKey')
    msg = f"🔔 SafeGuard Test: Hallo {name}, je Pi is verbonden!"
    if send_wa(name, phone, apikey, msg):
        return jsonify({"status": "ok"})
    return jsonify({"status": "error"}), 400

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', 'Onbekend')
    now_ts = time.time()
    
    db = load_db()
    db[user_name] = {
        "last_ping": now_ts,
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": data.get('contacts', []),
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    save_db(db)
    print(f"[PING] {user_name} succesvol geregistreerd.")
    return jsonify({"status": "success", "server_received": True})

@app.route('/manual_checkin', methods=['POST'])
def handle_manual():
    data = request.json
    user_name = data.get('user', 'Onbekend')
    contacts = data.get('contacts', [])
    now_str = datetime.now().strftime("%H:%M")
    
    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": contacts,
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    save_db(db)
    
    msg = f"✅ SafeGuard: {user_name} is OK ({now_str})."
    success = 0
    for c in contacts:
        if send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), msg):
            success += 1
            
    return jsonify({"status": "ok", "sent": success})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    now_hm = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts = 0

    for name, info in db.items():
        deadline = info.get("endTime", "08:30")
        
        if now_hm == deadline and info.get("last_check_date") != today_str:
            print(f"[WATCHDOG] Deadline bereikt voor {name}")
            try:
                h, m = map(int, info.get("startTime", "07:00").split(':'))
                start_of_day = now.replace(hour=h, minute=m, second=0).timestamp()
            except:
                start_of_day = now.replace(hour=7, minute=0, second=0).timestamp()

            if info.get("last_ping", 0) < start_of_day:
                print(f"[ALERT] {name} heeft deadline gemist!")
                for c in info.get("contacts", []):
                    alert_msg = f"⚠️ SafeGuard ALARM: {name} heeft zich niet gemeld voor de deadline van {deadline}!"
                    send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), alert_msg)
                    alerts += 1
            
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"time": now_hm, "alerts": alerts})

if __name__ == '__main__':
    print(f"--- SafeGuard Backend v{VERSION} Gestart op poort 5000 ---")
    app.run(host='0.0.0.0', port=5000, debug=False)
