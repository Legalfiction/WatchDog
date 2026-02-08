
# SafeGuard Watchdog - Setup Gids

## 1. Raspberry Pi Voorbereiden
Zorg dat Python en de Flask bibliotheken zijn geïnstalleerd:
```bash
pip install flask flask-cors requests --break-system-packages
```

## 2. Bereikbaarheid van Buiten (Cruciaal)
Omdat je telefoon niet altijd op hetzelfde netwerk zit als je Pi, moet je de Pi bereikbaar maken.
**Beste methode: Tailscale**
1. Installeer **Tailscale** op je Raspberry Pi (`curl -fsSL https://tailscale.com/install.sh | sh`).
2. Installeer de **Tailscale app** op je telefoon.
3. Log op beide in. Je Pi krijgt een uniek adres (bijv. `100.80.1.2`).
4. Vul dit `100.x.x.x` adres in bij de SafeGuard instellingen op je telefoon. Nu werkt de monitoring **overal ter wereld**.

## 3. WhatsApp Inschakelen (Gratis)
De app gebruikt **CallMeBot** voor WhatsApp.
1. Voeg `+34 623 78 95 80` toe aan je WhatsApp contacten.
2. Stuur het bericht: `I allow callmebot to send me messages`.
3. Je ontvangt je API Key. Vul deze in bij je contactpersonen in de SafeGuard app.

## 4. De Security Check Automatiseren
De Pi checkt elke minuut of er voor iemand een alarm af moet gaan via een Cronjob.
Open crontab: `crontab -e`
Voeg onderaan toe:
`* * * * * curl -X POST http://localhost:5000/check_all`
