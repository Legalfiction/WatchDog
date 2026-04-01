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
INACTIVITY_HOURS = 8  # 8 uur zodat nachtelijke stilte geen melding triggert

# FCM V1 API voor wake-up pings naar Android telefoons
FCM_PROJECT_ID = "infinite-unity-470121-u7"
FCM_SERVICE_ACCOUNT_FILE = os.path.expanduser("~/barkr/firebase-service-account.json")
FCM_URL_V1 = f"https://fcm.googleapis.com/v1/projects/{FCM_PROJECT_ID}/messages:send"
FCM_WAKEUP_INTERVAL = 900  # 15 minuten
_fcm_token_cache = {"token": "", "expires": 0}
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


def get_db():
    """Open database met WAL mode en timeout om locking te voorkomen."""
    conn = sqlite3.connect(DB_FILE, timeout=10)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn

def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = get_db()
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
        last_inactivity_alert TEXT DEFAULT "",
        fcm_token            TEXT DEFAULT "",
        last_fcm_wakeup      TEXT DEFAULT ""
    )''')

    # Migratie: voeg nieuwe kolommen toe
    for col in ["fcm_token TEXT DEFAULT ''", "last_fcm_wakeup TEXT DEFAULT ''"]:
        try:
            c.execute(f"ALTER TABLE users ADD COLUMN {col}")
            conn.commit()
        except Exception:
            pass  # Kolom bestaat al

    # Migratie: voeg device_id kolom toe aan bestaande database
    try:
        c.execute("ALTER TABLE users ADD COLUMN device_id TEXT DEFAULT ''")
        conn.commit()
        c.execute("UPDATE users SET device_id = own_phone WHERE device_id = '' OR device_id IS NULL")
        conn.commit()
    except Exception:
        pass  # Kolom bestaat al

    # Migratie: voeg device_id kolom toe aan alarm_log
    try:
        c.execute("ALTER TABLE alarm_log ADD COLUMN device_id TEXT DEFAULT ''")
        conn.commit()
        c.execute("UPDATE alarm_log SET device_id = own_phone WHERE device_id = '' OR device_id IS NULL")
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
    # Automatische cleanup bij opstart
    try:
        conn_clean2 = get_db()
        c_clean = conn_clean2.cursor()
        # Verwijder records waar device_id = own_phone (oude telefoonnummer records)
        c_clean.execute("DELETE FROM users WHERE device_id = own_phone AND length(device_id) < 20")
        # Verwijder web sessie records
        c_clean.execute("DELETE FROM users WHERE device_id LIKE 'web_%' OR own_phone LIKE 'web_%'")
        # Verwijder records zonder device_id
        c_clean.execute("DELETE FROM users WHERE device_id IS NULL OR device_id = ''")
        # Verwijder dubbele records — bewaar alleen het meest recente per naam
        c_clean.execute("""
            DELETE FROM users WHERE rowid NOT IN (
                SELECT MAX(rowid) FROM users GROUP BY 
                CASE WHEN length(device_id) >= 20 THEN device_id ELSE own_phone END
            )
        """)
        deleted = conn.total_changes
        conn.commit()
        if deleted > 0:
            log_status(f"🧹 {deleted} vervuilde records verwijderd bij opstart")
    except Exception as e:
        log_status(f"⚠️ Cleanup fout: {e}")
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
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT phone FROM whatsapp_opted_in WHERE phone=?", (clean,))
    found = c.fetchone() is not None
    conn.close()
    return found


def register_opt_in(phone: str, opted_in_by: str):
    clean = normalize_phone(phone)
    conn = get_db()
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


def alarm_already_fired(device_id_key: str, alarm_date: str, window_start: str, window_end: str) -> bool:
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT id FROM alarm_log WHERE device_id=? AND alarm_date=? AND window_start=? AND window_end=?",
              (device_id_key, alarm_date, window_start, window_end))
    found = c.fetchone() is not None
    conn.close()
    return found


def mark_alarm_fired(device_id_key: str, alarm_date: str, window_start: str, window_end: str):
    conn = get_db()
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO alarm_log (device_id, alarm_date, window_start, window_end, fired_at) VALUES (?,?,?,?,?)",
              (device_id_key, alarm_date, window_start, window_end, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()


def upsert_user(device_id: str, fields: dict):
    """Voegt gebruiker toe of werkt bij. Sleutel is ALTIJD device_id."""
    clean = device_id.strip()
    if not clean:
        log_status("⚠️ upsert_user aangeroepen zonder device_id — genegeerd")
        return
    # Web sessies (browser) mogen nooit een nieuw record aanmaken
    # Ze mogen alleen bestaande records bijwerken
    if clean.startswith('web_'):
        conn_check = get_db()
        c_check = conn_check.cursor()
        c_check.execute("SELECT device_id FROM users WHERE device_id=?", (clean,))
        exists = c_check.fetchone()
        conn_check.close()
        if not exists:
            log_status(f"⏭️ upsert_user: web sessie [{clean[:12]}] — geen nieuw record aangemaakt")
            return
    own_phone = fields.get('own_phone', '')
    # Sla web_xxx nummers niet op als telefoonnummer
    if own_phone and own_phone.startswith('web_'):
        own_phone = ''
    # Sla device_id niet op als telefoonnummer
    if own_phone == clean:
        own_phone = fields.get('own_phone', '') if not fields.get('own_phone', '').startswith('web_') else ''
        own_phone = '' if own_phone == clean else own_phone
    conn = get_db()
    c = conn.cursor()
    # Haal bestaand record op via device_id
    c.execute("SELECT last_ping_time FROM users WHERE device_id=?", (clean,))
    existing  = c.fetchone()
    # Als niet gevonden via device_id, zoek via own_phone en update device_id
    if not existing and own_phone and is_valid_phone(own_phone):
        c.execute("SELECT last_ping_time FROM users WHERE own_phone=? ORDER BY rowid DESC LIMIT 1", (own_phone,))
        existing = c.fetchone()
        if existing:
            c.execute("UPDATE users SET device_id=? WHERE own_phone=? AND (device_id IS NULL OR device_id='')", (clean, own_phone))
            conn.commit()
    last_ping = existing[0] if existing else ""
    if existing:
        # Update bestaand record
        c.execute('''UPDATE users SET
                    own_phone=?, user_name=?, contacts=?, schedules=?,
                    vacation_mode=?, notify_self=?
                    WHERE device_id=?''',
                  (own_phone,
                   fields.get('user_name', ''),
                   fields.get('contacts', '[]'),
                   fields.get('schedules', '{}'),
                   int(fields.get('vacation_mode', False)),
                   int(fields.get('notify_self', True)),
                   clean))
    else:
        # Nieuw record aanmaken
        c.execute('''INSERT INTO users (device_id, own_phone, user_name, contacts, schedules,
                    vacation_mode, last_ping_time, notify_self)
                    VALUES (?,?,?,?,?,?,?,?)''',
                  (clean, own_phone,
                   fields.get('user_name', ''),
                   fields.get('contacts', '[]'),
                   fields.get('schedules', '{}'),
                   int(fields.get('vacation_mode', False)),
                   last_ping,
                   int(fields.get('notify_self', True))))
    conn.commit()
    conn.close()


def update_ping(device_id_or_phone: str, timestamp: str):
    clean = device_id_or_phone.strip()
    conn = get_db()
    c = conn.cursor()
    # Zoek op device_id eerst, dan op own_phone als fallback
    c.execute("UPDATE users SET last_ping_time=? WHERE device_id=?", (timestamp, clean))
    if c.rowcount == 0:
        clean_phone = normalize_phone(clean)
        c.execute("UPDATE users SET last_ping_time=? WHERE own_phone=?", (timestamp, clean_phone))
    updated = c.rowcount
    conn.commit()
    conn.close()
    return updated > 0


def escalate_user(user: dict, start_str: str, end_str: str):
    own_phone = user['own_phone']
    device_id = user.get('device_id', own_phone) or own_phone
    user_name = user.get('user_name', own_phone)
    contacts  = json.loads(user['contacts']) if user['contacts'] else []
    message   = (
        f"🚨 *BARKR ALARM* 🚨\n\n"
        f"Gebruiker: *{user_name}*\n"
        f"Tijdvenster: {start_str} – {end_str}\n\n"
        f"De ingestelde eindtijd is verstreken zonder dat er gebruik van het toestel is geregistreerd. Een mogelijke oorzaak is een lege batterij.\n\n"
        f"Neem voor de zekerheid contact op met de gebruiker."
    )
    log_status(f"📢 ALARM → {user_name} [dev:{device_id[:8]}] | {start_str}–{end_str} | {len(contacts)} contacten")
    for contact in contacts:
        phone = contact.get('phone', '')
        if phone:
            ok = send_whatsapp(phone, message, context=f"alarm:{own_phone}")
            log_status(f"{'✅' if ok else '❌'} Alarm → {phone} ({contact.get('name','?')})")
            time.sleep(6)


def send_inactivity_alert(user: dict):
    own_phone   = user.get('own_phone', '')
    device_id   = user.get('device_id', own_phone) or own_phone
    notify_self = bool(user.get('notify_self', 1))
    user_name   = user.get('user_name', '') or own_phone
    today_str   = datetime.now().strftime("%Y-%m-%d")

    # Schuifje uit — geen melding
    if not notify_self:
        return

    # Geen telefoonnummer ingevuld — stil overslaan, geen log spam
    if not own_phone or not is_valid_phone(own_phone):
        return

    # Al een keer gestuurd vandaag — maximaal 1x per dag
    if user.get('last_inactivity_alert') == today_str:
        return

    msg = (
        f"⚠️ *Barkr — App niet actief*\n\n"
        f"Hallo {user_name},\n\n"
        f"Je Barkr app heeft de afgelopen {INACTIVITY_HOURS} uur geen signaal verstuurd.\n\n"
        f"Open de Barkr app om de bewaking te hervatten.\n\n"
        f"Open de app → tik op het vraagteken → kies Opstartgids. 🐾\n\n"
        f"Wil je deze berichten niet? Open Barkr → Instellingen → schuifje UIT."
    )
    log_status(f"📱 INACTIVITEITSMELDING WORDT VERSTUURD → {user_name} [dev:{device_id[:8]}] → {own_phone}")
    if send_whatsapp(own_phone, msg, context=f"inactivity:{device_id}"):
        log_status(f"✅ INACTIVITEITSMELDING VERSTUURD → {user_name} [dev:{device_id[:8]}]")
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET last_inactivity_alert=? WHERE device_id=?", (today_str, device_id))
        conn.commit()
        conn.close()
    else:
        log_status(f"❌ INACTIVITEITSMELDING MISLUKT → {user_name} [dev:{device_id[:8]}]")


def get_fcm_access_token() -> str:
    """Haal een OAuth2 access token op via het service account."""
    import time as time_mod
    now = time_mod.time()
    if _fcm_token_cache["token"] and _fcm_token_cache["expires"] > now + 60:
        return _fcm_token_cache["token"]
    try:
        if not os.path.exists(FCM_SERVICE_ACCOUNT_FILE):
            return ""
        import json as json_mod, base64, hashlib
        with open(FCM_SERVICE_ACCOUNT_FILE) as f:
            sa = json_mod.load(f)

        # Maak JWT aan
        import urllib.request, urllib.parse
        header = base64.urlsafe_b64encode(json_mod.dumps({"alg":"RS256","typ":"JWT"}).encode()).rstrip(b"=")
        now_int = int(now)
        claim = base64.urlsafe_b64encode(json_mod.dumps({
            "iss": sa["client_email"],
            "scope": "https://www.googleapis.com/auth/firebase.messaging",
            "aud": "https://oauth2.googleapis.com/token",
            "iat": now_int,
            "exp": now_int + 3600
        }).encode()).rstrip(b"=")
        msg = header + b"." + claim

        # Signeer met private key
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        private_key = serialization.load_pem_private_key(sa["private_key"].encode(), password=None)
        signature = base64.urlsafe_b64encode(
            private_key.sign(msg, padding.PKCS1v15(), hashes.SHA256())
        ).rstrip(b"=")
        jwt_token = (msg + b"." + signature).decode()

        # Wissel JWT in voor access token
        data = urllib.parse.urlencode({
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": jwt_token
        }).encode()
        req = urllib.request.Request("https://oauth2.googleapis.com/token", data=data)
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json_mod.loads(resp.read())
            token = result.get("access_token", "")
            _fcm_token_cache["token"] = token
            _fcm_token_cache["expires"] = now + 3600
            return token
    except Exception as e:
        log_status(f"❌ FCM TOKEN FOUT → {e}")
        return ""


def send_fcm_wakeup(fcm_token: str, device_id: str, user_name: str) -> bool:
    """Stuurt een stille FCM wake-up push via V1 API."""
    if not fcm_token or not os.path.exists(FCM_SERVICE_ACCOUNT_FILE):
        return False
    try:
        access_token = get_fcm_access_token()
        if not access_token:
            return False
        payload = {
            "message": {
                "token": fcm_token,
                "data": {"type": "wakeup", "device_id": device_id},
                "android": {"priority": "high"}
            }
        }
        r = requests.post(FCM_URL_V1,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=10
        )
        if r.status_code == 200:
            log_status(f"📡 FCM WAKE-UP → {user_name} [{device_id[:8]}]")
            return True
        else:
            log_status(f"❌ FCM WAKE-UP MISLUKT → {user_name} | {r.status_code} | {r.text[:100]}")
            return False
    except Exception as e:
        log_status(f"❌ FCM FOUT → {e}")
        return False


def monitoring_loop():
    log_status("🚀 BARKR ENGINE v10.36 GESTART | Sleutel: device_id")

    while True:
        try:
            current_time = time.time()

            # Detecteer offline
            for phone, state in list(user_states.items()):
                if state["status"] == "online" and (current_time - state["last_ping"]) > PING_TIMEOUT:
                    user_states[phone]["status"] = "offline"
                    log_status(f"📵 OFFLINE → {state.get('name','?')} [dev:{phone[:8]}] | {int(current_time - state['last_ping'])}s geen ping")

            conn = get_db()
            conn.row_factory = sqlite3.Row
            c = conn.cursor()
            c.execute("SELECT * FROM users")
            users = c.fetchall()
            conn.close()

            now       = datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            for row in users:
                user      = dict(row)
                own_phone = user.get('own_phone', '')
                device_id = user.get('device_id', own_phone) or own_phone
                user_name = user.get('user_name', own_phone)

                if user.get('vacation_mode'):
                    continue

                # FCM wake-up als laatste ping > 2 minuten geleden
                # Dit wekt de telefoon op ongeacht batterij-instellingen
                last_ping_time = user.get('last_ping_time', '')
                fcm_token = user.get('fcm_token', '')
                if last_ping_time and fcm_token and os.path.exists(FCM_SERVICE_ACCOUNT_FILE):
                    try:
                        last_ping_dt3 = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                        minuten_stil = (now - last_ping_dt3).total_seconds() / 60
                        last_fcm = user.get('last_fcm_wakeup', '')
                        last_fcm_dt = datetime.strptime(last_fcm, "%Y-%m-%d %H:%M:%S") if last_fcm else None
                        fcm_interval_ok = not last_fcm_dt or (now - last_fcm_dt).total_seconds() > FCM_WAKEUP_INTERVAL
                        if minuten_stil > 2 and fcm_interval_ok:
                            if send_fcm_wakeup(fcm_token, device_id, user_name):
                                conn_fcm = get_db()
                                conn_fcm.execute("UPDATE users SET last_fcm_wakeup=? WHERE device_id=?",
                                    (now.strftime("%Y-%m-%d %H:%M:%S"), device_id))
                                conn_fcm.commit()
                                conn_fcm.close()
                    except Exception:
                        pass

                # Inactiviteitsmelding — gebaseerd op device_id, niet telefoonnummer
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

                if alarm_already_fired(device_id, today_str, start_str, end_str):
                    continue

                log_status(f"🏁 Deadline {end_str} bereikt voor {user_name} [dev:{device_id[:8]}]")

                last_ping_dt = None
                if last_ping_time:
                    try:
                        last_ping_dt = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        pass

                # Controleer of de backend het venster volledig heeft bewaakt
                # Bewijs: er moet een ping zijn ontvangen TIJDENS het venster (tussen start en eind)
                # Een ping NA het venster telt niet — dan was de app niet actief tijdens het venster
                ping_tijdens_venster = False
                if last_ping_time:
                    try:
                        last_ping_dt2 = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                        if start_dt <= last_ping_dt2 <= end_dt:
                            ping_tijdens_venster = True
                    except ValueError:
                        pass

                if not ping_tijdens_venster:
                    log_status(f"⏭️ GEEN ALARM → {user_name} [dev:{device_id[:8]}] — geen ping ontvangen tijdens venster {start_str}–{end_str}, bewaking niet volledig")
                    mark_alarm_fired(device_id, today_str, start_str, end_str)
                    continue

                # Bewijs van leven = unlocked ping binnen het venster
                was_actief = False
                last_unlocked = user.get('last_unlocked_ping', '')
                if last_unlocked:
                    try:
                        last_unlocked_dt = datetime.strptime(last_unlocked, "%Y-%m-%d %H:%M:%S")
                        if start_dt <= last_unlocked_dt <= (end_dt + timedelta(minutes=2)):
                            was_actief = True
                    except ValueError:
                        pass

                if was_actief:
                    log_status(f"✅ GEEN ALARM → {user_name} [dev:{device_id[:8]}] was actief binnen venster {start_str}–{end_str} (laatste actief: {last_unlocked})")
                else:
                    log_status(f"🚨 ALARM WORDT VERSTUURD → {user_name} [dev:{device_id[:8]}] | geen activiteit in venster {start_str}–{end_str}")
                    log_status(f"   📱 Laatste ping: {last_ping_time} | Laatste actief: {last_unlocked or 'nooit'}")
                    escalate_user(user, start_str, end_str)

                mark_alarm_fired(device_id, today_str, start_str, end_str)

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
        log_status(f"📱 ONLINE → {user_name} [dev:{device_id[:8]}] | bron: {source}")

    # Haal tijdvenster op voor logging — zoek op device_id, dan own_phone, dan naam
    conn_tmp = get_db()
    c_tmp = conn_tmp.cursor()
    # Eerst exact device_id
    c_tmp.execute("SELECT schedules, device_id FROM users WHERE device_id=?", (device_id,))
    row_tmp = c_tmp.fetchone()
    matched_by = "device_id"
    # Fallback: own_phone
    if not row_tmp and own_phone:
        c_tmp.execute("SELECT schedules, device_id FROM users WHERE own_phone=? ORDER BY rowid DESC LIMIT 1", (own_phone,))
        row_tmp = c_tmp.fetchone()
        matched_by = "own_phone"
    # Fallback: naam
    if not row_tmp and user_name:
        c_tmp.execute("SELECT schedules, device_id FROM users WHERE user_name=? ORDER BY rowid DESC LIMIT 1", (user_name,))
        row_tmp = c_tmp.fetchone()
        matched_by = "naam"
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
        # Als gevonden via andere sleutel: koppel device_id zodat volgende keer direct gevonden wordt
        if matched_by != "device_id" and row_tmp[1] != device_id:
            conn_fix = get_db()
            c_fix = conn_fix.cursor()
            c_fix.execute("UPDATE users SET device_id=? WHERE device_id=?", (device_id, row_tmp[1]))
            conn_fix.commit()
            conn_fix.close()
            log_status(f"   🔗 Device_id bijgewerkt: {row_tmp[1][:8]} → {device_id[:8]} (gevonden via {matched_by})")
    else:
        log_status(f"   ⚠️ Geen instellingen gevonden voor device:{device_id[:8]} phone:{own_phone} naam:{user_name}")

    source = data.get('source', 'webview')
    status_icon = "🔓" if device_status == "unlocked" else "🔒"
    status_txt = "IN GEBRUIK" if device_status == "unlocked" else "VERGRENDELD"
    log_status(f"💓 {status_icon} PING -> {user_name} [dev:{device_id[:8]}] | {status_txt} | venster: {window_info} | bron: {source}")
    user_states[own_phone] = {"status": "online", "last_ping": current_time, "name": user_name}

    updated = update_ping(device_id, now_str)
    if not updated:
        upsert_user(device_id, {
            'user_name': user_name, 'contacts': '[]',
            'schedules': '{}', 'vacation_mode': False, 'notify_self': True,
        })
        update_ping(device_id, now_str)
        log_status(f"👤 NIEUWE GEBRUIKER → {user_name} [dev:{device_id[:8]}]")

    # Update naam en last_unlocked_ping als toestel in gebruik is
    conn = get_db()
    c = conn.cursor()
    if device_status == 'unlocked':
        c.execute("UPDATE users SET user_name=?, last_unlocked_ping=? WHERE device_id=?", (user_name, now_str, device_id))
    else:
        c.execute("UPDATE users SET user_name=? WHERE device_id=?", (user_name, device_id))
    conn.commit()
    conn.close()

    return jsonify({"status": "received"}), 200


@app.route('/ping', methods=['POST'])
def ping():
    """Backward compatible endpoint voor WebView pings."""
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    device_id = (data.get('device_id') or '').strip()
    own_phone = normalize_phone(data.get('own_phone', ''))
    user_name = (data.get('name') or '').strip()

    if not device_id and (not own_phone or not is_valid_phone(own_phone)):
        return jsonify({"status": "ignored", "reason": "geen device_id of geldig nummer"}), 200

    now_str      = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time = time.time()

    state = user_states.get(device_id or own_phone, {"status": "offline", "last_ping": 0, "name": user_name})
    if state["status"] == "offline":
        log_status(f"📱 ONLINE → {user_name} [dev:{device_id[:8] if device_id else own_phone[:8]}] | bron: webview")

    # Haal tijdvenster op voor logging — zoek op device_id, dan own_phone, dan naam
    conn_tmp = get_db()
    c_tmp = conn_tmp.cursor()
    # Eerst exact device_id
    c_tmp.execute("SELECT schedules, device_id FROM users WHERE device_id=?", (device_id,))
    row_tmp = c_tmp.fetchone()
    matched_by = "device_id"
    # Fallback: own_phone
    if not row_tmp and own_phone:
        c_tmp.execute("SELECT schedules, device_id FROM users WHERE own_phone=? ORDER BY rowid DESC LIMIT 1", (own_phone,))
        row_tmp = c_tmp.fetchone()
        matched_by = "own_phone"
    # Fallback: naam
    if not row_tmp and user_name:
        c_tmp.execute("SELECT schedules, device_id FROM users WHERE user_name=? ORDER BY rowid DESC LIMIT 1", (user_name,))
        row_tmp = c_tmp.fetchone()
        matched_by = "naam"
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
        # Als gevonden via andere sleutel: koppel device_id zodat volgende keer direct gevonden wordt
        if matched_by != "device_id" and row_tmp[1] != device_id:
            conn_fix = get_db()
            c_fix = conn_fix.cursor()
            c_fix.execute("UPDATE users SET device_id=? WHERE device_id=?", (device_id, row_tmp[1]))
            conn_fix.commit()
            conn_fix.close()
            log_status(f"   🔗 Device_id bijgewerkt: {row_tmp[1][:8]} → {device_id[:8]} (gevonden via {matched_by})")
    else:
        log_status(f"   ⚠️ Geen instellingen gevonden voor device:{device_id[:8]} phone:{own_phone} naam:{user_name}")

    source = data.get('source', 'webview')
    log_status(f"💓 PING → {user_name} [dev:{device_id[:8]}] | venster: {window_info} | bron: {source}")
    user_states[own_phone] = {"status": "online", "last_ping": current_time, "name": user_name}

    updated = update_ping(device_id, now_str)
    if not updated:
        upsert_user(device_id, {
            'user_name': user_name, 'contacts': '[]',
            'schedules': '{}', 'vacation_mode': False, 'notify_self': True,
        })
        update_ping(own_phone, now_str)

    # WebView ping = gebruiker heeft toestel open = altijd IN GEBRUIK
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE users SET user_name=?, last_unlocked_ping=? WHERE device_id=?", (user_name, now_str, device_id))
    conn.commit()
    conn.close()

    return jsonify({"status": "received"}), 200


@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error"}), 403

    device_id = (data.get('device_id') or '').strip()
    own_phone = normalize_phone(data.get('ownPhone', ''))
    user_name = (data.get('name') or '').strip()

    log_status(f"📥 SAVE_SETTINGS ONTVANGEN → naam:{user_name} device:{device_id[:8] if device_id else 'GEEN'} phone:{own_phone or 'GEEN'}")

    # Negeer lege web-browser sessies (geen naam, geen telefoon, geen contacten)
    if device_id and device_id.startswith('web_') and not user_name and not own_phone:
        log_status(f"   ⏭️ Genegeerd — lege web sessie [{device_id[:8]}]")
        return jsonify({"status": "ignored", "reason": "lege web sessie"}), 200

    if not device_id:
        if own_phone and is_valid_phone(own_phone):
            device_id = own_phone
            log_status(f"   ⚠️ Geen device_id — fallback naar own_phone: {own_phone}")
        else:
            log_status(f"   ❌ Geen device_id en geen geldig telefoonnummer — ignored")
            return jsonify({"status": "ignored", "reason": "geen device_id"}), 200

    contacts = data.get('contacts', [])

    upsert_user(device_id, {
        'own_phone':    own_phone,
        'user_name':    user_name,
        'contacts':     json.dumps(contacts),
        'schedules':    json.dumps(data.get('schedules', {})),
        'vacation_mode': data.get('vacationMode', False),
        'notify_self':  data.get('notifySelf', True),
    })

    # Welkomstbericht sturen naar nieuwe contacten (eenmalig, geen opt-in nodig met TextMeBot)
    for contact in contacts:
        contact_phone = normalize_phone(contact.get('phone', ''))
        contact_name  = contact.get('name', 'Contact')
        if not contact_phone or not is_valid_phone(contact_phone):
            continue
        already = is_opted_in(contact_phone)
        log_status(f"🔍 CONTACT CHECK → {contact_name} ({contact_phone}) | al welkom gestuurd: {already}")
        if not already:
            msg = (
                "\U0001f44b Hallo " + contact_name + "!\n\n"
                "Je bent door *" + user_name + "* toegevoegd als noodcontact in *Barkr*.\n\n"
                "Barkr bewaakt het welzijn van " + user_name + ". Als " + user_name + " binnen een ingesteld tijdvenster niet actief is, ontvang jij automatisch een bericht.\n\n"
                "Je hoeft niets te doen. \U0001f43e"
            )
            def send_welcome(p=contact_phone, m=msg, cn=contact_name, un=user_name):
                time.sleep(2)
                ok = send_whatsapp(p, m, context=f"welcome:{p}")
                if ok:
                    register_opt_in(p, un)
                    log_status(f"✅ WELKOMSTBERICHT VERSTUURD → {cn} ({p})")
                else:
                    log_status(f"❌ WELKOMSTBERICHT MISLUKT → {cn} ({p})")
            import threading
            threading.Thread(target=send_welcome, daemon=True).start()

    # Log alle opgeslagen instellingen
    schedules = data.get('schedules', {})
    dag_namen = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"]
    venster_log = []
    for idx in range(7):
        sched = schedules.get(str(idx), {})
        st = sched.get('startTime', '00:00')
        et = sched.get('endTime', '00:00')
        if st != '00:00' or et != '00:00':
            venster_log.append(f"{dag_namen[idx]}:{st}-{et}")
    venster_str = ", ".join(venster_log) if venster_log else "geen vensters"
    notify = "aan" if data.get('notifySelf', True) else "uit"
    vacation = "aan" if data.get('vacationMode', False) else "uit"
    contact_str = ", ".join([c.get('name','?') + "(" + normalize_phone(c.get('phone','')) + ")" for c in contacts]) if contacts else "geen"

    log_status(f"💾 INSTELLINGEN OPGESLAGEN → {user_name} [dev:{device_id[:8]}]")
    log_status(f"   📅 Vensters: {venster_str}")
    log_status(f"   👤 Contacten: {contact_str}")
    log_status(f"   🔔 Eigen melding: {notify} | 🏖️ Vakantie: {vacation}")
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
        f"Barkr bewaakt het welzijn van {user_name}. Als {user_name} binnen een ingesteld tijdvenster niet actief is, ontvang jij automatisch een bericht.\n\n"
        f"Je hoeft niets te doen — je staat nu automatisch als noodcontact geregistreerd. 🐾"
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
