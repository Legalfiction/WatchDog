import os
import json
import sqlite3
import time
import threading
import logging
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

# ============================================================
#   BARKR BACKEND v8.6 — PRODUCTIE
#
#   Nieuw in v8.6:
#   - whatsapp_opted_in tabel: bijhoudt per telefoonnummer
#     of de opt-in ooit is verstuurd.
#   - /check_optin endpoint: app vraagt of nummer bekend is
#   - /send_optin endpoint: verstuurt opt-in bericht en
#     registreert het nummer als opted-in
#   - Slim: één opt-in geldt voor alle Barkr gebruikers
#     die datzelfde nummer als contact hebben
# ============================================================

DB_FILE       = os.path.expanduser("~/barkr/barkr_users.db")
APP_SECRET    = "BARKR_SECURE_V1"
TEXTMEBOT_KEY = "ojtHErzSmwgW"
TEXTMEBOT_URL = "https://api.textmebot.com/send.php"
PING_TIMEOUT  = 90

app = Flask(__name__)
CORS(app)
logging.getLogger('werkzeug').setLevel(logging.ERROR)

user_states: dict = {}


# ============================================================
#   LOGGING
# ============================================================

def log_status(msg: str):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}", flush=True)


# ============================================================
#   DATABASE
# ============================================================

def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_name           TEXT PRIMARY KEY,
            contacts            TEXT    DEFAULT '[]',
            active_days         TEXT    DEFAULT '[]',
            schedules           TEXT    DEFAULT '{}',
            use_custom_schedule INTEGER DEFAULT 1,
            vacation_mode       INTEGER DEFAULT 0,
            last_ping_time      TEXT    DEFAULT "",
            active_window_start TEXT    DEFAULT "",
            active_window_end   TEXT    DEFAULT ""
        )
    ''')

    c.execute('''
        CREATE TABLE IF NOT EXISTS alarm_log (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            user_name    TEXT,
            alarm_date   TEXT,
            window_start TEXT,
            window_end   TEXT,
            fired_at     TEXT,
            UNIQUE(user_name, alarm_date, window_start, window_end)
        )
    ''')

    # Nieuw in v8.6: opt-in registratie per telefoonnummer
    # Een opt-in geldt globaal — als nummer X bij gebruiker A
    # al opt-in heeft, hoeft gebruiker B het niet opnieuw te doen
    c.execute('''
        CREATE TABLE IF NOT EXISTS whatsapp_opted_in (
            phone       TEXT PRIMARY KEY,
            opted_in_at TEXT,
            opted_in_by TEXT
        )
    ''')

    migrations = [
        "ALTER TABLE users ADD COLUMN vacation_mode INTEGER DEFAULT 0",
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
    """Normaliseert telefoonnummer naar consistente opslag: alleen cijfers met +."""
    return phone.replace(' ', '').replace('-', '').strip()


def is_opted_in(phone: str) -> bool:
    """Controleert of een telefoonnummer ooit een opt-in heeft ontvangen."""
    clean = normalize_phone(phone)
    conn  = sqlite3.connect(DB_FILE)
    c     = conn.cursor()
    c.execute("SELECT phone FROM whatsapp_opted_in WHERE phone = ?", (clean,))
    found = c.fetchone() is not None
    conn.close()
    return found


def register_opt_in(phone: str, opted_in_by: str):
    """Registreert een telefoonnummer als opted-in."""
    clean = normalize_phone(phone)
    conn  = sqlite3.connect(DB_FILE)
    c     = conn.cursor()
    c.execute("""INSERT OR IGNORE INTO whatsapp_opted_in (phone, opted_in_at, opted_in_by)
                 VALUES (?, ?, ?)""",
              (clean, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), opted_in_by))
    conn.commit()
    conn.close()


def upsert_user(user_name: str, fields: dict):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    c.execute("""SELECT last_ping_time, active_window_start, active_window_end
                 FROM users WHERE user_name = ?""", (user_name,))
    existing  = c.fetchone()
    last_ping = existing[0] if existing else ""
    win_start = existing[1] if existing else ""
    win_end   = existing[2] if existing else ""

    c.execute('''
        INSERT INTO users (
            user_name, contacts, active_days, schedules,
            use_custom_schedule, vacation_mode,
            last_ping_time, active_window_start, active_window_end
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_name) DO UPDATE SET
            contacts            = excluded.contacts,
            active_days         = excluded.active_days,
            schedules           = excluded.schedules,
            use_custom_schedule = excluded.use_custom_schedule,
            vacation_mode       = excluded.vacation_mode
    ''', (
        user_name,
        fields.get('contacts', '[]'),
        fields.get('active_days', json.dumps([0,1,2,3,4,5,6])),
        fields.get('schedules', '{}'),
        int(fields.get('use_custom_schedule', True)),
        int(fields.get('vacation_mode', False)),
        last_ping,
        win_start,
        win_end,
    ))
    conn.commit()
    conn.close()


def reset_ping(user_name: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""UPDATE users SET
                    last_ping_time      = '',
                    active_window_start = '',
                    active_window_end   = ''
                 WHERE user_name = ?""", (user_name,))
    conn.commit()
    conn.close()


def update_ping(user_name: str, timestamp: str,
                win_start: str, win_end: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""UPDATE users SET
                    last_ping_time      = ?,
                    active_window_start = ?,
                    active_window_end   = ?
                 WHERE user_name = ?""",
              (timestamp, win_start, win_end, user_name))
    updated = c.rowcount
    conn.commit()
    conn.close()
    return updated > 0


def alarm_already_fired(user_name: str, alarm_date: str,
                        window_start: str, window_end: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""SELECT id FROM alarm_log
                 WHERE user_name=? AND alarm_date=?
                 AND window_start=? AND window_end=?""",
              (user_name, alarm_date, window_start, window_end))
    found = c.fetchone() is not None
    conn.close()
    return found


def mark_alarm_fired(user_name: str, alarm_date: str,
                     window_start: str, window_end: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""INSERT OR IGNORE INTO alarm_log
                 (user_name, alarm_date, window_start, window_end, fired_at)
                 VALUES (?, ?, ?, ?, ?)""",
              (user_name, alarm_date, window_start, window_end,
               datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()


# ============================================================
#   AUTHENTICATIE
# ============================================================

def authenticate(data: dict) -> bool:
    return (
        data.get('app_key') == APP_SECRET or
        data.get('secret')  == APP_SECRET
    )


# ============================================================
#   WHATSAPP
# ============================================================

def send_whatsapp(phone: str, message: str) -> bool:
    clean_phone = normalize_phone(phone).replace('+', '')
    if not clean_phone:
        return False
    params = {
        "recipient": clean_phone,
        "apikey":    TEXTMEBOT_KEY,
        "text":      message,
    }
    try:
        r = requests.get(TEXTMEBOT_URL, params=params, timeout=15)
        return r.status_code == 200
    except Exception as e:
        log_status(f"⚠️ WhatsApp fout ({clean_phone}): {e}")
        return False


def escalate_user(user: dict, start_str: str, end_str: str):
    user_name = user['user_name']
    contacts  = json.loads(user['contacts']) if user['contacts'] else []

    message = (
        f"🚨 *BARKR ALARM* 🚨\n\n"
        f"Gebruiker: *{user_name}*\n"
        f"Tijdvenster: {start_str} – {end_str}\n\n"
        f"De ingestelde eindtijd is verstreken zonder dat er gebruik van het "
        f"toestel is geregistreerd. Een mogelijke oorzaak is een lege batterij.\n\n"
        f"Neem voor de zekerheid contact op met de gebruiker."
    )

    log_status(
        f"📢 ALARM VERSTUURD → Gebruiker: {user_name} | "
        f"Venster: {start_str}–{end_str} | Contacten: {len(contacts)}"
    )

    for contact in contacts:
        phone = contact.get('phone', '')
        if phone:
            success = send_whatsapp(phone, message)
            if success:
                log_status(f"✅ Alarm verzonden → {phone} ({contact.get('name', '?')})")
            else:
                log_status(f"❌ Verzenden mislukt → {phone} ({contact.get('name', '?')})")
            time.sleep(6)


# ============================================================
#   MONITORING LOOP
# ============================================================

def get_active_window(user: dict, day_idx: int) -> tuple[str, str]:
    win_start = user.get('active_window_start', '')
    win_end   = user.get('active_window_end',   '')
    if win_start and win_end and win_start != '??:??' and win_end != '??:??':
        return win_start, win_end

    schedules = {}
    if user.get('schedules'):
        try:
            schedules = json.loads(user['schedules'])
        except Exception:
            pass
    day_sched = schedules.get(str(day_idx), {})
    return day_sched.get('startTime', ''), day_sched.get('endTime', '')


def monitoring_loop():
    log_status(
        f"🚀 BARKR ENGINE v8.6 GESTART | "
        f"Ping timeout: {PING_TIMEOUT}s | "
        f"WhatsApp Opt-In Tracking Actief"
    )

    while True:
        try:
            current_time = time.time()

            for uname, state in list(user_states.items()):
                if (state["status"] == "online" and
                        (current_time - state["last_ping"]) > PING_TIMEOUT):
                    user_states[uname]["status"] = "offline"
                    log_status(
                        f"📵 TOESTEL OFFLINE → Gebruiker: {uname} | "
                        f"Tijdvenster was: {state['window']}"
                    )

            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM users")
            users = c.fetchall()
            conn.close()

            now       = datetime.now()
            today_str = now.strftime("%Y-%m-%d")
            day_idx   = now.weekday()

            for row in users:
                user      = dict(row)
                user_name = user['user_name']

                if user.get('vacation_mode'):
                    continue

                active_days = []
                if user.get('active_days'):
                    try:
                        active_days = json.loads(user['active_days'])
                    except Exception:
                        pass

                if day_idx not in active_days:
                    continue

                start_str, end_str = get_active_window(user, day_idx)

                if not start_str or not end_str:
                    continue

                try:
                    start_dt = datetime.combine(
                        now.date(),
                        datetime.strptime(start_str, "%H:%M").time()
                    )
                    end_dt = datetime.combine(
                        now.date(),
                        datetime.strptime(end_str, "%H:%M").time()
                    )
                except ValueError:
                    continue

                if start_dt >= end_dt:
                    continue

                if now <= end_dt:
                    continue

                if alarm_already_fired(user_name, today_str, start_str, end_str):
                    continue

                log_status(
                    f"🏁 Deadline {end_str} bereikt voor {user_name}. Beoordelen..."
                )

                last_ping_dt = None
                if user.get('last_ping_time'):
                    try:
                        last_ping_dt = datetime.strptime(
                            user['last_ping_time'], "%Y-%m-%d %H:%M:%S"
                        )
                    except ValueError:
                        pass

                was_actief = (
                    last_ping_dt is not None and
                    start_dt <= last_ping_dt < end_dt
                )

                if was_actief:
                    log_status(f"✅ {user_name} was veilig actief. Geen alarm.")
                else:
                    escalate_user(user, start_str, end_str)

                mark_alarm_fired(user_name, today_str, start_str, end_str)

        except Exception as e:
            log_status(f"⚠️ LOOP FOUT: {e}")

        time.sleep(5)


# ============================================================
#   API ENDPOINTS
# ============================================================

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "online", "version": "8.6-PRODUCTIE"}), 200


@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        log_status("🚫 /save_settings: Onbevoegd verzoek geweigerd")
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    user_name = (data.get('name') or '').strip()
    if not user_name:
        return jsonify({"status": "error", "message": "Naam ontbreekt"}), 400

    upsert_user(user_name, {
        'contacts':            json.dumps(data.get('contacts', [])),
        'active_days':         json.dumps(data.get('activeDays', [0,1,2,3,4,5,6])),
        'schedules':           json.dumps(data.get('schedules', {})),
        'use_custom_schedule': data.get('useCustomSchedule', True),
        'vacation_mode':       data.get('vacationMode', False),
    })

    reset_ping(user_name)
    log_status(f"💾 INSTELLINGEN OPGESLAGEN → '{user_name}'")
    return jsonify({"status": "ok"}), 200


@app.route('/ping', methods=['POST'])
def ping():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    user_name = (data.get('name') or '').strip()
    if not user_name:
        return jsonify({"status": "error", "message": "Naam ontbreekt"}), 400

    active_window = data.get('active_window', {})
    win_start     = active_window.get('start', '??:??')
    win_end       = active_window.get('end',   '??:??')
    window_str    = f"{win_start}–{win_end}"
    now_str       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time  = time.time()

    state = user_states.get(
        user_name, {"status": "offline", "last_ping": 0, "window": ""}
    )
    if state["status"] == "offline":
        log_status(f"📱 TOESTEL ONLINE → {user_name} | Venster: {window_str}")

    user_states[user_name] = {
        "status":    "online",
        "last_ping": current_time,
        "window":    window_str,
    }

    user_updated = update_ping(user_name, now_str, win_start, win_end)

    if not user_updated:
        upsert_user(user_name, {
            'contacts':            '[]',
            'active_days':         json.dumps([0,1,2,3,4,5,6]),
            'schedules':           '{}',
            'use_custom_schedule': True,
            'vacation_mode':       False,
        })
        update_ping(user_name, now_str, win_start, win_end)
        log_status(f"👤 NIEUWE GEBRUIKER → '{user_name}'")

    return jsonify({"status": "received"}), 200


@app.route('/check_optin', methods=['POST'])
def check_optin():
    """
    Controleert of een telefoonnummer al een WhatsApp opt-in
    heeft ontvangen. De app roept dit aan zodra een nieuw
    nummer wordt ingevoerd.

    Payload: { app_key, phone }
    Response: { opted_in: true/false }
    """
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    phone = (data.get('phone') or '').strip()
    if not phone:
        return jsonify({"status": "error", "message": "Geen telefoonnummer"}), 400

    opted_in = is_opted_in(phone)
    log_status(
        f"🔍 OPT-IN CHECK → {phone} | "
        f"{'✅ Bekend' if opted_in else '❌ Nog niet aangemeld'}"
    )
    return jsonify({"opted_in": opted_in}), 200


@app.route('/send_optin', methods=['POST'])
def send_optin():
    """
    Verstuurt het TextMeBot opt-in bericht naar een nieuw nummer
    en registreert het als opted-in in de database.

    Payload: { app_key, phone, contact_name, user_name }
    """
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    phone        = (data.get('phone')        or '').strip()
    contact_name = (data.get('contact_name') or 'Contact').strip()
    user_name    = (data.get('user_name')    or 'Barkr gebruiker').strip()

    if not phone:
        return jsonify({"status": "error", "message": "Geen telefoonnummer"}), 400

    # Stuur het TextMeBot activatiebericht
    # De ontvanger moet zelf antwoorden op +34 623 78 95 80
    # maar dit bericht legt uit wat ze moeten doen
    message = (
        f"👋 Hallo {contact_name}!\n\n"
        f"*{user_name}* heeft je toegevoegd als noodcontact in de Barkr app "
        f"— een digitale waakhond die alarmeert als er iets mis gaat.\n\n"
        f"Om alarmmeldingen te kunnen ontvangen, moet je WhatsApp eenmalig "
        f"worden geactiveerd. Stuur hiervoor het volgende bericht naar "
        f"*+34 623 78 95 80*:\n\n"
        f"`I allow callmebot to send me messages`\n\n"
        f"Na activatie ontvang je automatisch een bevestiging. "
        f"Je hoeft verder niets te doen. 🐾"
    )

    success = send_whatsapp(phone, message)

    if success:
        register_opt_in(phone, user_name)
        log_status(
            f"✅ OPT-IN VERSTUURD → {phone} ({contact_name}) "
            f"namens '{user_name}'"
        )
        return jsonify({"status": "sent"}), 200
    else:
        log_status(f"❌ OPT-IN MISLUKT → {phone} ({contact_name})")
        return jsonify({"status": "error", "message": "Verzenden mislukt"}), 500


@app.route('/test_contact', methods=['POST'])
def test_contact():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"status": "error"}), 400

    contact_name = data.get('name', 'Contact')
    phone        = data.get('phone', '')

    if not phone:
        return jsonify({"status": "error", "message": "Geen telefoonnummer"}), 400

    message = (
        f"🔔 *BARKR TESTBERICHT*\n\n"
        f"Hallo {contact_name}! Dit is een testbericht van Barkr.\n"
        f"Uw nummer is succesvol gekoppeld als noodcontact.\n\n"
        f"U hoeft niets te doen."
    )

    success = send_whatsapp(phone, message)
    log_status(
        f"{'✅' if success else '❌'} TESTBERICHT → "
        f"{contact_name} ({phone}) — {'OK' if success else 'MISLUKT'}"
    )

    if success:
        return jsonify({"status": "success"}), 200
    return jsonify({"status": "error", "message": "Verzenden mislukt"}), 500


# ============================================================
#   OPSTARTEN
# ============================================================

if __name__ == '__main__':
    init_db()
    threading.Thread(target=monitoring_loop, daemon=True).start()
    log_status("🌐 WEBSERVER GESTART OP POORT 5000")
    app.run(host='0.0.0.0', port=5000)
