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
#   BARKR BACKEND v10.2
#
#   Telefoonnummer is de primaire sleutel — niet de naam.
#   De naam kan veranderen zonder dat de gebruiker verloren gaat.
#   BarkrService stuurt telefoonnummer + naam naar /heartbeat.
#   Pi zoekt het tijdvenster op uit de weekplanning.
# ============================================================

DB_FILE         = os.path.expanduser("~/barkr/barkr_users.db")
APP_SECRET      = "BARKR_SECURE_V1"
TEXTMEBOT_KEY   = "ojtHErzSmwgW"
TEXTMEBOT_URL   = "https://api.textmebot.com/send.php"
PING_TIMEOUT    = 120
INACTIVITY_HOURS = 4
DEVELOPER_PHONE = "31615964009"

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


def normalize_phone(phone: str) -> str:
    """Verwijdert alle niet-cijfer tekens. Geeft lege string bij ongeldig nummer."""
    import re
    clean = re.sub(r'[^0-9]', '', phone)
    return clean

def is_valid_phone(phone: str) -> bool:
    """Telefoonnummer moet 10-15 cijfers hebben na normalisatie."""
    clean = normalize_phone(phone)
    return clean.isdigit() and 10 <= len(clean) <= 15


def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()

    # Primaire sleutel is device_id (UUID per toestel) - telefoonnummer is optioneel
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        device_id            TEXT PRIMARY KEY,
        own_phone            TEXT DEFAULT "",
        user_name            TEXT DEFAULT "",
        contacts             TEXT DEFAULT "[]",
        schedules            TEXT DEFAULT "{}",
        vacation_mode        INTEGER DEFAULT 0,
        last_ping_time       TEXT DEFAULT "",
        last_unlocked_ping   TEXT DEFAULT "",
        notify_self          INTEGER DEFAULT 1,
        last_inactivity_alert TEXT DEFAULT ""
    )''')

    # Migratie: voeg device_id kolom toe aan bestaande database
    try:
        c.execute("ALTER TABLE users ADD COLUMN device_id TEXT DEFAULT ''")
        conn.commit()
        # Genereer device_id voor bestaande records
        c.execute("UPDATE users SET device_id = own_phone WHERE device_id = '' OR device_id IS NULL")
        conn.commit()
    except Exception:
        pass  # Kolom bestaat al

    c.execute('''CREATE TABLE IF NOT EXISTS alarm_log (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id    TEXT,
        own_phone    TEXT DEFAULT "",
        alarm_date   TEXT,
        window_start TEXT,
        window_end   TEXT,
        fired_at     TEXT,
        UNIQUE(device_id, alarm_date, window_start, window_end)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS whatsapp_opted_in (
        phone TEXT PRIMARY KEY, opted_in_at TEXT, opted_in_by TEXT
    )''')

    conn.commit()
    conn.close()
    log_status("✅ DATABASE GEREED (device_id als sleutel)")


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


def is_opted_in(phone: str) -> bool:
    clean = normalize_phone(phone)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT phone FROM whatsapp_opted_in WHERE phone=?", (clean,))
    found = c.fetchone() is not None
    conn.close()
    return found


def register_opt_in(phone: str, opted_in_by: str):
    clean = normalize_phone(phone)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO whatsapp_opted_in (phone, opted_in_at, opted_in_by) VALUES (?,?,?)  ",
              (clean, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), ""))
    conn.commit()
    conn.close()


def get_todays_window(user: dict) -> tuple[str, str]:
    """Haalt het tijdvenster op uit de weekplanning voor vandaag."""
    day_idx = datetime.now().weekday()
    schedules = {}
    if user.get('schedules'):
        try:
            schedules = json.loads(user['schedules'])
        except Exception:
            pass
    day_sched = schedules.get(str(day_idx), {})
    return day_sched.get('startTime', '00:00'), day_sched.get('endTime', '00:00')


def alarm_already_fired(own_phone: str, alarm_date: str, window_start: str, window_end: str) -> bool:
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id FROM alarm_log WHERE own_phone=? AND alarm_date=? AND window_start=? AND window_end=?",
              (own_phone, alarm_date, window_start, window_end))
    found = c.fetchone() is not None
    conn.close()
    return found


def mark_alarm_fired(own_phone: str, alarm_date: str, window_start: str, window_end: str):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO alarm_log (own_phone, alarm_date, window_start, window_end, fired_at) VALUES (?,?,?,?,?)",
              (own_phone, alarm_date, window_start, window_end, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()


def upsert_user(device_id: str, fields: dict):
    """Voegt gebruiker toe of werkt bij. Sleutel is device_id (UUID per toestel)."""
    clean = device_id.strip()
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT last_ping_time FROM users WHERE own_phone=?", (clean,))
    existing  = c.fetchone()
    last_ping = existing[0] if existing else ""
    c.execute('''INSERT INTO users (own_phone, user_name, contacts, schedules,
                vacation_mode, last_ping_time, notify_self)
                VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(own_phone) DO UPDATE SET
                    user_name=excluded.user_name,
                    contacts=excluded.contacts,
                    schedules=excluded.schedules,
                    vacation_mode=excluded.vacation_mode,
                    notify_self=excluded.notify_self''',
              (clean,
               fields.get('user_name', ''),
               fields.get('contacts', '[]'),
               fields.get('schedules', '{}'),
               int(fields.get('vacation_mode', False)),
               last_ping,
               int(fields.get('notify_self', True))))
    conn.commit()
    conn.close()


def update_ping(own_phone: str, timestamp: str):
    clean = normalize_phone(own_phone)
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE users SET last_ping_time=? WHERE own_phone=?", (timestamp, clean))
    updated = c.rowcount
    conn.commit()
    conn.close()
    return updated > 0


def escalate_user(user: dict, start_str: str, end_str: str):
    own_phone = user['own_phone']
    user_name = user.get('user_name', own_phone)
    contacts  = json.loads(user['contacts']) if user['contacts'] else []
    message   = (
        f"🚨 *BARKR ALARM* 🚨\n\n"
        f"Gebruiker: *{user_name}*\n"
        f"Tijdvenster: {start_str} – {end_str}\n\n"
        f"De ingestelde eindtijd is verstreken zonder dat er gebruik van het toestel is geregistreerd. Een mogelijke oorzaak is een lege batterij.\n\n"
        f"Neem voor de zekerheid contact op met de gebruiker."
    )
    log_status(f"📢 ALARM → {user_name} ({own_phone}) | {start_str}–{end_str} | {len(contacts)} contacten")
    for contact in contacts:
        phone = contact.get('phone', '')
        if phone:
            ok = send_whatsapp(phone, message, context=f"alarm:{own_phone}")
            log_status(f"{'✅' if ok else '❌'} Alarm → {phone} ({contact.get('name','?')})")
            time.sleep(6)


def send_inactivity_alert(user: dict):
    own_phone   = user['own_phone']
    notify_self = bool(user.get('notify_self', 1))
    user_name   = user.get('user_name', own_phone)
    today_str   = datetime.now().strftime("%Y-%m-%d")
    if not notify_self:
        return
    if user.get('last_inactivity_alert') == today_str:
        return
    msg = (
        f"⚠️ *Barkr — App niet actief*\n\n"
        f"Hallo {user_name},\n\n"
        f"Je Barkr app heeft de afgelopen {INACTIVITY_HOURS} uur geen signaal verstuurd.\n\n"
        f"Open de Barkr app om de bewaking te hervatten.\n\n"
        f"Open de app → tik op het vraagteken → kies 'Opstartgids'. 🐾\n\n"
        f"Wil je deze berichten niet? Open Barkr → Instellingen → schuifje UIT."
    )
    if send_whatsapp(own_phone, msg, context=f"inactivity:{own_phone}"):
        log_status(f"📱 INACTIVITEITSMELDING → {user_name} ({own_phone})")
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()
        c.execute("UPDATE users SET last_inactivity_alert=? WHERE own_phone=?", (today_str, own_phone))
        conn.commit()
        conn.close()


def monitoring_loop():
    log_status("🚀 BARKR ENGINE v10.36 GESTART | Sleutel: telefoonnummer")

    while True:
        try:
            current_time = time.time()

            # Detecteer offline
            for phone, state in list(user_states.items()):
                if state["status"] == "online" and (current_time - state["last_ping"]) > PING_TIMEOUT:
                    user_states[phone]["status"] = "offline"
                    log_status(f"📵 OFFLINE → {state.get('name','?')} ({phone}) | {int(current_time - state['last_ping'])}s geen ping")

            conn = sqlite3.connect(DB_FILE)
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM users")
            users = c.fetchall()
            conn.close()

            now       = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            for row in users:
                user      = dict(row)
                own_phone = user['own_phone']
                user_name = user.get('user_name', own_phone)

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

                # Tijdvenster uit weekplanning
                start_str, end_str = get_todays_window(user)
                if start_str == '00:00' and end_str == '00:00':
                    continue

                try:
                    start_dt = datetime.combine(now.date(), datetime.strptime(start_str, "%H:%M").time())
                    end_dt   = datetime.combine(now.date(), datetime.strptime(end_str, "%H:%M").time())
                except ValueError:
                    continue

                if start_dt >= end_dt or now <= end_dt:
                    continue

                if alarm_already_fired(own_phone, today_str, start_str, end_str):
                    continue

                log_status(f"🏁 Deadline {end_str} bereikt voor {user_name} ({own_phone})")

                last_ping_dt = None
                if last_ping_time:
                    try:
                        last_ping_dt = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        pass

                # Bewijs van leven = unlocked ping binnen het venster
                # Gebruik last_unlocked_ping uit database
                was_actief = False
                last_unlocked = user.get('last_unlocked_ping', '')
                if last_unlocked:
                    try:
                        last_unlocked_dt = datetime.strptime(last_unlocked, "%Y-%m-%d %H:%M:%S")
                        if start_dt <= last_unlocked_dt <= (end_dt + timedelta(minutes=2)):
                            was_actief = True
                            log_status(f"✅ {user_name} was IN GEBRUIK binnen venster. Geen alarm.")
                    except ValueError:
                        pass
                if not was_actief:
                    log_status(f"❌ {user_name} geen IN GEBRUIK ping binnen venster. Alarm!")

                if was_actief:
                    log_status(f"✅ {user_name} was actief. Geen alarm.")
                else:
                    log_status(f"❌ {user_name} NIET actief. Laatste ping: {last_ping_time}")
                    escalate_user(user, start_str, end_str)

                mark_alarm_fired(own_phone, today_str, start_str, end_str)

        except Exception as e:
            log_status(f"⚠️ LOOP FOUT: {e}")
            alert_developer("Loop crash", str(e))

        time.sleep(5)


# ============================================================
#   ENDPOINTS
# ============================================================

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "online", "version": "10.36"}), 200


@app.route('/heartbeat', methods=['POST'])
def heartbeat():
    """Ontvangt telefoonnummer + naam. Pi bepaalt tijdvenster zelf."""
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    device_id     = (data.get('device_id') or '').strip()
    own_phone     = normalize_phone(data.get('own_phone', ''))
    user_name     = (data.get('name') or '').strip()
    source        = data.get('source', 'unknown')
    device_status = data.get('device_status', 'unknown')

    if not device_id:
        # Fallback voor oude APK versies: gebruik own_phone als device_id
        if own_phone and is_valid_phone(own_phone):
            device_id = own_phone
        else:
            return jsonify({"status": "ignored", "reason": "geen device_id"}), 200

    now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time = time.time()

    state = user_states.get(own_phone, {"status": "offline", "last_ping": 0, "name": user_name})
    if state["status"] == "offline":
        log_status(f"📱 ONLINE → {user_name} ({own_phone}) | bron: {source}")

    # Haal tijdvenster op voor logging
    conn_tmp = sqlite3.connect(DB_FILE)
    c_tmp = conn_tmp.cursor()
    c_tmp.execute("SELECT schedules FROM users WHERE own_phone=?", (own_phone,))
    row_tmp = c_tmp.fetchone()
    conn_tmp.close()
    window_info = "geen venster"
    if row_tmp and row_tmp[0]:
        try:
            scheds = json.loads(row_tmp[0])
            day_idx = datetime.now().weekday()
            sched = scheds.get(str(day_idx), {})
            ws = sched.get('startTime', '00:00')
            we = sched.get('endTime', '00:00')
            if ws != '00:00' or we != '00:00':
                window_info = f"{ws}–{we}"
        except Exception:
            pass

    source = data.get('source', 'webview')
    status_icon = "🔓" if device_status == "unlocked" else "🔒"
    status_txt = "IN GEBRUIK" if device_status == "unlocked" else "VERGRENDELD"
    log_status(f"💓 {status_icon} PING -> {user_name} ({own_phone}) | {status_txt} | venster: {window_info} | bron: {source}")
    user_states[own_phone] = {"status": "online", "last_ping": current_time, "name": user_name}

    updated = update_ping(own_phone, now_str)
    if not updated:
        upsert_user(own_phone, {
            'user_name': user_name, 'contacts': '[]',
            'schedules': '{}', 'vacation_mode': False, 'notify_self': True,
        })
        update_ping(own_phone, now_str)
        log_status(f"👤 NIEUWE GEBRUIKER → {user_name} ({own_phone})")

    # Update naam en last_unlocked_ping als toestel in gebruik is
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    if device_status == 'unlocked':
        c.execute("UPDATE users SET user_name=?, last_unlocked_ping=? WHERE own_phone=?", (user_name, now_str, own_phone))
    else:
        c.execute("UPDATE users SET user_name=? WHERE own_phone=?", (user_name, own_phone))
    conn.commit()
    conn.close()

    return jsonify({"status": "received"}), 200


@app.route('/ping', methods=['POST'])
def ping():
    """Backward compatible endpoint voor WebView pings."""
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    own_phone = normalize_phone(data.get('own_phone', ''))
    user_name = (data.get('name') or '').strip()

    if not own_phone or not is_valid_phone(own_phone):
        return jsonify({"status": "ignored", "reason": "nummer te kort"}), 200

    now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time = time.time()

    state = user_states.get(own_phone, {"status": "offline", "last_ping": 0, "name": user_name})
    if state["status"] == "offline":
        log_status(f"📱 ONLINE → {user_name} ({own_phone}) | bron: webview")

    # Haal tijdvenster op voor logging
    conn_tmp = sqlite3.connect(DB_FILE)
    c_tmp = conn_tmp.cursor()
    c_tmp.execute("SELECT schedules FROM users WHERE own_phone=?", (own_phone,))
    row_tmp = c_tmp.fetchone()
    conn_tmp.close()
    window_info = "geen venster"
    if row_tmp and row_tmp[0]:
        try:
            scheds = json.loads(row_tmp[0])
            day_idx = datetime.now().weekday()
            sched = scheds.get(str(day_idx), {})
            ws = sched.get('startTime', '00:00')
            we = sched.get('endTime', '00:00')
            if ws != '00:00' or we != '00:00':
                window_info = f"{ws}–{we}"
        except Exception:
            pass

    source = data.get('source', 'webview')
    log_status(f"💓 PING → {user_name} ({own_phone}) | venster: {window_info} | bron: {source}")
    user_states[own_phone] = {"status": "online", "last_ping": current_time, "name": user_name}

    updated = update_ping(own_phone, now_str)
    if not updated:
        upsert_user(own_phone, {
            'user_name': user_name, 'contacts': '[]',
            'schedules': '{}', 'vacation_mode': False, 'notify_self': True,
        })
        update_ping(own_phone, now_str)

    # WebView ping = gebruiker heeft toestel open = altijd IN GEBRUIK
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("UPDATE users SET user_name=?, last_unlocked_ping=? WHERE own_phone=?", (user_name, now_str, own_phone))
    conn.commit()
    conn.close()

    return jsonify({"status": "received"}), 200


@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    own_phone = normalize_phone(data.get('ownPhone', ''))
    user_name = (data.get('name') or '').strip()

    if not own_phone or not is_valid_phone(own_phone):
        return jsonify({"status": "ignored", "reason": "nummer te kort"}), 200

    contacts = data.get('contacts', [])

    upsert_user(own_phone, {
        'user_name':    user_name,
        'contacts':     json.dumps(contacts),
        'schedules':    json.dumps(data.get('schedules', {})),
        'vacation_mode': data.get('vacationMode', False),
        'notify_self':  data.get('notifySelf', True),
    })

    # Automatisch activatiebericht sturen naar nieuwe contacten
    # die nog niet in de opted_in tabel staan
    for contact in contacts:
        contact_phone = normalize_phone(contact.get('phone', ''))
        contact_name  = contact.get('name', 'Contact')
        already = is_opted_in(contact_phone)
        log_status(f"🔍 OPT-IN CHECK → {contact_phone} | al bekend: {already}")
        if contact_phone and is_valid_phone(contact_phone) and not already:
            wa_link = f"https://wa.me/34623789580?text=I%20allow%20callmebot%20to%20send%20me%20messages"
            msg = (
                "\U0001f44b Hallo " + contact_name + "!\n\n"
                "Je bent door *" + user_name + "* toegevoegd als noodcontact in *Barkr*.\n\n"
                "Barkr bewaakt het welzijn van " + user_name + ". Als " + user_name + " binnen een ingesteld tijdvenster niet actief is, ontvang jij automatisch een bericht.\n\n"
                "Tik op de link hieronder om je te activeren. WhatsApp opent met het juiste bericht klaar — tik alleen op verzenden:\n\n"
                + wa_link + "\n\n"
                "Na activatie ben je direct bereikbaar als noodcontact. \U0001f43e"
            )
            def send_async(p=contact_phone, m=msg, cn=contact_name, un=user_name, op=own_phone):
                time.sleep(2)
                ok = send_whatsapp(p, m, context=f"auto_optin:{op}")
                if ok:
                    register_opt_in(p, un)
                    log_status(f"✅ AUTO OPT-IN VERSTUURD → {cn} ({p})")
                    # Bevestiging naar gebruiker
                    time.sleep(6)
                    send_whatsapp(op,
                        "\u2705 *Barkr*\n\nActivatielink verstuurd naar *" + cn + "*.\n\nZodra " + cn + " op de link tikt is het contact actief. \U0001f43e",
                        context="auto_optin_confirm:" + op)
            import threading
            threading.Thread(target=send_async, daemon=True).start()

    log_status(f"💾 OPGESLAGEN → {user_name} | device: {device_id[:8]}...")
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
    user_phone   = normalize_phone(data.get('user_phone') or '')
    if not phone:
        return jsonify({"status": "error"}), 400
    msg = (
        f"👋 Hallo {contact_name}!\n\nJe bent door *{user_name}* toegevoegd als noodcontact in *Barkr*.\n\n"
        f"Activeer WhatsApp via *+34 623 78 95 80*:\n\n"
        f"`I allow callmebot to send me messages`\n\nJe hoeft verder niets te doen. 🐾"
    )
    ok = send_whatsapp(phone, msg, context=f"optin:{user_phone}")
    if ok:
        register_opt_in(phone, user_name)
        if user_phone:
            time.sleep(6)
            send_whatsapp(user_phone,
                f"✅ *Barkr*\n\nActivatiebericht verstuurd naar *{contact_name}*. 🐾",
                context=f"confirm:{user_phone}")
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
