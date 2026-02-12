
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
TEXTMEBOT_URL = "http://api.textmebot.com/send.php"

# LET OP: Vul hieronder je eigen API-key in die je hebt gekregen via @TextMeBot.
# De onderstaande waarde dient als placeholder.
TEXTMEBOT_APIKEY = "ojtHErzSmwgW" 

# Logging stil houden voor een schoon dashboard
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

# Vaste breedte voor de visualisatie kaders in de terminal
BOX_WIDTH = 65

# --- HELPER FUNCTIES ---

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
    """Zorgt voor een consistent +316... formaat voor TextMeBot."""
    if not phone: return ""
    p = str(phone).replace(' ', '').replace('-', '').replace('(', '').replace(')', '').strip()
    if p.startswith('00'): p = '+' + p[2:]
    elif p.startswith('06'): p = '+31' + p[1:]
    elif p.startswith('0'): p = '+31' + p[1:]
    elif not p.startswith('+'): p = '+' + p
    return p

def find_user_key_by_phone(db, phone):
    """Zoekt een bestaande entry op basis van telefoonnummer (myPhone)."""
    target = format_phone(phone)
    if not target: return None
    for key, info in db.items():
        if format_phone(info.get('myPhone')) == target or format_phone(info.get('phone')) == target:
            return key
    return None

def send_whatsapp(phone, text):
    """
    Verstuurt WhatsApp via TextMeBot. 
    Het '+' teken wordt automatisch URL-encoded door de params dict in requests.
    """
    p = format_phone(phone)
    if not p: return False
        
    params = {
        "recipient": p,
        "apikey": TEXTMEBOT_APIKEY,
        "text": text
    }
    
    try:
        r = requests.get(TEXTMEBOT_URL, params=params, timeout=15)
        return r.status_code == 200
    except Exception as e:
        print(f"   >>> FOUT BIJ VERZENDEN: {e}")
        return False

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
    return jsonify({"status": "online", "version": "10.4.0"})

@app.route('/save_settings', methods=['POST'])
def save_settings():
    """Slaat instellingen op en gebruikt telefoonnummer als unieke ID."""
    data = request.json
    phone = format_phone(data.get('myPhone', ''))
    name = data.get('email', 'Onbekend').strip()
    
    if not phone:
        return jsonify({"status": "error", "message": "Telefoonnummer verplicht"}), 400
        
    db = load_db()
    user_key = find_user_key_by_phone(db, phone)
    
    if not user_key:
        user_key = name if name and name not in db else f"User_{phone[-4:]}"
        db[user_key] = {}
        print(f"🆕 Nieuwe registratie: {user_key} ({phone})")

    keys_to_sync = ['email', 'myPhone', 'startTime', 'endTime', 'contacts', 'vacationMode', 'activeDays', 'useCustomSchedule', 'schedules']
    for k in keys_to_sync:
        if k in data:
            db[user_key][k] = data[k]
    
    db[user_key]['myPhone'] = phone
    db[user_key]['phone'] = phone 
    save_db(db)
    return jsonify({"status": "success", "message": "Instellingen bijgewerkt"})

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    phone = format_phone(data.get('phone', ''))
    if not phone: return jsonify({"status": "error"}), 400
    
    db = load_db()
    user_key = find_user_key_by_phone(db, phone)
    
    if not user_key:
        user_key = data.get('user', f"User_{phone[-4:]}").strip()
        db[user_key] = {"myPhone": phone}

    db[user_key]["last_ping"] = time.time()
    db[user_key]["last_battery"] = data.get('battery', '?')
    db[user_key]["alarm_sent_today"] = False 
    
    # Sync settings als ze meegestuurd worden
    for k in ['startTime', 'endTime', 'vacationMode', 'activeDays', 'contacts', 'useCustomSchedule', 'schedules']:
        if k in data: db[user_key][k] = data[k]

    save_db(db)
    return jsonify({"status": "success"})

@app.route('/get_settings', methods=['GET'])
def get_settings():
    phone = request.args.get('phone')
    db = load_db()
    if phone:
        key = find_user_key_by_phone(db, phone)
        if key: return jsonify(db[key])
    if db:
        latest = max(db.values(), key=lambda x: x.get('last_ping', 0))
        return jsonify(latest)
    return jsonify({}), 404

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_weekday = now.weekday()
    
    print(f"\n╔{'═'*15} [ MONITOR {now.strftime('%H:%M:%S')} ] {'═'*15}╗")
    if not db: print(f"║ {'(Leeg)':<{BOX_WIDTH-4}} ║")

    for name, info in db.items():
        if info.get("last_check_date") != today_str:
            info["alarm_sent_today"] = False
            info["last_check_date"] = today_str

        if info.get("vacationMode"):
            print_row("🌴", name, "Vakantie")
            continue
            
        if current_weekday not in info.get("activeDays", [0,1,2,3,4,5,6]):
            print_row("💤", name, "Uitgeschakeld")
            continue

        st, et = info.get("startTime", "07:00"), info.get("endTime", "08:30")
        if info.get("useCustomSchedule"):
            sched = info.get("schedules", {}).get(str(current_weekday))
            if sched: st, et = sched.get("startTime", st), sched.get("endTime", et)

        try:
            sh, sm = map(int, st.split(':'))
            eh, em = map(int, et.split(':'))
            start_ts = now.replace(hour=sh, minute=sm, second=0).timestamp()
            deadline_ts = now.replace(hour=eh, minute=em, second=0).timestamp()
        except: continue

        safe = info.get("last_ping", 0) >= start_ts

        if now.timestamp() < deadline_ts:
            print_row("✅" if safe else "⏳", name, "Veilig" if safe else "Wachten")
        else:
            if safe:
                print_row("✅", name, "Veilig")
            elif not info.get("alarm_sent_today"):
                print_row("🚨", name, "ALARM!")
                msg = f"🚨 *BARKR NOODGEVAL* 🚨\n\nGebruiker: *{name}*\nStatus: Geen activiteit voor {et}."
                sent = 0
                for c in info.get("contacts", []):
                    if send_whatsapp(c.get('phone'), msg): sent += 1
                if sent > 0: info["alarm_sent_today"] = True
            else:
                print_row("⚠️", name, "Gemeld")

    print(f"╚{'═' * (BOX_WIDTH - 2)}╝")
    save_db(db)
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
