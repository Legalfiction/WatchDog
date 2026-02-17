import os
import json
import requests
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import time
import threading

file_lock = threading.Lock()
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.expanduser("~/barkr/settings.json")
API_KEY = "ojtHErzSmwgW"

def load_settings():
    with file_lock:
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, "r") as f:
                    return json.load(f)
            except:
                pass
    return {"name": "Aldo gebruiker", "contacts": [], "activeDays": [0,1,2,3,4,5,6], "startTime": "07:00", "endTime": "08:30"}

def log_status(msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}", flush=True)

def send_whatsapp_to_all(settings):
    user_name = settings.get('name', 'Gebruiker')
    contacts = settings.get('contacts', [])
    start = settings.get('startTime', '07:00')
    end = settings.get('endTime', '08:30')
    day_idx = datetime.now().weekday()
    if settings.get('useCustomSchedule') and str(day_idx) in settings.get('schedules', {}):
        start = settings['schedules'][str(day_idx)].get('startTime', start)
        end = settings['schedules'][str(day_idx)].get('endTime', end)

    message = (
        f"*BARKR ALARM*\n\n"
        f"Gebruiker: {user_name}\n"
        f"Status: {start}-{end} geen activiteit gemeten.\n\n"
        f"De ingestelde eindtijd is verstreken en er is vandaag geen gebruik van de telefoon geregistreerd."
    )
    
    log_status(f"📢 ALARM TRIGGER voor {user_name}: Start verzending naar {len(contacts)} contacten.")
    for c in contacts:
        phone = c.get('phone', '').replace('+', '').replace(' ', '')
        if phone:
            time.sleep(6) 
            url = f"https://api.textmebot.com/send.php?recipient={phone}&apikey={API_KEY}&text={requests.utils.quote(message)}"
            try:
                res = requests.get(url, timeout=15)
                log_status(f"   ✅ VERZONDEN naar {c.get('name')} (Code: {res.status_code})")
            except Exception as e:
                log_status(f"   ❌ FOUT naar {phone}: {e}")

def monitoring_loop():
    log_status("🚀 BARKR PRODUCTIE MODUS ACTIEF.")
    while True:
        try:
            settings = load_settings()
            if settings.get('vacationMode'):
                time.sleep(60)
                continue

            now = datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            day_idx = now.weekday()

            if day_idx in settings.get('activeDays', []):
                start_str = settings.get('startTime', '07:00')
                end_str = settings.get('endTime', '08:30')
                if settings.get('useCustomSchedule') and str(day_idx) in settings.get('schedules', {}):
                    start_str = settings['schedules'][str(day_idx)].get('startTime', start_str)
                    end_str = settings['schedules'][str(day_idx)].get('endTime', end_str)

                start_dt = datetime.combine(now.date(), datetime.strptime(start_str, "%H:%M").time())
                end_dt = datetime.combine(now.date(), datetime.strptime(end_str, "%H:%M").time())

                last_ping_dt = None
                if settings.get('last_ping_time'):
                    last_ping_dt = datetime.strptime(settings['last_ping_time'], "%Y-%m-%d %H:%M:%S")

                is_nu_online = last_ping_dt and (now - last_ping_dt).total_seconds() < 300
                log_status(f"🔍 MONITOR {settings.get('name')} | Window: {start_str}-{end_str} | Status: {'🟢 AAN' if is_nu_online else '🔴 UIT'}")

                if now > end_dt:
                    if settings.get('last_processed_date', "") != today_str:
                        log_status(f"🏁 Deadline bereikt ({end_str}). Evaluatie start...")
                        is_actief_in_window = last_ping_dt and last_ping_dt >= start_dt
                        if not is_actief_in_window:
                            send_whatsapp_to_all(settings)
                        
                        settings['last_processed_date'] = today_str
                        with file_lock:
                            with open(DATA_FILE, "w") as f:
                                json.dump(settings, f)
        except Exception as e:
            log_status(f"⚠️ LOOP FOUT: {e}")
        time.sleep(60)

@app.route('/ping', methods=['POST'])
def ping():
    settings = load_settings()
    settings['last_ping_time'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_status(f"📡 PING: {settings.get('name')} staat AAN")
    with file_lock:
        with open(DATA_FILE, "w") as f:
            json.dump(settings, f)
    return jsonify({"status": "received"})

@app.route('/save_settings', methods=['POST'])
def save():
    data = request.json
    # BEVEILIGING: Als de naam leeg is, negeren we de save om overschrijven te voorkomen
    if not data.get('name') or not data.get('myPhone'):
        log_status("⚠️ BLOKKADE: Lege instellingen genegeerd om dataverlies te voorkomen.")
        return jsonify({"status": "ignored"}), 200

    data['last_processed_date'] = "" 
    current = load_settings()
    data['last_ping_time'] = current.get('last_ping_time', "")
    log_status(f"💾 OPSLAAN: Instellingen voor {data.get('name')}. Status gereset.")
    with file_lock:
        with open(DATA_FILE, "w") as f:
            json.dump(data, f)
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    threading.Thread(target=monitoring_loop, daemon=True).start()
    app.run(host='0.0.0.0', port=5000)
