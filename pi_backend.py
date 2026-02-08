
import json
import os
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# --- CONFIGURATIE ---
app = Flask(__name__)
CORS(app) # Cruciaal om verbinding vanaf telefoons van vrienden toe te staan

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

@app.route('/ping', methods=['POST'])
def handle_ping():
    """Ontvangt de hartslag van een telefoon en registreert nieuwe vrienden automatisch."""
    data = request.json
    user_name = data.get('user') # De naam die de vriend heeft ingevuld
    
    if not user_name:
        return jsonify({"status": "error", "message": "Geen naam opgegeven"}), 400

    db = load_db()
    
    # Update of maak nieuwe gebruiker aan in de lijst van 50+
    db[user_name] = {
        "last_ping": time.time(),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '08:30'),
        "wa_phone": data.get('wa_phone'),
        "wa_key": data.get('wa_key'),
        "last_check_date": db.get(user_name, {}).get("last_check_date", "")
    }
    
    save_db(db)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Hartslag ontvangen van: {user_name}")
    return jsonify({"status": "ok", "message": "Geregistreerd op Pi"})

@app.route('/check_all', methods=['POST', 'GET'])
def run_security_check():
    """Controleert alle vrienden en stuurt het zorgzame WhatsApp bericht indien nodig."""
    db = load_db()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    today_str = now.strftime("%Y-%m-%d")
    alerts_triggered = 0

    print(f"--- Controle-ronde gestart op {now_str} ---")

    for name, info in db.items():
        alarm_time = info.get("endTime", "08:30")
        
        # Check alleen op de ingestelde eindtijd van de gebruiker
        if now_str == alarm_time and info.get("last_check_date") != today_str:
            
            start_time_str = info.get("startTime", "07:00")
            start_dt = now.replace(
                hour=int(start_time_str.split(':')[0]), 
                minute=int(start_time_str.split(':')[1]), 
                second=0, microsecond=0
            )
            
            last_ping = info.get("last_ping", 0)
            
            # Controle: is de telefoon NIET geopend tussen starttijd en nu?
            if last_ping < start_dt.timestamp():
                send_whatsapp_alert(name, info)
                alerts_triggered += 1
            
            # Zorg dat we niet vaker dan 1x per dag checken op dit tijdstip
            info["last_check_date"] = today_str

    save_db(db)
    return jsonify({"status": "complete", "alerts_sent": alerts_triggered})

def send_whatsapp_alert(name, info):
    """Verstuurt de specifieke tekst naar de opgegeven contactpersoon."""
    phone = info.get("wa_phone")
    apikey = info.get("wa_key")
    
    if not phone or not apikey:
        print(f"Systeemfout: Geen WhatsApp data voor {name}")
        return

    # JOUW SPECIFIEKE TEKST
    bericht = (
        f"Het blijkt dat {name} zijn toestel vanochtend niet heeft geopend. "
        f"Vermoedelijk is er niets aan de hand. Wellicht is het verstandig om "
        f"toch even contact met {name} op te nemen om te controleren of alles in orde is."
    )

    url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={requests.utils.quote(bericht)}&apikey={apikey}"
    
    try:
        r = requests.get(url, timeout=15)
        if r.ok:
            print(f"ALARM VERSTUURD VOOR {name} NAAR {phone}")
        else:
            print(f"CallMeBot Fout: {r.text}")
    except Exception as e:
        print(f"Netwerkfout bij versturen alarm: {e}")

if __name__ == '__main__':
    # Luister op poort 5000 voor alle inkomende pings van je vrienden
    app.run(host='0.0.0.0', port=5000, debug=False)
