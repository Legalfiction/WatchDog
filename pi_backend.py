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
#   BARKR BACKEND v9.0 — PRODUCTIE
#
#   Developer alerts: ALLEEN technische fouten
#   - WhatsApp berichtendienst faalt (HTTP != 200)
#   - Alarm kon niet verstuurd worden naar contacten
#   - Database schrijffout
#   - Onverwachte crash in monitoring loop
#
#   NIET gemeld aan developer:
#   - Gebruikers die geen tijdvenster hebben ingesteld
#   - Gebruikers die de app op pauze hebben
#   - Inactiviteit van gebruikers
#   Dat is de verantwoordelijkheid van de gebruiker zelf.
#
#   Gebruikers met notify_self=True en eigen nummer
#   ontvangen WEL de wekelijkse herinnering en
#   inactiviteitsmelding — maar dat gaat puur tussen
#   de app en de gebruiker, niet via de developer.
# ============================================================

DB_FILE          = os.path.expanduser("~/barkr/barkr_users.db")
APP_SECRET       = "BARKR_SECURE_V1"
TEXTMEBOT_KEY    = "ojtHErzSmwgW"
TEXTMEBOT_URL    = "https://api.textmebot.com/send.php"
PING_TIMEOUT     = 90
EMPTY_TIME       = "00:00"
INACTIVITY_HOURS = 4
REMINDER_DAYS    = 7

# Developer — ontvangt ALLEEN technische foutmeldingen
DEVELOPER_PHONE  = "31615964009"
DEVELOPER_NAME   = "Aldo"

# Zorg dat dezelfde technische fout niet elke 5 seconden
# opnieuw gemeld wordt — bewaar meldingstijdstempel per fouttype
_dev_alert_cooldown: dict = {}
DEV_ALERT_COOLDOWN_MINUTES = 60  # Max 1x per uur per fouttype

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
#   DEVELOPER ALERT — alleen technische fouten
# ============================================================

def alert_developer(error_type: str, detail: str):
    """
    Stuurt een WhatsApp naar de developer bij een technische fout.
    Heeft een cooldown van 60 minuten per fouttype om spam te voorkomen.

    Gebruik ALLEEN voor infrastructuurproblemen:
    - WhatsApp API fout
    - Database fout
    - Alarm niet verstuurd
    - Onverwachte crash
    """
    now = datetime.now()
    last_sent = _dev_alert_cooldown.get(error_type)
    if last_sent:
        minuten_geleden = (now - last_sent).total_seconds() / 60
        if minuten_geleden < DEV_ALERT_COOLDOWN_MINUTES:
            log_status(f"🔕 Developer alert onderdrukt ({error_type}) — cooldown actief")
            return

    _dev_alert_cooldown[error_type] = now

    message = (
        f"🔧 *BARKR TECHNISCHE FOUT*\n\n"
        f"Type: *{error_type}*\n"
        f"Tijdstip: {now.strftime('%d-%m-%Y %H:%M:%S')}\n\n"
        f"Detail:\n{detail}\n\n"
        f"Actie vereist door developer."
    )

    # Stuur direct via requests — geen tussenliggende functie
    # zodat een fout hier niet opnieuw een alert triggert
    try:
        clean = DEVELOPER_PHONE.replace('+', '').replace(' ', '')
        params = {
            "recipient": clean,
            "apikey":    TEXTMEBOT_KEY,
            "text":      message,
        }
        r = requests.get(TEXTMEBOT_URL, params=params, timeout=15)
        if r.status_code == 200:
            log_status(f"🔧 DEVELOPER ALERT VERSTUURD → {error_type}")
        else:
            log_status(f"⚠️ Developer alert mislukt (HTTP {r.status_code}) → {error_type}")
    except Exception as e:
        log_status(f"⚠️ Developer alert kon niet verstuurd worden: {e}")


# ============================================================
#   DATABASE
# ============================================================

def init_db():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    try:
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_name               TEXT PRIMARY KEY,
                contacts                TEXT    DEFAULT '[]',
                active_days             TEXT    DEFAULT '[]',
                schedules               TEXT    DEFAULT '{}',
                use_custom_schedule     INTEGER DEFAULT 1,
                vacation_mode           INTEGER DEFAULT 0,
                last_ping_time          TEXT    DEFAULT "",
                active_window_start     TEXT    DEFAULT "",
                active_window_end       TEXT    DEFAULT "",
                notify_self             INTEGER DEFAULT 0,
                own_phone               TEXT    DEFAULT "",
                last_inactivity_alert   TEXT    DEFAULT "",
                last_reminder_sent      TEXT    DEFAULT ""
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
            "ALTER TABLE users ADD COLUMN notify_self INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN own_phone TEXT DEFAULT ''",
            "ALTER TABLE users ADD COLUMN last_inactivity_alert TEXT DEFAULT ''",
            "ALTER TABLE users ADD COLUMN last_reminder_sent TEXT DEFAULT ''",
        ]
        for sql in migrations:
            try:
                c.execute(sql)
            except sqlite3.OperationalError:
                pass

        conn.commit()
        conn.close()
        log_status("✅ DATABASE GEREED")

    except Exception as e:
        log_status(f"❌ DATABASE INIT FOUT: {e}")
        alert_developer("Database init fout", str(e))


def normalize_phone(phone: str) -> str:
    return phone.replace(' ', '').replace('-', '').replace('+', '').strip()


def is_opted_in(phone: str) -> bool:
    clean = normalize_phone(phone)
    conn  = sqlite3.connect(DB_FILE)
    c     = conn.cursor()
    c.execute("SELECT phone FROM whatsapp_opted_in WHERE phone = ?", (clean,))
    found = c.fetchone() is not None
    conn.close()
    return found


def register_opt_in(phone: str, opted_in_by: str):
    clean = normalize_phone(phone)
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("""INSERT OR IGNORE INTO whatsapp_opted_in (phone, opted_in_at, opted_in_by)
                     VALUES (?, ?, ?)""",
                  (clean, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), opted_in_by))
        conn.commit()
        conn.close()
    except Exception as e:
        log_status(f"❌ DB schrijffout (register_opt_in): {e}")
        alert_developer("Database schrijffout", f"register_opt_in({clean}): {e}")


def is_empty_window(start: str, end: str) -> bool:
    return start == EMPTY_TIME and end == EMPTY_TIME


def reminder_due(last_sent: str) -> bool:
    if not last_sent:
        return True
    try:
        last_dt = datetime.strptime(last_sent, "%Y-%m-%d")
        return (datetime.now() - last_dt).days >= REMINDER_DAYS
    except ValueError:
        return True


def mark_reminder_sent(user_name: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("UPDATE users SET last_reminder_sent = ? WHERE user_name = ?",
                  (datetime.now().strftime("%Y-%m-%d"), user_name))
        conn.commit()
        conn.close()
    except Exception as e:
        log_status(f"❌ DB schrijffout (mark_reminder_sent): {e}")
        alert_developer("Database schrijffout", f"mark_reminder_sent({user_name}): {e}")


def upsert_user(user_name: str, fields: dict):
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("""SELECT last_ping_time, active_window_start, active_window_end,
                            last_inactivity_alert, last_reminder_sent
                     FROM users WHERE user_name = ?""", (user_name,))
        existing   = c.fetchone()
        last_ping  = existing[0] if existing else ""
        win_start  = existing[1] if existing else ""
        win_end    = existing[2] if existing else ""
        last_inact = existing[3] if existing else ""
        last_rem   = existing[4] if existing else ""

        c.execute('''
            INSERT INTO users (
                user_name, contacts, active_days, schedules,
                use_custom_schedule, vacation_mode,
                last_ping_time, active_window_start, active_window_end,
                notify_self, own_phone,
                last_inactivity_alert, last_reminder_sent
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_name) DO UPDATE SET
                contacts            = excluded.contacts,
                active_days         = excluded.active_days,
                schedules           = excluded.schedules,
                use_custom_schedule = excluded.use_custom_schedule,
                vacation_mode       = excluded.vacation_mode,
                notify_self         = excluded.notify_self,
                own_phone           = excluded.own_phone
        ''', (
            user_name,
            fields.get('contacts', '[]'),
            fields.get('active_days', json.dumps([0,1,2,3,4,5,6])),
            fields.get('schedules', '{}'),
            int(fields.get('use_custom_schedule', True)),
            int(fields.get('vacation_mode', False)),
            last_ping, win_start, win_end,
            int(fields.get('notify_self', False)),
            fields.get('own_phone', ''),
            last_inact, last_rem,
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        log_status(f"❌ DB schrijffout (upsert_user): {e}")
        alert_developer("Database schrijffout", f"upsert_user({user_name}): {e}")


def reset_ping(user_name: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("""UPDATE users SET
                        last_ping_time      = '',
                        active_window_start = '',
                        active_window_end   = ''
                     WHERE user_name = ?""", (user_name,))
        conn.commit()
        conn.close()
    except Exception as e:
        log_status(f"❌ DB schrijffout (reset_ping): {e}")
        alert_developer("Database schrijffout", f"reset_ping({user_name}): {e}")


def update_ping(user_name: str, timestamp: str,
                win_start: str, win_end: str) -> bool:
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
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
    except Exception as e:
        log_status(f"❌ DB schrijffout (update_ping): {e}")
        alert_developer("Database schrijffout", f"update_ping({user_name}): {e}")
        return False


def mark_inactivity_alert(user_name: str):
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("UPDATE users SET last_inactivity_alert = ? WHERE user_name = ?",
                  (datetime.now().strftime("%Y-%m-%d"), user_name))
        conn.commit()
        conn.close()
    except Exception as e:
        log_status(f"❌ DB schrijffout (mark_inactivity_alert): {e}")
        alert_developer("Database schrijffout", f"mark_inactivity_alert({user_name}): {e}")


def alarm_already_fired(user_name, alarm_date, window_start, window_end):
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("""SELECT id FROM alarm_log
                     WHERE user_name=? AND alarm_date=?
                     AND window_start=? AND window_end=?""",
                  (user_name, alarm_date, window_start, window_end))
        found = c.fetchone() is not None
        conn.close()
        return found
    except Exception as e:
        log_status(f"❌ DB leesfout (alarm_already_fired): {e}")
        alert_developer("Database leesfout", f"alarm_already_fired({user_name}): {e}")
        return True  # Veilig: bij twijfel geen dubbel alarm


def mark_alarm_fired(user_name, alarm_date, window_start, window_end):
    try:
        conn = sqlite3.connect(DB_FILE)
        c    = conn.cursor()
        c.execute("""INSERT OR IGNORE INTO alarm_log
                     (user_name, alarm_date, window_start, window_end, fired_at)
                     VALUES (?, ?, ?, ?, ?)""",
                  (user_name, alarm_date, window_start, window_end,
                   datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
        conn.close()
    except Exception as e:
        log_status(f"❌ DB schrijffout (mark_alarm_fired): {e}")
        alert_developer("Database schrijffout", f"mark_alarm_fired({user_name}): {e}")


# ============================================================
#   AUTHENTICATIE
# ============================================================

def authenticate(data: dict) -> bool:
    return (
        data.get('app_key') == APP_SECRET or
        data.get('secret')  == APP_SECRET
    )


# ============================================================
#   WHATSAPP — met technische foutdetectie
# ============================================================

def send_whatsapp(phone: str, message: str,
                  context: str = "") -> bool:
    """
    Verstuurt een WhatsApp bericht.
    Bij een HTTP-fout wordt de developer geïnformeerd
    via alert_developer — dit is een technisch probleem
    met de berichtendienst, niet gebruikersgedrag.
    """
    clean_phone = normalize_phone(phone)
    if not clean_phone:
        return False
    params = {
        "recipient": clean_phone,
        "apikey":    TEXTMEBOT_KEY,
        "text":      message,
    }
    try:
        r = requests.get(TEXTMEBOT_URL, params=params, timeout=15)
        if r.status_code != 200:
            log_status(f"⚠️ WhatsApp API fout ({clean_phone}): HTTP {r.status_code}")
            alert_developer(
                "WhatsApp API fout",
                f"HTTP {r.status_code} bij versturen naar {clean_phone}.\n"
                f"Context: {context}\n"
                f"Response: {r.text[:200]}"
            )
            return False
        return True
    except requests.exceptions.Timeout:
        log_status(f"⚠️ WhatsApp timeout ({clean_phone})")
        alert_developer(
            "WhatsApp API timeout",
            f"Timeout bij versturen naar {clean_phone}. Context: {context}"
        )
        return False
    except Exception as e:
        log_status(f"⚠️ WhatsApp onbekende fout ({clean_phone}): {e}")
        alert_developer(
            "WhatsApp onbekende fout",
            f"Fout bij versturen naar {clean_phone}: {e}. Context: {context}"
        )
        return False


# ============================================================
#   GEBRUIKERSBERICHTEN (puur tussen app en gebruiker)
# ============================================================

def send_user_inactivity_alert(user: dict):
    """
    Optionele melding aan de gebruiker zelf als de app
    meer dan 4 uur geen ping heeft gestuurd.
    Alleen als notify_self=True en eigen nummer bekend.
    Developer wordt NIET betrokken.
    """
    own_phone   = user.get('own_phone', '')
    notify_self = bool(user.get('notify_self', 0))
    user_name   = user['user_name']
    today_str   = datetime.now().strftime("%Y-%m-%d")

    if not notify_self or not own_phone:
        return
    if user.get('last_inactivity_alert') == today_str:
        return

    msg = (
        f"⚠️ *Barkr — Controlemelding*\n\n"
        f"Hallo {user_name},\n\n"
        f"Je Barkr app heeft de afgelopen {INACTIVITY_HOURS} uur geen "
        f"activiteit gestuurd.\n\n"
        f"Controleer of Barkr nog actief is op je telefoon. "
        f"Open de app om de bewaking te hervatten. 🐾"
    )
    send_whatsapp(own_phone, msg, context=f"inactivity_alert:{user_name}")
    mark_inactivity_alert(user_name)
    log_status(f"📱 INACTIVITEITSMELDING → {user_name} ({own_phone})")


def send_user_reminder(user: dict, reason: str):
    """
    Optionele wekelijkse herinnering aan gebruiker zelf.
    Alleen als notify_self=True en eigen nummer bekend.
    Developer wordt NIET betrokken.
    """
    own_phone   = user.get('own_phone', '')
    notify_self = bool(user.get('notify_self', 0))
    user_name   = user['user_name']

    if not notify_self or not own_phone:
        mark_reminder_sent(user_name)
        return

    if reason == 'no_window':
        msg = (
            f"👋 Hallo {user_name}!\n\n"
            f"Je Barkr app is actief maar je hebt nog geen bewakingstijden "
            f"ingesteld voor deze week.\n\n"
            f"Zonder tijdvenster bewaakt Barkr je niet. Open de app en stel "
            f"je tijden in via *Weekplanning*. 🐾"
        )
    else:
        msg = (
            f"👋 Hallo {user_name}!\n\n"
            f"Je Barkr app staat al een tijdje op pauze. Zolang de app "
            f"gepauzeerd is, bewaakt Barkr je niet.\n\n"
            f"Wil je de bewaking hervatten? Open de app en tik op de "
            f"grote knop om Barkr weer te activeren. 🐾"
        )

    send_whatsapp(own_phone, msg, context=f"weekly_reminder:{user_name}:{reason}")
    mark_reminder_sent(user_name)
    log_status(f"📱 HERINNERING → {user_name} ({own_phone}) | {reason}")


def escalate_user(user: dict, start_str: str, end_str: str):
    """
    Verstuurt het alarm naar alle noodcontacten van de gebruiker.
    Als een alarm NIET verstuurd kan worden (API fout), wordt
    de developer geïnformeerd — dit is een technisch probleem.
    """
    user_name    = user['user_name']
    contacts     = json.loads(user['contacts']) if user['contacts'] else []
    failed_count = 0
    sent_count   = 0

    message = (
        f"🚨 *BARKR ALARM* 🚨\n\n"
        f"Gebruiker: *{user_name}*\n"
        f"Tijdvenster: {start_str} – {end_str}\n\n"
        f"De ingestelde eindtijd is verstreken zonder dat er gebruik van het "
        f"toestel is geregistreerd. Een mogelijke oorzaak is een lege batterij.\n\n"
        f"Neem voor de zekerheid contact op met de gebruiker."
    )

    log_status(f"📢 ALARM → {user_name} | {start_str}–{end_str} | {len(contacts)} contacten")

    for contact in contacts:
        phone = contact.get('phone', '')
        if phone:
            success = send_whatsapp(
                phone, message,
                context=f"alarm:{user_name}:{start_str}-{end_str}"
            )
            if success:
                sent_count += 1
                log_status(f"✅ Alarm → {phone} ({contact.get('name', '?')})")
            else:
                failed_count += 1
                log_status(f"❌ Alarm mislukt → {phone} ({contact.get('name', '?')})")
            time.sleep(6)

    # Technische fout: alarm kon niet verstuurd worden
    if failed_count > 0 and sent_count == 0:
        alert_developer(
            "Alarm volledig mislukt",
            f"Gebruiker: {user_name} | Venster: {start_str}–{end_str}\n"
            f"Alle {failed_count} alarm(en) konden niet worden verstuurd. "
            f"WhatsApp API mogelijk niet bereikbaar."
        )
    elif failed_count > 0:
        alert_developer(
            "Alarm gedeeltelijk mislukt",
            f"Gebruiker: {user_name} | Venster: {start_str}–{end_str}\n"
            f"{sent_count} verstuurd, {failed_count} mislukt. "
            f"Controleer de WhatsApp API."
        )


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


def all_windows_empty(schedules_json: str) -> bool:
    try:
        schedules = json.loads(schedules_json)
        for d in range(7):
            sched = schedules.get(str(d), {})
            if sched.get('startTime', EMPTY_TIME) != EMPTY_TIME:
                return False
            if sched.get('endTime', EMPTY_TIME) != EMPTY_TIME:
                return False
        return True
    except Exception:
        return True


def monitoring_loop():
    log_status(
        f"🚀 BARKR ENGINE v9.0 GESTART | "
        f"Ping timeout: {PING_TIMEOUT}s | "
        f"Developer alerts: alleen technische fouten"
    )

    while True:
        try:
            current_time = time.time()

            for uname, state in list(user_states.items()):
                if (state["status"] == "online" and
                        (current_time - state["last_ping"]) > PING_TIMEOUT):
                    user_states[uname]["status"] = "offline"
                    log_status(f"📵 OFFLINE → {uname} | {state['window']}")

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
                user           = dict(row)
                user_name      = user['user_name']
                last_ping_time = user.get('last_ping_time', '')

                # Gebruiker actief als laatste ping < 48 uur geleden
                user_is_active = False
                if last_ping_time:
                    try:
                        last_ping_dt   = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                        uren_geleden   = (now - last_ping_dt).total_seconds() / 3600
                        user_is_active = uren_geleden < 48
                    except ValueError:
                        pass

                # ---- WEKELIJKSE HERINNERING (puur naar gebruiker) ----
                if user_is_active and reminder_due(user.get('last_reminder_sent', '')):
                    if all_windows_empty(user.get('schedules', '{}')):
                        send_user_reminder(user, 'no_window')
                        continue
                    if user.get('vacation_mode'):
                        send_user_reminder(user, 'vacation_mode')
                        continue

                # ---- INACTIVITEITSMELDING (puur naar gebruiker) ----
                if user_is_active and last_ping_time:
                    try:
                        last_ping_dt  = datetime.strptime(last_ping_time, "%Y-%m-%d %H:%M:%S")
                        inactief_uren = (now - last_ping_dt).total_seconds() / 3600
                        if (inactief_uren >= INACTIVITY_HOURS and
                                user.get('last_inactivity_alert') != today_str):
                            send_user_inactivity_alert(user)
                    except ValueError:
                        pass

                # ---- NORMALE BEWAKINGSLOGICA ----
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

                if is_empty_window(start_str, end_str):
                    continue

                try:
                    start_dt = datetime.combine(
                        now.date(), datetime.strptime(start_str, "%H:%M").time()
                    )
                    end_dt = datetime.combine(
                        now.date(), datetime.strptime(end_str, "%H:%M").time()
                    )
                except ValueError:
                    continue

                if start_dt >= end_dt:
                    continue

                if now <= end_dt:
                    continue

                if alarm_already_fired(user_name, today_str, start_str, end_str):
                    continue

                log_status(f"🏁 Deadline {end_str} bereikt voor {user_name}.")

                last_ping_dt = None
                if last_ping_time:
                    try:
                        last_ping_dt = datetime.strptime(
                            last_ping_time, "%Y-%m-%d %H:%M:%S"
                        )
                    except ValueError:
                        pass

                was_actief = (
                    last_ping_dt is not None and
                    start_dt <= last_ping_dt < end_dt
                )

                if was_actief:
                    log_status(f"✅ {user_name} was actief. Geen alarm.")
                else:
                    escalate_user(user, start_str, end_str)

                mark_alarm_fired(user_name, today_str, start_str, end_str)

        except Exception as e:
            log_status(f"⚠️ MONITORING LOOP CRASH: {e}")
            alert_developer(
                "Monitoring loop crash",
                f"Onverwachte fout in monitoring loop: {e}\n"
                f"De loop blijft draaien maar dit vereist onderzoek."
            )

        time.sleep(5)


# ============================================================
#   API ENDPOINTS
# ============================================================

@app.route('/status', methods=['GET'])
def status():
    return jsonify({"status": "online", "version": "9.0-PRODUCTIE"}), 200


@app.route('/save_settings', methods=['POST'])
def save_settings():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
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
        'notify_self':         data.get('notifySelf', False),
        'own_phone':           data.get('ownPhone', ''),
    })

    reset_ping(user_name)
    log_status(f"💾 OPGESLAGEN → '{user_name}'")
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
    now_str       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    current_time  = time.time()

    if is_empty_window(win_start, win_end):
        # Registreer activiteit maar sla geen venster op
        try:
            conn = sqlite3.connect(DB_FILE)
            c    = conn.cursor()
            c.execute("UPDATE users SET last_ping_time = ? WHERE user_name = ?",
                      (now_str, user_name))
            conn.commit()
            conn.close()
        except Exception as e:
            alert_developer("Database schrijffout", f"ping update (no window) {user_name}: {e}")
        user_states[user_name] = {
            "status": "online", "last_ping": current_time, "window": "geen venster"
        }
        return jsonify({"status": "skipped", "reason": "no active window"}), 200

    window_str = f"{win_start}–{win_end}"
    state      = user_states.get(user_name, {"status": "offline", "last_ping": 0, "window": ""})
    if state["status"] == "offline":
        log_status(f"📱 ONLINE → {user_name} | {window_str}")

    user_states[user_name] = {
        "status": "online", "last_ping": current_time, "window": window_str
    }

    user_updated = update_ping(user_name, now_str, win_start, win_end)
    if not user_updated:
        upsert_user(user_name, {
            'contacts': '[]', 'active_days': json.dumps([0,1,2,3,4,5,6]),
            'schedules': '{}', 'use_custom_schedule': True,
            'vacation_mode': False, 'notify_self': False, 'own_phone': '',
        })
        update_ping(user_name, now_str, win_start, win_end)
        log_status(f"👤 NIEUWE GEBRUIKER → '{user_name}'")

    return jsonify({"status": "received"}), 200


@app.route('/check_optin', methods=['POST'])
def check_optin():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403
    phone = (data.get('phone') or '').strip()
    if not phone:
        return jsonify({"status": "error", "message": "Geen telefoonnummer"}), 400
    return jsonify({"opted_in": is_opted_in(phone)}), 200


@app.route('/send_optin', methods=['POST'])
def send_optin():
    data = request.get_json(silent=True)
    if not data or not authenticate(data):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    phone        = (data.get('phone')        or '').strip()
    contact_name = (data.get('contact_name') or 'Contact').strip()
    user_name    = (data.get('user_name')    or 'Barkr gebruiker').strip()
    user_phone   = (data.get('user_phone')   or '').strip()

    if not phone:
        return jsonify({"status": "error", "message": "Geen telefoonnummer"}), 400

    message_to_contact = (
        f"👋 Hallo {contact_name}!\n\n"
        f"*{user_name}* heeft je toegevoegd als noodcontact in de *Barkr* app "
        f"— een digitale waakhond die automatisch alarm slaat als er iets mis gaat.\n\n"
        f"Om berichten te kunnen ontvangen moet je WhatsApp eenmalig worden "
        f"geactiveerd. Stuur hiervoor dit bericht naar *+34 623 78 95 80*:\n\n"
        f"`I allow callmebot to send me messages`\n\n"
        f"Na activatie ben je direct bereikbaar als noodcontact. "
        f"Je hoeft verder niets te doen. 🐾"
    )

    success = send_whatsapp(
        phone, message_to_contact,
        context=f"optin:{user_name}:{contact_name}"
    )

    if success:
        register_opt_in(phone, user_name)
        log_status(f"✅ OPT-IN → {phone} ({contact_name}) namens '{user_name}'")

        if user_phone:
            time.sleep(6)
            message_to_user = (
                f"✅ *Barkr bevestiging*\n\n"
                f"Het activatiebericht is verstuurd naar *{contact_name}*.\n\n"
                f"Zodra {contact_name} zich aanmeldt, is het contact actief "
                f"en ontvangt het automatisch een alarm als jij je tijdvenster mist.\n\n"
                f"Je hoeft verder niets te doen. 🐾"
            )
            send_whatsapp(user_phone, message_to_user,
                          context=f"optin_confirm:{user_name}")

        return jsonify({"status": "sent"}), 200
    else:
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
    success = send_whatsapp(phone, message, context=f"test:{contact_name}")
    log_status(f"{'✅' if success else '❌'} TESTBERICHT → {contact_name} ({phone})")
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
