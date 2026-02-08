
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
VERSION = "2.6.7"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try:
                return json.load(f)
            except:
                return {}
    return {}

def save_db(db):
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=4)

@app.route('/status', methods=['GET'])
def get_status():
    db = load_db()
    return jsonify({
        "status": "online",
        "version": VERSION,
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "active_users": list(db.keys()),
        "build": "watchdog_v267_multi_contact"
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user')
    
    if not user_name:
        return jsonify({"status": "error", "message": "Naam ontbreekt"}), 400

    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": data.get('contacts', []),
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    
    save_db(db)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] v{VERSION} PING: {user_name}")
    return jsonify({"status": "ok", "version": VERSION})

@app.route('/test_wa', methods=['POST'])
def test_whatsapp():
    data = request.json
    user = data.get('user', 'SafeGuard Gebruiker')
    contact = data.get('contact', {})
    
    success = send_whatsapp_alert(user, contact, is_test=True)
    return jsonify({"status": "sent" if success else "failed"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts_triggered = 0

    for name, info in db.items():
        alarm_time = info.get("endTime", "08:30")
        
        # Alleen checken op het exacte tijdstip van de deadline
        if now_str == alarm_time and info.get("last_check_date") != today_str:
            start_time_str = info.get("startTime", "07:00")
            try:
                start_dt = now.replace(
                    hour=int(start_time_str.split(':')[0]), 
                    minute=int(start_time_str.split(':')[1]), 
                    second=0, microsecond=0
                )
            except: continue
            
            last_ping = info.get("last_ping", 0)
            # Als laatste ping OUDER is dan de starttijd van vanochtend -> ALARM
            if last_ping < start_dt.timestamp():
                contacts = info.get("contacts", [])
                for contact in contacts:
                    send_whatsapp_alert(name, contact)
                    alerts_triggered += 1
                print(f"!!! v{VERSION} MULTI-ALARM VOOR {name} VERSTUURD !!!")
            
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"status": "check_complete", "total_alerts": alerts_triggered})

def send_whatsapp_alert(user_name, contact, is_test=False):
    phone = contact.get("phone")
    apikey = contact.get("apiKey")
    contact_name = contact.get("name", "Contact")
    
    if not phone or not apikey: return False

    if is_test:
        bericht = f"SafeGuard v{VERSION}: Test bericht voor {contact_name} succesvol!"
    else:
        bericht = (
            f"WATCHDOG ALARM: {user_name} heeft zijn/haar telefoon NIET geopend "
            f"voor de deadline van {datetime.now().strftime('%H:%M')}. "
            f"Controleer direct of alles goed gaat met {user_name}."
        )

    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(bericht)}&apikey={apikey}"
    try:
        r = requests.get(url, timeout=15)
        return r.ok
    except Exception as e:
        print(f"WhatsApp Error v{VERSION}: {e}")
        return False

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
