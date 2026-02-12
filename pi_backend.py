
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
TEXTMEBOT_APIKEY = "ojtHErzSmwgW" 

# Logging stil houden
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

def load_db():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_db(db):
    try:
        with open(DATA_FILE, 'w') as f:
            json.dump(db, f, indent=4)
    except:
        pass

def format_phone(phone):
    """
    Normaliseert telefoonnummers streng naar het +316... formaat
    """
    if not phone: return ""
    p = str(phone).replace(' ', '').replace('-', '').strip()
    
    # 0031 -> +31
    if p.startswith('0031'): p = '+' + p[2:]
    
    # Als het al met + begint, aannemen dat het goed is
    if p.startswith('+'): return p
    
    # 06 -> +316
    if p.startswith('06') and len(p) == 10: return '+316' + p[2:]
    
    # 316 -> +316
    if p.startswith('316') and len(p) == 11: return '+' + p
    
    return p

def send_whatsapp(phone, text):
    p = format_phone(phone)
    if not p: return False
    params = {"recipient": p, "apikey": TEXTMEBOT_APIKEY, "text": text}
    try:
        r = requests.get(TEXTMEBOT_URL, params=params, timeout=10)
        return r.status_code == 200
    except Exception as e:
        print(f"WhatsApp Fout: {e}")
        return False

@app.route('/status', methods=['GET'])
def get_status():
    return jsonify({"status": "online", "version": "11.3.0"})

@app.route('/test_contact', methods=['POST'])
def test_contact():
    data = request.json
    phone = format_phone(data.get('phone'))
    name = data.get('name', 'Contact')
    if not phone: return jsonify({"status": "error"}), 400
    msg = f"🔔 *BARKR TESTBERICHT*\n\nDit is een test voor *{name}*. Uw Barkr waakhond is correct gekoppeld op dit nummer: {phone}"
    if send_whatsapp(phone, msg):
        return jsonify({"status": "success"})
    return jsonify({"status": "error"}), 500

@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.json
    phone = format_phone(data.get('myPhone', ''))
    if not phone: return jsonify({"status": "error"}), 400
    db = load_db()
    data['myPhone'] = phone
    db[phone] = data
    save_db(db)
    return jsonify({"status": "success"})

@app.route('/ping', methods=['POST'])
def handle_ping():
    data = request.json
    phone = format_phone(data.get('phone', ''))
    if not phone: return jsonify({"status": "error"}), 400
    db = load_db()
    if phone not in db: db[phone] = {}
    db[phone]["last_ping"] = time.time()
    db[phone]["last_battery"] = data.get('battery', '?')
    db[phone]["alarm_sent_today"] = False 
    save_db(db)
    return jsonify({"status": "success"})

@app.route('/get_settings', methods=['GET'])
def get_settings():
    phone = format_phone(request.args.get('phone'))
    db = load_db()
    if phone and phone in db: return jsonify(db[phone])
    return jsonify({}), 404

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    db = load_db()
    now = datetime.now()
    current_weekday = now.weekday()
    
    for phone, info in db.items():
        if info.get("vacationMode") or current_weekday not in info.get("activeDays", [0,1,2,3,4,5,6]):
            continue
        
        et = info.get("endTime", "08:30")
        if info.get("useCustomSchedule"):
            sched = info.get("schedules", {}).get(str(current_weekday))
            if sched: et = sched.get("endTime", et)

        try:
            eh, em = map(int, et.split(':'))
            deadline_ts = now.replace(hour=eh, minute=em, second=0).timestamp()
            
            if now.timestamp() > deadline_ts:
                last_ping = info.get("last_ping", 0)
                if last_ping < deadline_ts and not info.get("alarm_sent_today"):
                    name = info.get('email', 'Gebruiker')
                    msg = f"🚨 *BARKR NOODGEVAL* 🚨\n\nGebruiker: *{name}*\nGeen levensteken gedetecteerd voor de deadline van {et}.\n\nNeem direct contact op met de gebruiker op {phone}."
                    
                    success = False
                    for c in info.get("contacts", []):
                        if send_whatsapp(c.get('phone'), msg):
                            success = True
                    
                    if success:
                        info["alarm_sent_today"] = True
        except Exception as e:
            pass
    
    save_db(db)
    return jsonify({"status": "ok", "processed_at": now.isoformat()})

if __name__ == '__main__':
    print("Barkr Backend v11.3.0 gestart...")
    app.run(host='0.0.0.0', port=5000)
