
# SafeGuard Watchdog v5.3.3

Een welzijnsmonitor die draait op je Raspberry Pi en communiceert via WhatsApp.

## 🚀 Setup Stappen

### 1. Raspberry Pi Backend
Zorg dat Python is geïnstalleerd op je Pi.
```bash
pip install flask flask-cors requests --break-system-packages
python pi_backend.py
```

### 2. De Publieke Tunnel (Cloudflare)
Als `cloudflared` is geïnstalleerd, start de tunnel:

**Tijdelijk (om te testen):**
`cloudflared tunnel --url http://localhost:5000`

**Permanent (op de achtergrond):**
`nohup cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &`

**BELANGRIJK:** Kopieer de `https://...trycloudflare.com` link uit de terminal (of uit `tunnel.log`) naar de **Instellingen** van de SafeGuard App op je telefoon.

### 3. WhatsApp Koppeling
Je contacten hoeven GEEN app te installeren.
Elke ontvanger moet éénmalig naar `+34 623 78 95 80` sturen op WhatsApp:
`I allow callmebot to send me messages`

### 4. Cronjob (De Automatische Check)
Zorg dat de Pi elke minuut controleert of je deadline is verstreken:
`crontab -e`
Voeg onderaan toe:
`* * * * * curl -X POST http://localhost:5000/check_all`

## 📁 GitHub Replicatie
1. Maak een nieuwe repository op GitHub.
2. Kopieer alle frontend bestanden (`App.tsx`, `index.tsx`, etc.).
3. De `pi_backend.py` en `safeguard_users.json` blijven **alleen** op je Raspberry Pi staan.
