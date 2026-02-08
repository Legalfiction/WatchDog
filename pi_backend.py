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
VERSION = "2.6.5"

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
    """Geeft de huidige server status door aan de app."""
    db = load_db()
    return jsonify({
        "status": "online",
        "version": VERSION,
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "active_users": list(db.keys()),
        "build": "watchdog_v265_stable"
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    """Slaat de hartslag van een gebruiker op."""
    data = request.json
    user_name = data.get('user')
    
    if not user_name:
        return jsonify({"status": "error", "message": "Naam ontbreekt"}), 400

    db = load_db()
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "wa_phone": data.get('wa_phone'),
        "wa_key": data.get('wa_key'),
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    
    save_db(db)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] v{VERSION} PING: {user_name}")
    return jsonify({"status": "ok", "version": VERSION})

@app.route('/test_wa', methods=['POST'])
def test_whatsapp():
    """Directe test van CallMeBot koppeling."""
    data = request.json
    name = data.get('user', 'Test-gebruiker')
    info = {
        "wa_phone": data.get('wa_phone'),
        "wa_key": data.get('wa_key')
    }
    success = send_whatsapp_alert(name, info, is_test=True)
    return jsonify({"status": "sent" if success else "failed", "version": VERSION})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """Checkt of gebruikers hun telefoon hebben geopend voor de deadline."""
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts_triggered = 0

    for name, info in db.items():
        alarm_time = info.get("endTime", "08:30")
        
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
            if last_ping < start_dt.timestamp():
                send_whatsapp_alert(name, info)
                alerts_triggered += 1
                print(f"!!! v{VERSION} ALARM: {name} !!!")
            
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"status": "check_complete", "alerts_sent": alerts_triggered, "version": VERSION})

def send_whatsapp_alert(name, info, is_test=False):
    phone = info.get("wa_phone")
    apikey = info.get("wa_key")
    
    if not phone or not apikey: return False

    if is_test:
        bericht = f"SafeGuard v{VERSION}: Test bericht succesvol!"
    else:
        bericht = (
            f"WATCHDOG ALARM: {name} heeft zijn/haar telefoon NIET geopend voor de deadline ({info.get('endTime')}). "
            f"Controleer direct of alles in orde is."
        )

    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(bericht)}&apikey={apikey}"
    try:
        r = requests.get(url, timeout=15)
        return r.ok
    except Exception as e:
        print(f"WhatsApp Fout v{VERSION}: {e}")
        return False

if __name__ == '__main__':
    print(f"SafeGuard v{VERSION} Watchdog gestart op Pi.")
    app.run(host='0.0.0.0', port=5000, debug=False)