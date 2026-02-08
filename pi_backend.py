
import json
import os
import time
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

DATA_FILE = "safeguard_users.json"
VERSION = "5.1.3"

def load_db():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            try: return json.load(f)
            except: return {}
    return {}

def save_db(db):
    with open(DATA_FILE, 'w') as f:
        json.dump(db, f, indent=4)

def send_wa(name, phone, apikey, text):
    if not phone or not apikey: return False
    url = "https://api.callmebot.com/whatsapp.php"
    try:
        # We voegen een timestamp toe om caching te voorkomen
        r = requests.get(url, params={"phone": phone, "apikey": apikey, "text": text, "_": time.time()}, timeout=15)
        return r.status_code == 200
    except Exception as e:
        print(f" ❌ [WA ERROR] {name}: {e}")
        return False

@app.route('/status', methods=['GET'])
def get_status():
    user = request.args.get('user')
    db = load_db()
    user_info = db.get(user, {}) if user else {}
    last_ping_raw = user_info.get('last_ping', 0)
    last_ping_str = datetime.fromtimestamp(last_ping_raw).strftime("%H:%M:%S") if last_ping_raw else "--:--:--"

    return jsonify({
        "status": "online", 
        "server_time": datetime.now().strftime("%H:%M:%S"),
        "your_last_ping": last_ping_str,
        "is_monitored": user in db
    })

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    user_name = data.get('user', '').strip()
    if not user_name: return jsonify({"status": "error", "message": "No username"}), 400
    
    db = load_db()
    
    # Check of verbinding was verbroken (> 5 min)
    is_new_user = user_name not in db
    prev_ping = db.get(user_name, {}).get('last_ping', 0)
    was_offline = (time.time() - prev_ping) > 300 # 5 minuten

    # Update Data
    raw_days = data.get('activeDays', [0,1,2,3,4,5,6])
    if not isinstance(raw_days, list): raw_days = [0,1,2,3,4,5,6]
    clean_days = [int(d) for d in raw_days if str(d).isdigit()]

    db[user_name] = {
        "last_ping": time.time(),
        "last_battery": data.get('battery', '??'),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "contacts": data.get('contacts', []),
        "vacationMode": data.get('vacationMode', False),
        "activeDays": clean_days,
        "last_check_date": db.get(user_name, {}).get("last_check_date", ""),
        "is_online": True # Interne flag
    }
    save_db(db)
    
    time_now = datetime.now().strftime('%H:%M:%S')
    if was_offline and not is_new_user:
        print(f" 📱 [HERSTEL] {user_name}: Contact hersteld om {time_now}!")
    else:
        print(f" 🟢 [PING] {user_name}: Melding ontvangen ({time_now}) - Accu: {data.get('battery', '??')}%")
        
    return jsonify({"status": "success"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    current_day_idx = int(now.weekday()) 
    alerts_sent = 0

    print(f" 🐕 [WATCHDOG] Controleer {len(db)} gebruikers (Dag: {current_day_idx})...")

    for name, info in db.items():
        try:
            # 1. Vakantie Mode
            if info.get("vacationMode", False):
                print(f" ✈️  {name}: Vakantiemodus actief.")
                continue
                
            # 2. Rustdag Check
            active_days = info.get("activeDays", [0,1,2,3,4,5,6])
            if current_day_idx not in [int(d) for d in active_days]:
                print(f" 💤 {name}: Rustdag vandaag.")
                continue

            # 3. Deadline bepalen
            deadline_str = info.get("endTime", "08:30")
            start_str = info.get("startTime", "07:00")
            h, m = map(int, deadline_str.split(':'))
            deadline_today = now.replace(hour=h, minute=m, second=0, microsecond=0)

            # 4. Verbindings-check (Heeft de telefoon recent gepint?)
            last_ping = info.get("last_ping", 0)
            is_stale = (time.time() - last_ping) > 600 # 10 minuten geen ping = stale
            
            if is_stale:
                print(f" ⚠️  {name}: Geen actief contact met telefoon (laatste ping: {datetime.fromtimestamp(last_ping).strftime('%H:%M')})")

            # 5. Alarm Logica
            if now > deadline_today:
                # We loggen altijd de status, maar sturen maar 1x per dag een alarm
                if info.get("last_check_date") != today_str:
                    print(f" ⏰ {name}: Deadline {deadline_str} gepasseerd. Verifieer melding...")
                    
                    try:
                        sh, sm = map(int, start_str.split(':'))
                        start_of_day_ts = now.replace(hour=sh, minute=sm, second=0).timestamp()
                    except:
                        start_of_day_ts = now.replace(hour=7, minute=0, second=0).timestamp()

                    if last_ping < start_of_day_ts:
                        print(f" 🚨 [ALARM] {name}: GEEN TEKEN VAN LEVEN! WhatsApp verzenden...")
                        batt = info.get("last_battery", "??")
                        for c in info.get("contacts", []):
                            alert_msg = f"⚠️ SafeGuard ALARM: {name} heeft zich vandaag niet gemeld voor {deadline_str}! (Accu: {batt}%)"
                            if send_wa(c.get('name'), c.get('phone'), c.get('apiKey'), alert_msg):
                                print(f" ✅ Bericht verzonden naar {c.get('name')}")
                                alerts_sent += 1
                    else:
                        print(f" ✨ {name}: Melding was keurig op tijd.")
                    
                    info["last_check_date"] = today_str
                else:
                    # Log voor de gebruiker dat de check voor vandaag al is gedaan
                    print(f" ✅ {name}: Dagelijkse check voltooid. Alles was in orde.")
            else:
                print(f" ⏳ {name}: Wachten op melding (Deadline: {deadline_str})")

        except Exception as e:
            print(f" ❌ [FOUT] {name}: Er ging iets mis in de check: {e}")

    save_db(db)
    return jsonify({"alerts_sent": alerts_sent, "time": now.strftime("%H:%M:%S")})

if __name__ == '__main__':
    # Startbericht
    print(f" 🚀 SafeGuard Backend v{VERSION} gestart op poort 5000")
    app.run(host='0.0.0.0', port=5000)
