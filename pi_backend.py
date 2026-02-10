
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

# Logging stil houden voor schoon dashboard, behalve echte fouten
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Vaste breedte voor de visualisatie kaders
BOX_WIDTH = 65

# --- DATABASE FUNCTIES ---
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
    """Maakt van elk nummer een strak +316... formaat"""
    if not phone: return ""
    p = str(phone).replace(' ', '').replace('-', '').strip()
    if p.startswith('00'): p = '+' + p[2:]
    elif p.startswith('06'): p = '+31' + p[1:]
    elif not p.startswith('+'): p = '+' + p
    return p

def send_whatsapp(phone, apikey, text):
    """Verstuurt WhatsApp en logt de EXACTE fout als het mislukt"""
    p = format_phone(phone)
    if not p or not apikey:
        print(f"   >>> FOUT: Ontbrekende gegevens. Tel: {p}, Key: {'JA' if apikey else 'NEE'}")
        return False
        
    params = {"phone": p, "apikey": str(apikey).strip(), "text": text}
    
    try:
        r = requests.get(CALLMEBOT_URL, params=params, timeout=20)
        if r.status_code == 200 and "error" not in r.text.lower():
            return True
        else:
            print(f"   >>> CALLMEBOT SERVER FOUT: {r.text.strip()}")
            return False
    except Exception as e:
        print(f"   >>> VERBINDINGSFOUT: {e}")
        return False

# --- Hulpfunctie voor de Layout (Visualisatie) ---
def print_row(icon, name, status, width=BOX_WIDTH):
    display_name = (name[:18] + '..') if len(name) > 18 else name
    left_part = f"{icon} {display_name}"
    right_part = f"| {status}"
    
    inner_text = f"{left_part:<24} {right_part}"
    target_len = width - 4
    if len(inner_text) > target_len: inner_text = inner_text[:target_len]
    
    print(f"║ {inner_text:<{target_len}} ║")

# --- API ENDPOINTS ---

@app.route('/status', methods=['GET'])
def get_status():
    """Simpele check of de server leeft"""
    return jsonify({"status": "online", "server_time": datetime.now().strftime("%H:%M:%S")})

@app.route('/ping', methods=['POST'])
def handle_ping():
    """
    Ontvangt hartslag van telefoon.
    """
    data = request.json
    incoming_name = data.get('user', 'Onbekend').strip()
    incoming_phone = format_phone(data.get('phone', ''))

    if not incoming_phone:
        return jsonify({"status": "error", "message": "Geen telefoonnummer meegestuurd"}), 400
    
    db = load_db()
    target_key = None

    for db_name, db_info in db.items():
        if format_phone(db_info.get('phone')) == incoming_phone:
            target_key = db_name
            break
    
    if not target_key:
        target_key = incoming_name if incoming_name else f"User_{incoming_phone[-4:]}"
        print(f"🆕 Nieuwe gebruiker geregistreerd: {target_key}")

    user_data = db.get(target_key, {})
    
    # Update alle gegevens van de ping
    user_data["last_ping"] = time.time()
    user_data["last_battery"] = data.get('battery', '?')
    user_data["phone"] = incoming_phone
    
    # Bewaar de volledige instellingen inclusief de nieuwe 'schedules' en 'useCustomSchedule'
    for key in ['startTime', 'endTime', 'vacationMode', 'activeDays', 'contacts', 'useCustomSchedule', 'schedules']:
        if key in data:
            user_data[key] = data[key]

    # Reset alarm bij succesvolle ping
    user_data["alarm_sent_today"] = False 
    
    db[target_key] = user_data
    save_db(db)
    
    return jsonify({"status": "success", "linked_to": target_key})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """Het Watchdog proces: controleert deadlines en stuurt alarmen"""
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_weekday = str(now.weekday()) # 0=Ma, 1=Di ...
    
    time_str = f"[ CONTROLE {now.strftime('%H:%M:%S')} ]"
    dash_count = (BOX_WIDTH - len(time_str) - 2) // 2
    header = f"╔{'═'*dash_count}{time_str}{'═'*dash_count}╗"
    if len(header) < BOX_WIDTH: header = header[:-1] + "═╗"
    
    print(f"\n{header}")

    if not db:
        print(f"║ {'(Geen gebruikers in database)':<{BOX_WIDTH-4}} ║")

    for name, info in db.items():
        phone_display = info.get('phone', 'Geen nummer')
        last_ping = info.get("last_ping", 0)
        
        if info.get("last_check_date") != today_str:
            info["alarm_sent_today"] = False
            info["last_check_date"] = today_str

        # 1. Vakantie check
        if info.get("vacationMode"):
            print_row("🌴", name, "Vakantiemodus")
            continue
            
        # 2. Actieve dag check
        active_days = info.get("activeDays", [0,1,2,3,4,5,6])
        if int(current_weekday) not in active_days:
            print_row("💤", name, "Vandaag geen bewaking")
            continue

        # 3. Slimme Tijdslot bepalen
        start_time_str = info.get("startTime", "07:00")
        end_time_str = info.get("endTime", "09:00")

        # Check voor dagspecifieke override
        if info.get("useCustomSchedule"):
            schedules = info.get("schedules", {})
            # Flask JSON keys worden soms strings ("0", "1"...)
            day_sched = schedules.get(current_weekday) or schedules.get(int(current_weekday))
            if day_sched:
                start_time_str = day_sched.get("startTime", start_time_str)
                end_time_str = day_sched.get("endTime", end_time_str)

        try:
            s_h, s_m = map(int, start_time_str.split(':'))
            e_h, e_m = map(int, end_time_str.split(':'))
            start_dt = now.replace(hour=s_h, minute=s_m, second=0, microsecond=0)
            deadline_dt = now.replace(hour=e_h, minute=e_m, second=0, microsecond=0)
        except:
            print_row("⚠️", name, "Foute tijdinstelling")
            continue

        has_valid_ping = last_ping >= start_dt.timestamp()

        # SITUATIE A: We zitten nog IN het tijdslot
        if now < deadline_dt:
            if has_valid_ping:
                print_row("✅", name, f"Veilig ({start_time_str}-{end_time_str})")
            else:
                time_left = int((deadline_dt - now).total_seconds() / 60)
                print_row("⏳", name, f"Wachten ({time_left} min)")
        
        # SITUATIE B: Deadline is voorbij!
        else:
            if has_valid_ping:
                print_row("✅", name, "Veilig (Was op tijd)")
            else:
                if not info.get("alarm_sent_today"):
                    print_row("🔔", name, "ALARM VERSTUREN...")
                    
                    contacts = info.get("contacts", [])
                    if not contacts:
                         print_row("❌", name, "Geen contacten!")
                         continue

                    msg = (f"🔔 *WATCHDOG MELDING* 🔔\n\n"
                           f"Gebruiker: *{name}*\n"
                           f"Nummer: {phone_display}\n\n"
                           f"Heeft zijn mobiel vandaag tussen {start_time_str} en {end_time_str} NIET gebruikt.\n\n"
                           f"Wil jij even controleren?")
                    
                    sent_count = 0
                    for c in contacts:
                        c_apikey = c.get('apiKey') or c.get('apikey')
                        c_phone = c.get('phone')
                        if send_whatsapp(c_phone, c_apikey, msg):
                            sent_count += 1
                    
                    if sent_count > 0:
                        info["alarm_sent_today"] = True
                        print_row("->", "Verzonden", f"naar {sent_count} contact(en)")
                else:
                    print_row("⚠️", name, "Reeds gemeld")

    print(f"╚{'═' * (BOX_WIDTH - 2)}╝")
    save_db(db)
    return jsonify({"status": "checked"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
