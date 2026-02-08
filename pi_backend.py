
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
VERSION = "2.8.5"

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

def send_raw_wa(phone, apikey, text):
    """Verstuurt WhatsApp bericht via CallMeBot met verbeterde error-handling"""
    if not phone or not apikey:
        print(f"!!! Error: Telefoon ({phone}) of API Key ({apikey}) ontbreekt.")
        return False
    
    url = "https://api.callmebot.com/whatsapp.php"
    params = {
        "phone": phone,
        "apikey": apikey,
        "text": text
    }
    
    try:
        print(f"-> Versturen naar {phone}...")
        r = requests.get(url, params=params, timeout=15)
        if r.status_code == 200:
            print(f"✅ Succes! WhatsApp gestuurd naar {phone}")
            return True
        else:
            print(f"❌ CallMeBot Fout {r.status_code}: {r.text}")
            return False
    except Exception as e:
        print(f"❌ Verbindingsfout met CallMeBot: {str(e)}")
        return False

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
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Ping van {user_name} verwerkt.")
    return jsonify({"status": "ok"})

@app.route('/immediate_checkin', methods=['POST'])
def immediate_checkin():
    data = request.json
    user_name = data.get('user')
    contacts = data.get('contacts', [])
    
    success_count = 0
    for contact in contacts:
        # We maken het bericht persoonlijk zodat CallMeBot spamfilters niet triggert
        bericht = f"✅ SafeGuard: {user_name} heeft zojuist ingelogd op {datetime.now().strftime('%H:%M')}. De verbinding werkt perfect!"
        if send_raw_wa(contact.get('phone'), contact.get('apiKey'), bericht):
            success_count += 1
            
    return jsonify({"status": "completed", "count": success_count})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts = 0

    for name, info in db.items():
        # Check alleen op de eindtijd
        if now_str == info.get("endTime", "08:30") and info.get("last_check_date") != today_str:
            start_str = info.get("startTime", "07:00")
            # Converteer startTime naar een timestamp van vandaag
            try:
                h, m = map(int, start_str.split(':'))
                start_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
            except:
                start_dt = now.replace(hour=7, minute=0, second=0)

            # Als de laatste ping VOOR de starttijd van vandaag was
            if info.get("last_ping", 0) < start_dt.timestamp():
                print(f"!!! ALARM voor {name} !!!")
                for c in info.get("contacts", []):
                    msg = f"⚠️ ALARM: {name} heeft de SafeGuard app NIET geopend voor de deadline van {now_str}. Controleer direct of alles goed gaat!"
                    if send_raw_wa(c.get('phone'), c.get('apiKey'), msg):
                        alerts += 1
            
            # Noteer dat we de check voor vandaag gedaan hebben
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"alerts": alerts, "checked_at": now_str})

if __name__ == '__main__':
    # Luister op alle IP-adressen op poort 5000
    app.run(host='0.0.0.0', port=5000, debug=False)
