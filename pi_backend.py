
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

# --- ENDPOINTS ---

@app.route('/status', methods=['GET'])
def get_status():
    """Route voor de frontend om te checken of de Pi online is."""
    return jsonify({
        "status": "online",
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "active_users": len(load_db())
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    """Ontvangt de hartslag van een telefoon."""
    data = request.json
    user_name = data.get('user')
    
    if not user_name:
        return jsonify({"status": "error", "message": "Geen naam opgegeven"}), 400

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
    print(f"[{datetime.now().strftime('%H:%M:%S')}] PING van {user_name}")
    return jsonify({"status": "ok"})

@app.route('/test_wa', methods=['POST'])
def test_whatsapp():
    """Handmatige test om te zien of CallMeBot werkt."""
    data = request.json
    name = data.get('user', 'Test Gebruiker')
    info = {
        "wa_phone": data.get('wa_phone'),
        "wa_key": data.get('wa_key')
    }
    success = send_whatsapp_alert(name, info, is_test=True)
    return jsonify({"status": "sent" if success else "failed"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """De motor die door Cron wordt aangeroepen."""
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts_triggered = 0

    for name, info in db.items():
        alarm_time = info.get("endTime", "08:30")
        
        if now_str == alarm_time and info.get("last_check_date") != today_str:
            start_time_str = info.get("startTime", "07:00")
            start_dt = now.replace(
                hour=int(start_time_str.split(':')[0]), 
                minute=int(start_time_str.split(':')[1]), 
                second=0, microsecond=0
            )
            
            if info.get("last_ping", 0) < start_dt.timestamp():
                send_whatsapp_alert(name, info)
                alerts_triggered += 1
            
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"status": "complete", "alerts": alerts_triggered})

def send_whatsapp_alert(name, info, is_test=False):
    phone = info.get("wa_phone")
    apikey = info.get("wa_key")
    
    if not phone or not apikey: return False

    bericht = (
        f"TEST BERICHT: CallMeBot werkt!" if is_test else
        f"Het blijkt dat {name} zijn toestel vanochtend niet heeft geopend. "
        f"Vermoedelijk is er niets aan de hand. Wellicht is het verstandig om "
        f"toch even contact op te nemen."
    )

    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(bericht)}&apikey={apikey}"
    try:
        r = requests.get(url, timeout=10)
        return r.ok
    except:
        return False

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
