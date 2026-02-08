import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- CONFIGURATIE ---
app = Flask(__name__)
CORS(app) # Staat verbindingen toe van de PWA op telefoons

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
    """Geeft aan de app door dat de Pi online is."""
    db = load_db()
    return jsonify({
        "status": "online",
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "active_users": len(db)
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    """Ontvangt de hartslag van de telefoon en slaat deze op."""
    data = request.json
    user_name = data.get('user')
    
    if not user_name:
        return jsonify({"status": "error", "message": "Geen gebruikersnaam"}), 400

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
    """Verstuurt direct een WhatsApp testbericht."""
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
    """Cron-motor: Controleert of gebruikers hun telefoon hebben gebruikt."""
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts_triggered = 0

    for name, info in db.items():
        alarm_time = info.get("endTime", "08:30")
        
        # Check alleen als het precies de juiste tijd is en we vandaag nog niet hebben gecheckt
        if now_str == alarm_time and info.get("last_check_date") != today_str:
            start_time_str = info.get("startTime", "07:00")
            try:
                # Maak een datetime object voor de starttijd van vandaag
                start_dt = now.replace(
                    hour=int(start_time_str.split(':')[0]), 
                    minute=int(start_time_str.split(':')[1]), 
                    second=0, microsecond=0
                )
            except:
                continue
            
            last_ping = info.get("last_ping", 0)
            # Als de laatste ping van VOOR de starttijd is, is de telefoon niet geopend
            if last_ping < start_dt.timestamp():
                send_whatsapp_alert(name, info)
                alerts_triggered += 1
                print(f"!!! ALARM !!! Bericht verstuurd voor {name}")
            
            # Noteer dat de check voor vandaag is uitgevoerd
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"status": "complete", "alerts": alerts_triggered})

def send_whatsapp_alert(name, info, is_test=False):
    """Verzend-functie via de CallMeBot API."""
    phone = info.get("wa_phone")
    apikey = info.get("wa_key")
    
    if not phone or not apikey:
        return False

    if is_test:
        bericht = f"SafeGuard TEST: Jouw koppeling met de Raspberry Pi (192.168.1.38) is gelukt!"
    else:
        bericht = (
            f"LET OP: {name} heeft zijn/haar telefoon vanochtend niet gebruikt voor {info.get('endTime')}. "
            f"Dit is een automatisch bericht. Neem voor de zekerheid even contact op met {name}."
        )

    # Encodeer het bericht voor URL-gebruik
    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(bericht)}&apikey={apikey}"
    
    try:
        r = requests.get(url, timeout=15)
        return r.ok
    except Exception as e:
        print(f"Fout bij verzenden WhatsApp: {e}")
        return False

if __name__ == '__main__':
    print("--- SafeGuard Pi Backend is nu actief ---")
    print("Luistert op: http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
