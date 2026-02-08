
# SafeGuard Watchdog v5.4.0

Een welzijnsmonitor die draait op je Raspberry Pi en communiceert via WhatsApp.

## 🚀 Setup Stappen

### 1. Raspberry Pi Backend
```bash
python3 pi_backend.py
```

### 2. De Publieke Tunnel (Cloudflare)
Start de tunnel op de achtergrond:
```bash
nohup cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &
```

**HOE VIND IK MIJN URL?**
Typ dit commando:
```bash
grep -o 'https://[-a-zA-Z0-9.]*trycloudflare.com' tunnel.log
```
Kopieer de link die begint met `https://...` naar de SafeGuard App.

**Tunnel stoppen/resetten?**
```bash
pkill cloudflared
rm tunnel.log
nohup cloudflared tunnel --url http://localhost:5000 > tunnel.log 2>&1 &
```

### 3. WhatsApp Koppeling
Ontvangers moeten éénmalig sturen naar `+34 623 78 95 80`:
`I allow callmebot to send me messages`

### 4. Cronjob (De Automatische Check)
`crontab -e` -> Voeg toe:
`* * * * * curl -X POST http://localhost:5000/check_all`
