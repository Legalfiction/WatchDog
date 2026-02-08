import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- CONFIGURATIE ---
app = Flask(__name__)
CORS(app) 

DATA_FILE = "safeguard_users.json"
VERSION = "2.7.0"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try: return json.load(f)
            except: return {}
    return {}

def save_db(db):
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=4)

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({
        "status": "online",
        "version": VERSION,
        "server_time": datetime.now().strftime("%H:%M:%S")
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
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
    return jsonify({"status": "ok"})

@app.route('/immediate_checkin', methods=['POST'])
def immediate_checkin():
    data = request.json
    user_name = data.get('user')
    contacts = data.get('contacts', [])
    
    success_count = 0
    for contact in contacts:
        bericht = f"✅ SafeGuard: {user_name} heeft zojuist de telefoon ontgrendeld. Alles is in orde!"
        if send_raw_wa(contact.get('phone'), contact.get('apiKey'), bericht):
            success_count += 1
            
    return jsonify({"status": "sent", "count": success_count})

@app.route('/test_wa', methods=['POST'])
def test_wa():
    data = request.json
    contact = data.get('contact', {})
    bericht = f"SafeGuard v{VERSION}: Dit is een testbericht."
    success = send_raw_wa(contact.get('phone'), contact.get('apiKey'), bericht)
    return jsonify({"status": "sent" if success else "failed"})

def send_raw_wa(phone, apikey, text):
    if not phone or not apikey: return False
    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(text)}&apikey={apikey}"
    try:
        r = requests.get(url, timeout=10)
        return r.ok
    except: return False

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts = 0

    for name, info in db.items():
        if now_str == info.get("endTime", "08:30") and info.get("last_check_date") != today_str:
            start_str = info.get("startTime", "07:00")
            start_dt = now.replace(hour=int(start_str.split(':')[0]), minute=int(start_str.split(':')[1]), second=0)
            
            if info.get("last_ping", 0) < start_dt.timestamp():
                for c in info.get("contacts", []):
                    msg = f"⚠️ ALARM: {name} heeft de telefoon NIET geopend voor de deadline van {now_str}. Controleer direct!"
                    send_raw_wa(c.get('phone'), c.get('apiKey'), msg)
                    alerts += 1
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"alerts": alerts})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)