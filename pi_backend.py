
import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- CONFIGURATIE ---
app = Flask(__name__)
CORS(app) # Staat verbinding toe vanaf de PWA op je telefoon

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
    """Geeft aan dat de Pi online is en hoeveel actieve gebruikers er zijn."""
    db = load_db()
    return jsonify({
        "status": "online",
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "active_users": len(db)
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    """Slaat de hartslag van een telefoon op."""
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
    print(f"[{datetime.now().strftime('%H:%M:%S')}] PING ontvangen van: {user_name}")
    return jsonify({"status": "ok"})

@app.route('/test_wa', methods=['POST'])
def test_whatsapp():
    """Verstuurt een direct testbericht naar WhatsApp."""
    data = request.json
    name = data.get('user', 'Test-gebruiker')
    info = {
        "wa_phone": data.get('wa_phone'),
        "wa_key": data.get('wa_key')
    }
    success = send_whatsapp_alert(name, info, is_test=True)
    return jsonify({"status": "sent" if success else "failed"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """Wordt elke minuut aangeroepen door Cron om te checken of iemand zijn telefoon NIET heeft geopend."""
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts_triggered = 0

    for name, info in db.items():
        # Kijk of het nu de ingestelde check-tijd is voor deze persoon
        alarm_time = info.get("endTime", "08:30")
        
        if now_str == alarm_time and info.get("last_check_date") != today_str:
            # Bereken de starttijd van vandaag
            start_time_str = info.get("startTime", "07:00")
            try:
                start_dt = now.replace(
                    hour=int(start_time_str.split(':')[0]), 
                    minute=int(start_time_str.split(':')[1]), 
                    second=0, microsecond=0
                )
            except:
                continue
            
            # Is de laatste ping van VOOR de starttijd? Dan is de telefoon niet geopend.
            last_ping = info.get("last_ping", 0)
            if last_ping < start_dt.timestamp():
                send_whatsapp_alert(name, info)
                alerts_triggered += 1
                print(f"!!! ALARM !!! {name} heeft telefoon niet geopend.")
            
            # Markeer als gecheckt voor vandaag
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"status": "complete", "processed": len(db), "alerts_sent": alerts_triggered})

def send_whatsapp_alert(name, info, is_test=False):
    """De eigenlijke verzending via CallMeBot."""
    phone = info.get("wa_phone")
    apikey = info.get("wa_key")
    
    if not phone or not apikey:
        return False

    if is_test:
        bericht = f"SafeGuard: Je verbinding met de Raspberry Pi is succesvol getest!"
    else:
        bericht = (
            f"Het blijkt dat {name} zijn toestel vanochtend niet heeft geopend. "
            f"Vermoedelijk is er niets aan de hand. Wellicht is het verstandig om "
            f"toch even contact met {name} op te nemen om te controleren of alles in orde is."
        )

    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(bericht)}&apikey={apikey}"
    
    try:
        r = requests.get(url, timeout=15)
        return r.ok
    except Exception as e:
        print(f"Fout bij WhatsApp verzending: {e}")
        return False

if __name__ == '__main__':
    # Start de server op alle netwerkadressen van de Pi op poort 5000
    print("SafeGuard Pi Backend start op...")
    app.run(host='0.0.0.0', port=5000, debug=False)
