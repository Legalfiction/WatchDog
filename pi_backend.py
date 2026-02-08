
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
VERSION = "2.9.0"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try: return json.load(f)
            except: return {}
    return {}

def save_db(db):
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=4)

def send_raw_wa(phone, apikey, text):
    if not phone or not apikey: return False
    url = "https://api.callmebot.com/whatsapp.php"
    try:
        r = requests.get(url, params={"phone": phone, "apikey": apikey, "text": text}, timeout=15)
        return r.status_code == 200
    except: return False

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({"status": "online", "version": VERSION})

@app.route('/ping', methods=['POST'])
def handle_ping():
    """Elke ping werkt de database bij EN stuurt direct een WhatsApp bericht"""
    data = request.json
    user_name = data.get('user')
    if not user_name: return jsonify({"status": "error"}), 400
    
    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": data.get('contacts', []),
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    save_db(db)
    
    # Direct WhatsApp sturen naar alle contacten
    success = 0
    timestamp = datetime.now().strftime("%H:%M")
    for contact in data.get('contacts', []):
        msg = f"✅ SafeGuard: {user_name} is online ({timestamp}). Verbinding actief."
        if send_raw_wa(contact.get('phone'), contact.get('apiKey'), msg):
            success += 1
    
    print(f"[{timestamp}] Ping van {user_name}. WhatsApp verzonden naar {success} contact(en).")
    return jsonify({"status": "ok", "messages_sent": success})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts = 0

    for name, info in db.items():
        if now_str == info.get("endTime", "08:30") and info.get("last_check_date") != today_str:
            try:
                h, m = map(int, info.get("startTime", "07:00").split(':'))
                start_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
            except:
                start_dt = now.replace(hour=7, minute=0)

            if info.get("last_ping", 0) < start_dt.timestamp():
                for c in info.get("contacts", []):
                    msg = f"⚠️ ALARM: {name} heeft de app NIET geopend voor de deadline van {now_str}!"
                    send_raw_wa(c.get('phone'), c.get('apiKey'), msg)
                    alerts += 1
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"alerts": alerts})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
