
import json
import os
import time
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText

app = Flask(__name__)
CORS(app)

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "jouw-email@gmail.com"
SMTP_PASS = "jouw-app-wachtwoord"
DATA_FILE = "pings.json"

# In een productieomgeving zou je hier VAPID keys voor Web Push configureren
# Voor deze setup gebruiken we de CallMeBot API als alternatieve hartslag

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f)

@app.route('/ping', methods=['POST'])
def ping():
    data = request.json
    email = data.get('user')
    if not email: return jsonify({"status": "error"}), 400

    db = load_data()
    db[email] = {
        "last_ping": time.time(),
        "emergency_email": data.get('emergency'),
        "startTime": data.get('startTime', '07:00'),
        "endTime": data.get('endTime', '09:00'),
        "wa_phone": data.get('wa_phone'),
        "wa_key": data.get('wa_key'),
        "name": email.split('@')[0]
    }
    save_data(db)
    print(f"Ping ontvangen van {email}")
    return jsonify({"status": "ok"})

@app.route('/check_all', methods=['POST'])
def daily_check():
    db = load_data()
    now = datetime.now()
    now_str = now.strftime("%H:%M")
    alerts_sent = 0
    
    for email, info in db.items():
        end_time_str = info.get("endTime", "09:00")
        
        if now_str == end_time_str:
            start_time_str = info.get("startTime", "07:00")
            start_time_dt = now.replace(
                hour=int(start_time_str.split(':')[0]), 
                minute=int(start_time_str.split(':')[1]), 
                second=0, microsecond=0
            )
            
            last_ping_ts = info.get("last_ping", 0)
            
            if last_ping_ts < start_time_dt.timestamp():
                # ALARM!
                msg = f"SafeGuard ALARM: Geen activiteit van {info['name']} gedetecteerd vandaag."
                # Mail versturen (implementeer send_mail zoals voorheen)
                # WhatsApp versturen via CallMeBot
                alerts_sent += 1
            
    return jsonify({"checked": len(db), "alerts_sent": alerts_sent})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
