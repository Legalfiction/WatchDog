pi_backend.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, time, threading
import requests

app = Flask(__name__)
CORS(app)
DB = "monitor.db"

# ---------------- CONFIGURATIE ----------------
TIMEOUT_SEC = 180   
GRACE_PERIOD = 30   

# ---------------- DATABASE INITIALISATIE ----------------
def init_db():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY, name TEXT, api_key TEXT UNIQUE)''')
    c.execute('''CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY, user_id INTEGER, device_id TEXT UNIQUE, 
        last_seen REAL, status TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY, device_id TEXT, timestamp REAL, event TEXT)''')
    # Maak een standaard gebruiker aan voor nu
    c.execute("INSERT OR IGNORE INTO users (id, name, api_key) VALUES (1, 'Admin', 'default_key')")
    conn.commit()
    conn.close()

init_db()

def log_event(device_id, event):
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("INSERT INTO logs (device_id, timestamp, event) VALUES (?, ?, ?)",
              (device_id, time.time(), event))
    conn.commit()
    conn.close()
    print(f"[{time.strftime('%H:%M:%S')}] {event} -> Device: {device_id}")

@app.route("/ping", methods=["POST"])
def ping():
    data = request.json
    api_key = data.get("api_key", "default_key")
    device_id = data.get("device_id", "unknown_device")

    conn = sqlite3.connect(DB)
    c = conn.cursor()
    c.execute("INSERT OR REPLACE INTO devices (user_id, device_id, last_seen, status) VALUES (1, ?, ?, ?)",
              (device_id, time.time(), "online"))
    conn.commit()
    conn.close()

    log_event(device_id, "✅ PING ONTVANGEN")
    return jsonify({"ok": True})

def monitor_devices():
    while True:
        conn = sqlite3.connect(DB)
        c = conn.cursor()
        c.execute("SELECT device_id, last_seen, status FROM devices")
        all_devices = c.fetchall()
        now = time.time()

        for device_id, last_seen, current_status in all_devices:
            diff = now - last_seen
            if diff > (TIMEOUT_SEC + GRACE_PERIOD) and current_status != "offline":
                log_event(device_id, "🚨 ALARM: TOESTEL VERLOREN")
                c.execute("UPDATE devices SET status='offline' WHERE device_id=?", (device_id,))
                conn.commit()
            elif diff < 10 and current_status == "offline":
                log_event(device_id, "🔄 TOESTEL HERSTELD")
                c.execute("UPDATE devices SET status='online' WHERE device_id=?", (device_id,))
                conn.commit()
        conn.close()
        time.sleep(10)

threading.Thread(target=monitor_devices, daemon=True).start()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
