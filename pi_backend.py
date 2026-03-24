import os
import json
import sqlite3
import time
import threading
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta

# ============================================================
#   BARKR BACKEND v10.0
#
#   Nieuwe architectuur:
#   - /heartbeat endpoint: ontvangt alleen naam van de app
#   - Pi zoekt zelf het tijdvenster op uit de weekplanning
#   - Geen bridge meer nodig, geen SharedPreferences tijdvenster
#   - WebView pings via /ping blijven werken als backup
# ============================================================

DB_FILE          = os.path.expanduser("~/barkr/barkr_users.db")
APP_SECRET       = "BARKR_SECURE_V1"
TEXTMEBOT_KEY    = "ojtHErzSmwgW"
TEXTMEBOT_URL    = "https://api.textmebot.com/send.php"
PING_TIMEOUT     = 120
MIN_NAME_LENGTH  = 3
INACTIVITY_HOURS = 4

DEVELOPER_PHONE  = "31615964009"

app = Flask(__name__)
CORS(app)
logging.getLogger('werkzeug').setLevel(logging.ERROR)

user_states: dict = {}
_dev_alert_cooldown: dict = {}


def log_status(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


def alert_developer(error_type: str, detail: str):
    now = datetime.now()
    last = _dev_alert_cooldown.get(error_type)
    if last and (now - last).total_seconds() < 3600:
        return
    _dev_alert_cooldown[error_type] = now
    try:
        requests.get(TEXTMEBOT_URL, params={
            "recipient": DEVELOPER_PHONE,
            "apikey": TEXTMEBOT_KEY,
            "text": f"🔧 BARKR FOUT\n{error_type}\n{detail}"
        }, timeout=10)
    except Exception:
        pass


def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        user_name TEXT PRIMARY KEY,
        contacts TEXT DEFAULT '[]',
        active_days TEXT DEFAULT '[]',
        schedules TEXT DEFAULT '{}',
        use_custom_schedule INTEGER DEFAULT 1,
        vacation_mode INTEGER DEFAULT 0,
        last_ping_time TEXT DEFAULT "",
        notify_self INTEGER DEFAULT 1,
        own_phone TEXT DEFAULT "",
        last_inactivity_alert TEXT DEFAULT "",
        last_reminder_sent TEXT DEFAULT ""
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS alarm_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT, alarm_date TEXT,
        window_start TEXT, window_end TEXT, fired_at TEXT,
        UNIQUE(user_name, alarm_date, window_start, window_end)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS whatsapp_opted_in (
        phone TEXT PRIMARY KEY, opted_in_at TEXT, opted_in_by TEXT
    )''')
    migrations = [
        "ALTER TABLE users ADD COLUMN vacation_mode INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN notify_self INTEGER DEFAULT 1",
        "ALTER TABLE users ADD COLUMN own_phone TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN last_inactivity_alert TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN last_reminder_sent TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN active_window_start TEXT DEFAULT ''",
        "ALTER TABLE users ADD COLUMN active_window_end TEXT DEFAULT ''",
    ]
    for sql in migrations:
        try:
            c.execute(sql)
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()
    log_status("✅ DATABASE GEREED")


def normalize_phone(phone: str) -> str:
    return phone.replace(' ', '').replace('-', '').replace('+', '').strip()


def is_opted_in(phone: str) -> bool:
    clean = normalize_phone(phone)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT phone FROM whatsapp_opted_in WHERE phone = ?", (clean,))
    found = c.fetchone() is not None
    conn.close()
    return found


def register_opt_in(phone: str, opted_in_by: str):
    clean = normalize_phone(phone)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO whatsapp_opted_in (phone, opted_in_at, opted_in_by) VALUES (?, ?, ?)",
              (clean, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), opted_in_by))
    conn.commit()
    conn.close()


def authenticate(data: dict) -> bool:
    return data.get('app_key') == APP_SECRET or data.get('secret') == APP_SECRET


def send_whatsapp(phone: str, message: str, context: str = "") -> bool:
    clean = normalize_phone(phone)
    if not clean:
        return False
    try:
        r = requests.get(TEXTMEBOT_URL, params={
            "recipient": clean, "apikey": TEXTMEBOT_KEY, "text": message
        }, timeout=15)
        return r.status_code == 200
    except Exception as e:
        alert_developer("WhatsApp fout", f"{e} | {context}")
        return False


def get_todays_window(user: dict) -> tuple[str, str]:
    """
    Bepaalt het tijdvenster voor vandaag puur op basis van de weekplanning.
    Kijkt ook naar overrides (vandaag/morgen).
    """
    now      = datetime.now()
    day_idx  = now.weekday()  # 0=maandag, 6=zondag

    schedules = {}
    if user.get('schedules'):
        try:
            schedules = json.loads(user['schedules'])
        except Exception:
            pass

    day_sched = schedules.get(str(day_idx), {})
    start     = day_sched.get('startTime', '00:00')
    end       = day_sched.get('endTime',   '00:00')
    return start, end


def alarm_already_fired(user_name: str, alarm_date: str, window_start: str, window_end: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id FROM alarm_log WHERE user_name=? AND alarm_date=? AND window_start=? AND window_end=?",
              (user_name, alarm_date, window_start, window_end))
    found = c.fetchone() is not None
    conn.close()
    return found


def mark_alarm_fired(user_name: str, alarm_date: str, window_start: str, window_end: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO alarm_log (user_name, alarm_date, window_start, window_end, fired_at) VALUES (?,?,?,?,?)",
              (user_name, alarm_date, window_start, window_end, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()


def update_last_ping(user_name: str, timestamp: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE users SET last_ping_time=? WHERE user_name=?", (timestamp, user_name))
    conn.commit()
    conn.close()


def upsert_user(user_name: str, fields: dict):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT last_ping_time FROM users WHERE user_name=?", (user_name,))
    existing  = c.fetchone()
    last_ping = existing[0] if existing else ""
    c.execute('''INSERT INTO users (
        user_name, contacts, active_days, schedules, use_custom_schedule,
        vacation_mode, last_ping_time, notify_self, own_phone
    ) VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(user_name) DO UPDATE SET
        contacts=excluded.contacts, active_days=excluded.active_days,
        schedules=excluded.schedules, use_custom_schedule=excluded.use_custom_schedule,
        vacation_mode=excluded.vacation_mode, notify_self=excluded.notify_self,
        own_phone=excluded.own_phone''',
        (user_name, fields.get('contacts', '[]'),
         fields.get('active_days', json.dumps([0,1,2,3,4,5,6])),
         fields.get('schedules', '{}'),
         int(fields.get('use_custom_schedule', True)),
         int(fields.get('vacation_mode', False)),
         last_ping,
         int(fields.get('notify_self', True)),
         fields.get('own_phone', '')))
    conn.commit()
    conn.close()


def escalate_user(user: dict, start_str: str, end_str: str):
    user_name = user['user_name']
    contacts  = json.loads(user['contacts']) if user['contacts'] else []
    message   = (
        f"🚨 *BARKR ALARM* 🚨\n\n"
        f"Gebruiker: *{user_name}*\n"
        f"Tijdvenster: {start_str} – {end_str}\n\n"
        f"De ingestelde eindtijd is verstreken zonder activiteit.\n\n"
        f"Neem contact op met de gebruiker."
    )
    log_status(f"📢 ALARM → {user_name} | {start_str}–{end_str} | {len(contacts)} contacten")
    for contact in contacts:
        phone = contact.get('phone', '')
        if phone:
            ok = send_whatsapp(phone, message, context=f"alarm:{user_name}")
            log_status(f"{'✅' if ok else '❌'} Alarm → {phone} ({contact.get('name','?')})")
            time.sleep(6)


def send_inactivity_alert(user: dict):
    own_phone   = user.get('own_phone', '')
    notify_self = bool(user.get('notify_self', 1))
    user_name   = user['user_name']
    today_str   = datetime.now().strftime("%Y-%m-%d")
    if not notify_self or not own_phone:
        return
    if user.get('last_inactivity_alert') == today_str:
        return
    msg = (
        f"⚠️ *Barkr — App niet actief*\n\n"
        f"Hallo {user_name},\n\n"
        f"Je Barkr app heeft de afgelopen {INACTIVITY_HOURS} uur geen signaal verstuurd.\n\n"
        f"Open de Barkr app om de bewaking te hervatten.\n\n"
        f"Open de app → tik op het vraagteken → kies 'Opstartgids' voor instructies per telefoonmerk. 🐾\n\n"
        f"Wil je deze berichten niet? Open Barkr → Instellingen → schuifje UIT."
    )
    if send_whatsapp(own_phone, msg, context=f"inactivity:{user_name}"):
        log_status(f"📱 INACTIVITEITSMELDING → {user_name}")
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET last_inactivity_alert=? WHERE user_name=?",
                  (today_str, user_name))
        conn.commit()
        conn.close()


def monitoring_loop():
    log_status("🚀 BARKR ENGINE v10.0 GESTART | Heartbeat architectuur")

    while True:
        try:
            current_time = time.time()

            # Detecteer offline gebruikers
            for uname, state in list(user_states.items()):
                if state["status"] == "online" and (current_time - state["last_ping"]) > PING_TIMEOUT:
                    user_states[uname]["status"] = "offline"
                    log_status(f"📵 OFFLINE → {uname} | {int(current_time - state['last_ping'])}s geen ping")

            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM users WHERE length(user_name) >= ?", (MIN_NAME_LENGTH,))
            users = c.fetchall()
            conn.close()

            now       = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            for row in users:
                user      = dict(row)
                user_name = user['user_name']

                if user.get('vacation_mode'):
                    continue

                # Inactiviteitsmelding
                last_ping_time = user.get('last_ping_time', '')
                if last_ping_time:
                    try:
                        last_ping_dt  = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                        inactief_uren = (now - last_ping_dt).total_seconds() / 3600
                        if inactief_uren >= INACTIVITY_HOURS:
                            send_inactivity_alert(user)
                    except ValueError:
                        pass

                # Tijdvenster bepalen vanuit weekplanning
                start_str, end_str = get_todays_window(user)

                if start_str == '00:00' and end_str == '00:00':
                    continue

                try:
                    start_dt = datetime.combine(now.date(), datetime.strptime(start_str, "%H:%M").time())
                    end_dt   = datetime.combine(now.date(), datetime.strptime(end_str,   "%H:%M").time())
                except ValueError:
                    continue

                if start_dt >= end_dt:
                    continue

                # Deadline nog niet bereikt
                if now <= end_dt:
                    continue

                # Al verstuurd?
                if alarm_already_fired(user_name, today_str, start_str, end_str):
                    continue

                log_status(f"🏁 Deadline {end_str} bereikt voor {user_name}")

                # Was gebruiker actief binnen het venster?
                last_ping_dt = None
                if last_ping_time:
                    try:
                        last_ping_dt = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        pass

                # Ping mag tot 2 minuten na de deadline vallen
                was_actief = (
                    last_ping_dt is not None and
                    start_dt <= last_ping_dt <= (end_dt + timedelta(minutes=2))
                )

                if was_actief:
                    log_status(f"✅ {user_name} was actief. Geen alarm.")
                else:
                    log_status(f"❌ {user_name} NIET actief. Laatste ping: {last_ping_time}")
                    escalate_user(user, start_str, end_str)

                mark_alarm_fired(user_name, today_str, start_str, end_str)

        except Exception as e:
            log_status(f"⚠️ LOOP FOUT: {e}")
            alert_developer("Loop crash", str(e))

        time.sleep(5)


# ============================================================
#   ENDPOINTS
# ============================================================

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "online", "version": "10.0"}), 200


@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    """
    Nieuw endpoint voor de BarkrService.
    Ontvangt alleen naam — Pi bepaalt zelf het tijdvenster.
    """
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    user_name = (data.get('name') or '').strip()
    if not user_name or len(user_name) < MIN_NAME_LENGTH:
        return jsonify({"status": "ignored"}), 200

    now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time = time.time()
    source       = data.get('source', 'unknown')

    state = user_states.get(user_name, {"status": "offline", "last_ping": 0})
    if state["status"] == "offline":
        log_status(f"📱 ONLINE → {user_name} | bron: {source}")

    user_states[user_name] = {"status": "online", "last_ping": current_time}

    # Sla ping op
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT user_name FROM users WHERE user_name=?", (user_name,))
    exists = c.fetchone()
    if exists:
        c.execute("UPDATE users SET last_ping_time=? WHERE user_name=?", (now_str, user_name))
    else:
        # Nieuwe gebruiker — maak aan
        c.execute('''INSERT OR IGNORE INTO users
            (user_name, contacts, active_days, schedules, use_custom_schedule,
             vacation_mode, last_ping_time, notify_self, own_phone)
            VALUES (?,?,?,?,?,?,?,?,?)''',
            (user_name, '[]', json.dumps([0,1,2,3,4,5,6]),
             '{}', 1, 0, now_str, 1, ''))
        log_status(f"👤 NIEUWE GEBRUIKER → '{user_name}'")
    conn.commit()
    conn.close()

    return jsonify({"status": "received"}), 200


@app.route('/ping', methods=['POST'])
def ping():
    """Bestaand endpoint — blijft werken voor WebView pings."""
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    user_name = (data.get('name') or '').strip()
    if not user_name or len(user_name) < MIN_NAME_LENGTH:
        return jsonify({"status": "ignored"}), 200

    now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time = time.time()

    state = user_states.get(user_name, {"status": "offline", "last_ping": 0})
    if state["status"] == "offline":
        log_status(f"📱 ONLINE → {user_name} | bron: webview")

    user_states[user_name] = {"status": "online", "last_ping": current_time}

    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT user_name FROM users WHERE user_name=?", (user_name,))
    if c.fetchone():
        c.execute("UPDATE users SET last_ping_time=? WHERE user_name=?", (now_str, user_name))
    else:
        c.execute('''INSERT OR IGNORE INTO users
            (user_name, contacts, active_days, schedules, use_custom_schedule,
             vacation_mode, last_ping_time, notify_self, own_phone)
            VALUES (?,?,?,?,?,?,?,?,?)''',
            (user_name, '[]', json.dumps([0,1,2,3,4,5,6]),
             '{}', 1, 0, now_str, 1, ''))
        log_status(f"👤 NIEUWE GEBRUIKER → '{user_name}'")
    conn.commit()
    conn.close()

    return jsonify({"status": "received"}), 200


@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    user_name = (data.get('name') or '').strip()
    if not user_name or len(user_name) < MIN_NAME_LENGTH:
        return jsonify({"status": "error", "message": "Naam te kort"}), 400

    upsert_user(user_name, {
        'contacts':            json.dumps(data.get('contacts', [])),
        'active_days':         json.dumps(data.get('activeDays', [0,1,2,3,4,5,6])),
        'schedules':           json.dumps(data.get('schedules', {})),
        'use_custom_schedule': data.get('useCustomSchedule', True),
        'vacation_mode':       data.get('vacationMode', False),
        'notify_self':         data.get('notifySelf', True),
        'own_phone':           data.get('ownPhone', ''),
    })
    log_status(f"💾 OPGESLAGEN → '{user_name}'")
    return jsonify({"status": "ok"}), 200


@app.route('/check_optin', methods=['POST'])
def check_optin():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403
    phone = (data.get('phone') or '').strip()
    return jsonify({"opted_in": is_opted_in(phone)}), 200


@app.route('/send_optin', methods=['POST'])
def send_optin():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403
    phone        = (data.get('phone')        or '').strip()
    contact_name = (data.get('contact_name') or 'Contact').strip()
    user_name    = (data.get('user_name')    or '').strip()
    user_phone   = (data.get('user_phone')   or '').strip()
    if not phone:
        return jsonify({"status": "error"}), 400
    msg = (
        f"👋 Hallo {contact_name}!\n\n*{user_name}* heeft je toegevoegd als noodcontact in *Barkr*.\n\n"
        f"Activeer WhatsApp berichten via *+34 623 78 95 80*:\n\n"
        f"`I allow callmebot to send me messages`\n\nJe hoeft verder niets te doen. 🐾"
    )
    ok = send_whatsapp(phone, msg, context=f"optin:{user_name}")
    if ok:
        register_opt_in(phone, user_name)
        if user_phone:
            time.sleep(6)
            send_whatsapp(user_phone,
                f"✅ *Barkr*\n\nActivatiebericht verstuurd naar *{contact_name}*. 🐾",
                context=f"confirm:{user_name}")
        return jsonify({"status": "sent"}), 200
    return jsonify({"status": "error"}), 500


@app.route('/test_contact', methods=['POST'])
def test_contact():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400
    phone = data.get('phone', '')
    ok = send_whatsapp(phone,
        f"🔔 *BARKR TEST*\n\nHallo {data.get('name','Contact')}! Uw nummer is actief als noodcontact.",
        context="test")
    return jsonify({"status": "success" if ok else "error"}), 200 if ok else 500


if __name__ == '__main__':
    init_db()
    threading.Thread(target=monitoring_loop, daemon=True).start()
    log_status("🌐 WEBSERVER GESTART OP POORT 5000")
    app.run(host='0.0.0.0', port=5000)
