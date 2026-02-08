
# SafeGuard Watchdog - Setup Gids

## 1. Raspberry Pi Voorbereiden
Zorg dat Python en de Flask bibliotheken zijn geïnstalleerd. Gebruik op nieuwe Pi's de `--break-system-packages` vlag:
```bash
pip install flask flask-cors requests --break-system-packages
```

## 2. WhatsApp Inschakelen (Gratis)
De app gebruikt **CallMeBot** voor WhatsApp.
1. Voeg `+34 623 78 95 80` toe aan je contacten op WhatsApp.
2. Stuur het bericht: `I allow callmebot to send me messages`.
3. Je ontvangt direct je persoonlijke API Key. Vul deze in de app in bij je instellingen.

## 3. De Daily Check Automatiseren
De Pi checkt niet uit zichzelf; hij moet een seintje krijgen van een "wekker" (Cronjob).

Open je crontab:
```bash
crontab -e
```
Voeg onderaan deze regel toe (dit checkt elke minuut of er voor iemand een alarm af moet gaan):
`* * * * * curl -X POST http://localhost:5000/check_all`

## 4. Verbinding & Delen
- Gebruik **Tailscale** voor de verbinding tussen je telefoon en je Pi.
- Gebruik de **"Vriend Toevoegen"** knop in de app om je netwerk uit te breiden. Jouw Pi-adres wordt automatisch meegestuurd naar je vrienden!
