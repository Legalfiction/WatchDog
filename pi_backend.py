
import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

DATA_FILE = "safeguard_users.json"
VERSION = "5.2.0"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try: 
                data = json.load(f)
                return {k.strip(): v for k, v in data.items() if k.strip()}
            except: return {}
    return {}

def save_db(db):
    clean_db = {k.strip(): v for k, v in db.items() if k.strip()}
    with open(DATA_FILE, 'w') as f:
        json.dump(clean_db, f, indent=4)

def send_wa(user_name, contact_name, phone, apikey, text):
    if not phone or not apikey: 
        print(f" ❌ [WA STOP] {user_name} -> {contact_name}: Telefoon of API Key ontbreekt in DB!")
        return False
        
    url = "https://api.callmebot.com/whatsapp.php"
    params = {"phone": str(phone).replace(' ', ''), "apikey": str(apikey).strip(), "text": text, "_": time.time()}
    
    try:
        r = requests.get(url, params=params, timeout=15)
        if r.status_code == 200:
            return True
        else:
            print(f" ❌ [WA API FOUT] {contact_name} status {r.status_code}: {r.text[:50]}")
            return False
    except Exception as e:
        print(f" ❌ [WA NETWERK] {contact_name}: {e}")
        return False

@app.route('/status', methods=['GET'])
def get_status():
    user = request.args.get('user', '').strip()
    db = load_db()
    user_info = db.get(user, {})
    last_ping_raw = user_info.get('last_ping', 0)
    last_ping_str = datetime.fromtimestamp(last_ping_raw).strftime("%H:%M:%S") if last_ping_raw else "--:--:--"
    return jsonify({
        "status": "online", 
        "server_time": datetime.now().strftime("%H:%M:%S"), 
        "last_ping": last_ping_str,
        "version": VERSION
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', '').strip()
    if not user_name: return jsonify({"status": "error"}), 400
    
    db = load_db()
    prev_info = db.get(user_name, {})
    
    # Filter contacten: Sla alleen op wat echt ingevuld is
    raw_contacts = data.get('contacts', [])
    valid_contacts = [c for c in raw_contacts if c.get('phone') and c.get('apiKey')]
    
    db[user_name] = {
        "last_ping": time.time(),
        "last_battery": data.get('battery', '??'),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": valid_contacts,
        "vacationMode": data.get('vacationMode', False),
        "activeDays": data.get('activeDays', [0,1,2,3,4,5,6]),
        "last_check_date": prev_info.get("last_check_date", ""),
        "alarm_sent_today": prev_info.get("alarm_sent_today", False) if prev_info.get("last_check_date") == datetime.now().strftime("%Y-%m-%d") else False
    }
    save_db(db)
    print(f" 🟢 [SYNC] {user_name}: Passieve check-in voltooid. Accu: {data.get('battery')}%")
    return jsonify({"status": "success"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_day_idx = int(now.weekday()) 
    alerts_sent = 0

    print(f"\n--- [CONTROLE {now.strftime('%H:%M:%S')}] ---")

    for name, info in db.items():
        try:
            if info.get("last_check_date") != today_str:
                info["alarm_sent_today"] = False

            if info.get("vacationMode", False) or current_day_idx not in info.get("activeDays", []):
                continue

            start_str = info.get("startTime", "07:00")
            end_str = info.get("endTime", "08:30")
            start_dt = now.replace(hour=int(start_str.split(':')[0]), minute=int(start_str.split(':')[1]), second=0, microsecond=0)
            deadline_dt = now.replace(hour=int(end_str.split(':')[0]), minute=int(end_str.split(':')[1]), second=0, microsecond=0)
            
            last_ts = info.get("last_ping", 0)
            has_valid_checkin = last_ts >= start_dt.timestamp()

            if now > deadline_dt and not has_valid_checkin:
                if not info.get("alarm_sent_today", False):
                    print(f" 🚨 ALARM voor {name}!")
                    contacts = info.get("contacts", [])
                    
                    for c in contacts:
                        c_name = c.get('name') or 'Noodcontact'
                        c_phone = c.get('phone')
                        c_key = c.get('apiKey')
                        
                        msg = f"🚨 Watchdog ALARM: {name} is vandaag NIET actief geweest tussen {start_str} en {end_str}! (Laatste accu: {info.get('last_battery')}%)"
                        
                        if send_wa(name, c_name, c_phone, c_key, msg):
                            print(f"    ✅ WhatsApp succesvol verzonden naar {c_name}")
                            alerts_sent += 1
                    
                    info["alarm_sent_today"] = True
                    info["last_check_date"] = today_str
                else:
                    print(f" 👤 [{name}] Status: Alarm reeds verzonden.")
            else:
                status = "VEILIG" if has_valid_checkin else "WACHTEN"
                print(f" 👤 [{name}] Status: {status} (Deadline: {end_str})")

        except Exception as e:
            print(f" ❌ [{name}] Fout: {e}")

    save_db(db)
    return jsonify({"alerts_sent": alerts_sent})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
