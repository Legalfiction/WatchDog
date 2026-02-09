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

# We zetten logging op ERROR zodat de Flask 'ruis' wegvalt, 
# we gebruiken onze eigen print statements voor het overzicht.
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

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
    except IOError:
        pass

def format_phone(phone):
    """Zet nummer om naar internationaal formaat."""
    if not phone: return ""
    p = str(phone).replace(' ', '').replace('-', '').strip()
    if p.startswith('00'): p = '+' + p[2:]
    elif p.startswith('06'): p = '+31' + p[1:]
    elif not p.startswith('+'): p = '+' + p
    return p

def send_whatsapp(phone, apikey, text):
    """Stuurt WhatsApp bericht."""
    p = format_phone(phone)
    if not p or not apikey: return False

    params = {"phone": p, "apikey": str(apikey).strip(), "text": text}
    try:
        r = requests.get(CALLMEBOT_URL, params=params, timeout=20)
        if r.status_code == 200 and "error" not in r.text.lower():
            return True
        return False
    except:
        return False

# --- API ENDPOINTS ---

@app.route('/status', methods=['GET'])
def get_status():
    user = request.args.get('user', '').strip()
    db = load_db()
    user_info = db.get(user, {})
    last_ping = user_info.get('last_ping', 0)
    ping_str = datetime.fromtimestamp(last_ping).strftime("%H:%M:%S") if last_ping else "--:--:--"
    return jsonify({"status": "online", "last_ping": ping_str, "battery": user_info.get('last_battery', '??')})

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', '').strip()
    if not user_name: return jsonify({"status": "error"}), 400
    
    db = load_db()
    user_data = db.get(user_name, {})
    
    # Data updaten
    user_data["last_ping"] = time.time()
    user_data["last_battery"] = data.get('battery', '?')
    user_data["phone"] = format_phone(data.get('phone', '')) 
    user_data["startTime"] = data.get('startTime', '07:00')
    user_data["endTime"] = data.get('endTime', '09:00')
    user_data["contacts"] = data.get('contacts', [])
    user_data["vacationMode"] = data.get('vacationMode', False)
    user_data["activeDays"] = data.get('activeDays', [0,1,2,3,4,5,6])
    
    # Als de gebruiker zich meldt, resetten we NIET direct het alarm van vandaag,
    # dat gebeurt pas de volgende dag OF als we check_all draaien en zien dat hij er weer is.
    
    db[user_name] = user_data
    save_db(db)
    
    print(f"📥 PING ONTVANGEN: {user_name} (Accu: {user_data['last_battery']}%)")
    return jsonify({"status": "success"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_weekday = now.weekday()
    
    print(f"\n╔════════════ [ CONTROLE {now.strftime('%H:%M:%S')} ] ════════════╗")

    if not db:
        print("║  (Geen gebruikers in database)                    ║")

    for name, info in db.items():
        # Variabelen ophalen
        phone_display = info.get('phone', 'No Phone')
        last_ping = info.get("last_ping", 0)
        battery = info.get("last_battery", "?")
        
        # 1. Reset dagstatus indien nodig
        if info.get("last_check_date") != today_str:
            info["alarm_sent_today"] = False
            info["last_check_date"] = today_str

        # 2. Status Bepalen
        is_vacation = info.get("vacationMode")
        is_active_day = current_weekday in info.get("activeDays", [])
        
        # Tijd conversie
        try:
            s_h, s_m = map(int, info.get("startTime", "07:00").split(':'))
            e_h, e_m = map(int, info.get("endTime", "09:00").split(':'))
            start_dt = now.replace(hour=s_h, minute=s_m, second=0, microsecond=0)
            deadline_dt = now.replace(hour=e_h, minute=e_m, second=0, microsecond=0)
        except:
            print(f"║ ⚠️  Foute tijdinstelling voor {name:<23} ║")
            continue

        # LOGICA
        if is_vacation:
            print(f"║ 🌴 {name:<20} | Vakantiemodus          ║")
            continue
            
        if not is_active_day:
            print(f"║ 💤 {name:<20} | Vandaag geen bewaking  ║")
            continue

        # Check: Heeft gebruiker zich gemeld NA de starttijd van vandaag?
        has_valid_ping = last_ping >= start_dt.timestamp()

        # Situatie 1: We zitten NOG in het tijdslot
        if now < deadline_dt:
            if has_valid_ping:
                print(f"║ ✅ {name:<20} | Aangemeld (Veilig)     ║")
            else:
                time_left = int((deadline_dt - now).total_seconds() / 60)
                print(f"║ ⏳ {name:<20} | Wachten... ({time_left} min)    ║")
        
        # Situatie 2: Deadline is VERSTREKEN
        else:
            if has_valid_ping:
                print(f"║ ✅ {name:<20} | Veilig (Was op tijd)   ║")
            else:
                # OEI: Niet gemeld en deadline voorbij!
                if not info.get("alarm_sent_today"):
                    # --- ALARM SLAAN ---
                    print(f"║ 🚨 {name:<20} | ALARM TRIGGERED!       ║")
                    
                    contacts = info.get("contacts", [])
                    msg = (f"🚨 *WATCHDOG ALARM* 🚨\n\n"
                           f"Gebruiker: *{name}*\n"
                           f"Nummer: {phone_display}\n\n"
                           f"Heeft zich vandaag NIET gemeld tussen {info['startTime']} en {info['endTime']}!\n"
                           f"Laatst bekende accu: {battery}%\n"
                           f"Neem contact op!")
                    
                    sent_count = 0
                    for c in contacts:
                        if send_whatsapp(c.get('phone'), c.get('apiKey'), msg):
                            sent_count += 1
                            print(f"║    -> Bericht naar {c.get('name', 'Vriend')} verstuurd.   ║")
                    
                    if sent_count > 0:
                        info["alarm_sent_today"] = True
                    else:
                        print(f"║ ❌ {name:<20} | WhatsApp Fout!         ║")
                
                else:
                    # Alarm is al verstuurd, maar hij is er nog steeds niet
                    print(f"║ ⚠️  {name:<20} | NOG STEEDS NIET GEMELD ║")

    print("╚═══════════════════════════════════════════════════╝")
    save_db(db)
    return jsonify({"status": "checked"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)