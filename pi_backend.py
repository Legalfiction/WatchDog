import json
import os
import time
import requests
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- CONFIGURATIE ---
DATA_FILE = "safeguard_users.json"
CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php"

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

def load_db():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {}
    return {}

def save_db(db):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(db, f, indent=4)
    except IOError as e:
        logging.error(f"Fout bij opslaan database: {e}")

def format_phone(phone):
    """Saneert telefoonnummer naar internationaal format (+31...)."""
    if not phone: return ""
    p = str(phone).replace(' ', '').replace('-', '').strip()
    if p.startswith('00'): p = '+' + p[2:]
    elif p.startswith('06'): p = '+31' + p[1:]
    elif not p.startswith('+'): p = '+' + p
    return p

def send_whatsapp(phone, apikey, text):
    """Verstuurt WhatsApp via CallMeBot. Returnt True bij succes."""
    p = format_phone(phone)
    if not p or not apikey:
        return False

    params = {
        "phone": p,
        "apikey": str(apikey).strip(),
        "text": text
    }

    try:
        r = requests.get(CALLMEBOT_URL, params=params, timeout=20)
        if r.status_code == 200:
            if "error" in r.text.lower() or "invalid" in r.text.lower():
                logging.error(f"CallMeBot FOUT voor {p}: {r.text}")
                return False
            return True
        return False
    except Exception as e:
        logging.error(f"Netwerkfout WhatsApp: {e}")
        return False

@app.route('/status', methods=['GET'])
def get_status():
    user = request.args.get('user', '').strip()
    db = load_db()
    user_info = db.get(user, {})
    
    last_ping = user_info.get('last_ping', 0)
    ping_str = datetime.fromtimestamp(last_ping).strftime("%H:%M:%S") if last_ping else "--:--:--"
    
    return jsonify({
        "status": "online",
        "last_ping": ping_str,
        "battery": user_info.get('last_battery', '??')
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    """
    Update data voor een specifieke gebruiker.
    Identificatie op basis van Naam (user) en Nummer (phone).
    """
    data = request.json
    user_name = data.get('user', '').strip()
    
    if not user_name:
        return jsonify({"status": "error"}), 400
    
    db = load_db()
    user_data = db.get(user_name, {})
    
    # Update data & instellingen
    user_data["last_ping"] = time.time()
    user_data["last_battery"] = data.get('battery', user_data.get('last_battery', '?'))
    user_data["phone"] = format_phone(data.get('phone', ''))
    user_data["startTime"] = data.get('startTime', user_data.get('startTime', '07:00'))
    user_data["endTime"] = data.get('endTime', user_data.get('endTime', '09:00'))
    user_data["contacts"] = data.get('contacts', user_data.get('contacts', []))
    user_data["vacationMode"] = data.get('vacationMode', user_data.get('vacationMode', False))
    user_data["activeDays"] = data.get('activeDays', user_data.get('activeDays', [0,1,2,3,4,5,6]))
    
    db[user_name] = user_data
    save_db(db)
    
    logging.info(f"PING: {user_name} ({user_data['phone']}) | Accu: {user_data['last_battery']}%")
    return jsonify({"status": "success"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """
    Hoofd-logica die elke minuut checkt of er alarmen moeten worden verstuurd.
    """
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_weekday = now.weekday()
    
    alarms_sent = 0
    print(f"\n--- CONTROLE {now.strftime('%H:%M:%S')} ---", flush=True)

    for name, info in db.items():
        # Dagwissel reset
        if info.get("last_check_date") != today_str:
            info["alarm_sent_today"] = False
            info["last_check_date"] = today_str

        if info.get("vacationMode") or info.get("alarm_sent_today"):
            continue
        
        if current_weekday not in info.get("activeDays", []):
            continue

        try:
            s_h, s_m = map(int, info.get("startTime", "07:00").split(':'))
            e_h, e_m = map(int, info.get("endTime", "09:00").split(':'))
            start_dt = now.replace(hour=s_h, minute=s_m, second=0, microsecond=0)
            deadline_dt = now.replace(hour=e_h, minute=e_m, second=0, microsecond=0)
        except:
            continue

        if now > deadline_dt:
            last_ping_ts = info.get("last_ping", 0)
            has_valid_ping = last_ping_ts >= start_dt.timestamp()

            if not has_valid_ping:
                print(f" ! ALARM: {name} ({info.get('phone')}) niet gezien.", flush=True)
                
                contacts = info.get("contacts", [])
                msg = (f"🚨 WATCHDOG ALARM: {name} ({info.get('phone')}) heeft zich vandaag niet gemeld tussen {info['startTime']} en {info['endTime']}!\n"
                       f"Laatste accu: {info.get('last_battery')}%")
                
                success_count = 0
                for c in contacts:
                    if send_whatsapp(c.get('phone'), c.get('apiKey'), msg):
                        success_count += 1
                
                if success_count > 0:
                    info["alarm_sent_today"] = True
                    alarms_sent += 1
                    print(f"   -> Alarm verzonden naar {success_count} contacten.", flush=True)
            else:
                print(f" > {name}: Veilig.", flush=True)
        else:
            print(f" > {name}: Wacht op deadline ({info.get('endTime')}).", flush=True)

    save_db(db)
    return jsonify({"total_sent": alarms_sent})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)